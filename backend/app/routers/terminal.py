from fastapi import APIRouter, Depends, HTTPException
from .auth import get_current_user_dependency
from ..services.terminal.terminal_manager import terminal_manager
from typing import List

router = APIRouter()

@router.get("/projects/{project_id}/terminals")
async def list_project_terminals(
    project_id: str,
    current_user=Depends(get_current_user_dependency)
):
    """List all terminal sessions for a project"""
    sessions = terminal_manager.get_project_sessions(project_id)
    # Filter to user's sessions only
    user_sessions = [s for s in sessions if s.user_id == current_user.id]
    
    return {
        "sessions": [session.to_dict() for session in user_sessions]
    }

@router.delete("/terminals/{session_id}")
async def close_terminal_session(
    session_id: str,
    current_user=Depends(get_current_user_dependency)
):
    """Close a terminal session"""
    session = terminal_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Terminal session not found")
        
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    success = await terminal_manager.close_session(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to close terminal session")
        
    return {"message": "Terminal session closed successfully"}