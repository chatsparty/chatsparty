from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlmodel.ext.asyncio.session import AsyncSession

from ..models.voice import (
    VoiceConnectionCreateRequest,
    VoiceConnectionUpdateRequest, 
    VoiceConnectionResponse,
    VoiceConnectionTestResult,
    VoiceOption
)
from ..models.database import User
from ..services.voice_connection_service import voice_connection_service
from ..core.error_handler import DatabaseErrorHandler
from .auth import get_current_user_dependency
from ..core.database import get_db_session

router = APIRouter(prefix="/voice-connections", tags=["voice-connections"])


@router.post("", response_model=VoiceConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_voice_connection(
    request: VoiceConnectionCreateRequest,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new voice connection"""
    try:
        connection = await voice_connection_service.create_voice_connection(db, request, current_user.id)
        return connection
    except Exception as e:
        raise DatabaseErrorHandler.handle_db_error(
            e,
            operation="creating voice connection", 
            user_message="Failed to create voice connection",
            status_code=status.HTTP_400_BAD_REQUEST
        )


@router.get("", response_model=List[VoiceConnectionResponse])
async def get_voice_connections(
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Get all voice connections"""
    try:
        connections = await voice_connection_service.get_voice_connections(db, current_user.id)
        return connections
    except Exception as e:
        raise DatabaseErrorHandler.handle_query_error(e, "voice connections")


@router.get("/active", response_model=List[VoiceConnectionResponse])
async def get_active_voice_connections(
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Get only active voice connections"""
    try:
        connections = await voice_connection_service.get_active_voice_connections(db, current_user.id)
        return connections
    except Exception as e:
        raise DatabaseErrorHandler.handle_query_error(e, "active voice connections")


@router.get("/{connection_id}", response_model=VoiceConnectionResponse)
async def get_voice_connection(
    connection_id: str, 
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Get a specific voice connection"""
    connection = await voice_connection_service.get_voice_connection(db, connection_id, current_user.id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice connection not found"
        )
    return connection


@router.put("/{connection_id}", response_model=VoiceConnectionResponse)
async def update_voice_connection(
    connection_id: str, 
    request: VoiceConnectionUpdateRequest, 
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Update a voice connection"""
    try:
        connection = await voice_connection_service.update_voice_connection(db, connection_id, request, current_user.id)
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice connection not found"
            )
        return connection
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_voice_connection(
    connection_id: str, 
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Delete a voice connection"""
    try:
        success = await voice_connection_service.delete_voice_connection(db, connection_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voice connection not found"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{connection_id}/test", response_model=VoiceConnectionTestResult)
async def test_voice_connection(
    connection_id: str, 
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Test a voice connection by making actual API calls"""
    try:
        result = await voice_connection_service.test_voice_connection(db, connection_id, current_user.id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test voice connection: {str(e)}"
        )


@router.post("/test", response_model=VoiceConnectionTestResult)
async def test_voice_connection_data(
    request: VoiceConnectionCreateRequest,
    current_user: User = Depends(get_current_user_dependency)
):
    """Test a voice connection configuration without saving it"""
    try:
        result = await voice_connection_service.test_voice_connection_data(request, current_user.id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test voice connection: {str(e)}"
        )


@router.get("/{connection_id}/voices", response_model=List[VoiceOption])
async def get_available_voices(
    connection_id: str, 
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Get available voices for a voice connection"""
    try:
        voices = await voice_connection_service.get_available_voices(db, connection_id, current_user.id)
        return voices
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch available voices: {str(e)}"
        )