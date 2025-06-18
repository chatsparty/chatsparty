from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.exc import SQLAlchemyError
from app.models.chat import (
    ConnectionCreateRequest,
    ConnectionUpdateRequest, 
    ConnectionResponse,
    ConnectionTestResult
)
from app.models.database import User
from app.services.connection_service import connection_service
from app.core.error_handler import DatabaseErrorHandler
from .auth import get_current_user_dependency

router = APIRouter()


@router.post("/connections", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    request: ConnectionCreateRequest,
    current_user: User = Depends(get_current_user_dependency)
):
    """Create a new model connection"""
    try:
        connection = connection_service.create_connection(request, current_user.id)
        return connection
    except SQLAlchemyError as e:
        raise DatabaseErrorHandler.handle_db_error(
            e, 
            operation="creating connection",
            user_message="Failed to create connection",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        raise DatabaseErrorHandler.handle_db_error(
            e,
            operation="creating connection", 
            user_message="Failed to create connection",
            status_code=status.HTTP_400_BAD_REQUEST
        )


@router.get("/connections", response_model=List[ConnectionResponse])
async def get_connections(current_user: User = Depends(get_current_user_dependency)):
    """Get all model connections"""
    try:
        connections = connection_service.get_connections(current_user.id)
        return connections
    except SQLAlchemyError as e:
        raise DatabaseErrorHandler.handle_query_error(e, "connections")
    except Exception as e:
        raise DatabaseErrorHandler.handle_query_error(e, "connections")


@router.get("/connections/active", response_model=List[ConnectionResponse])
async def get_active_connections(current_user: User = Depends(get_current_user_dependency)):
    """Get only active model connections"""
    try:
        connections = connection_service.get_active_connections(current_user.id)
        return connections
    except SQLAlchemyError as e:
        raise DatabaseErrorHandler.handle_query_error(e, "active connections")
    except Exception as e:
        raise DatabaseErrorHandler.handle_query_error(e, "active connections")


@router.get("/connections/{connection_id}", response_model=ConnectionResponse)
async def get_connection(connection_id: str, current_user: User = Depends(get_current_user_dependency)):
    """Get a specific model connection"""
    connection = connection_service.get_connection(connection_id, current_user.id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    return connection


@router.put("/connections/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: str, request: ConnectionUpdateRequest, current_user: User = Depends(get_current_user_dependency)):
    """Update a model connection"""
    connection = connection_service.update_connection(connection_id, request, current_user.id)
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    return connection


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(connection_id: str, current_user: User = Depends(get_current_user_dependency)):
    """Delete a model connection"""
    success = connection_service.delete_connection(connection_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )


@router.post("/connections/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(connection_id: str, current_user: User = Depends(get_current_user_dependency)):
    """Test a model connection"""
    result = connection_service.test_connection(connection_id, current_user.id)
    return result