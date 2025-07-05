"""
Project conversations router
"""

import logging
import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from ...core.database import get_db_session
from ...models.database import User, Project, Conversation, Message
from ..auth import get_current_user_dependency

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects-conversations"])


@router.get("/{project_id}/conversations")
async def get_project_conversations(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Get all conversations linked to a project"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get conversations with message count
    result = await db.execute(
        select(
            Conversation,
            func.count(Message.id).label("message_count")
        )
        .outerjoin(Message, Message.conversation_id == Conversation.id)
        .where(Conversation.project_id == project_id)
        .where(Conversation.user_id == current_user.id)
        .group_by(Conversation.id)
        .order_by(Conversation.updated_at.desc())
    )
    
    conversations_with_count = result.all()
    
    return {
        "conversations": [
            {
                "id": conv.id,
                "title": f"Conversation {conv.id[:8]}",  # Generate title from ID since no title field exists
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": count
            }
            for conv, count in conversations_with_count
        ]
    }


@router.post("/{project_id}/conversations")
async def create_project_conversation(
    project_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new conversation linked to a project"""
    # Verify project ownership
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create conversation
    conversation_id = str(uuid.uuid4())
    conversation = Conversation(
        id=conversation_id,
        user_id=current_user.id,
        project_id=project_id,
        participants=[],  # Empty list for now
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    return {
        "id": conversation.id,
        "title": f"Conversation {conversation.id[:8]}",
        "project_id": conversation.project_id,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat()
    }