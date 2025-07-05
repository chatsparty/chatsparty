from typing import List, Dict, Optional
from datetime import datetime
from sqlmodel import Session, select

from ..ai_core.entities import Message
from ..ai_core.interfaces import ConversationRepositoryInterface
from ...models.database import Conversation as ConversationModel, Message as MessageModel


class BaseRepository:
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def safe_execute(self, operation):
        try:
            result = operation()
            self.db_session.commit()
            return result
        except Exception as e:
            self.db_session.rollback()
            raise e


class DatabaseConversationRepository(BaseRepository, ConversationRepositoryInterface):
    def __init__(self, db_session: Session):
        super().__init__(db_session)
    
    def create_conversation(self, conversation_id: str, user_id: str, is_shared: bool = False) -> List[Message]:
        # Check if conversation already exists
        existing = self.db_session.exec(
            select(ConversationModel).where(ConversationModel.id == conversation_id)
        ).first()
        
        if not existing:
            db_conversation = ConversationModel(
                id=conversation_id,
                user_id=user_id,
                participants=[],
                is_shared=is_shared,
            )
            self.db_session.add(db_conversation)
            # Commit immediately to ensure conversation is created
            self.db_session.commit()
        return []
    
    def get_conversation(self, conversation_id: str, user_id: str = None) -> List[Message]:
        try:
            # First get the conversation to check permissions
            stmt = select(ConversationModel).where(ConversationModel.id == conversation_id)
            
            if user_id:
                stmt = stmt.where(
                    (ConversationModel.user_id == user_id) | 
                    (ConversationModel.is_shared == True)
                )
            
            db_conversation = self.db_session.exec(stmt).first()
            
            if not db_conversation:
                return []
            
            # Then get all messages for this conversation
            messages_stmt = select(MessageModel).where(
                MessageModel.conversation_id == conversation_id
            ).order_by(MessageModel.created_at)
            
            messages = self.db_session.exec(messages_stmt).all()
            
        except Exception as e:
            # If session is in a bad state, try to recover
            self.db_session.rollback()
            raise e
        
        return [
            Message(
                role=msg.role,
                content=msg.content,
                timestamp=msg.created_at,
                agent_id=msg.agent_id,
                speaker=msg.speaker
            )
            for msg in messages
        ]
    
    def add_message(self, conversation_id: str, message: Message) -> None:
        try:
            db_message = MessageModel(
                conversation_id=conversation_id,
                role=message.role,
                content=message.content,
                created_at=message.timestamp,
                agent_id=message.agent_id,
                speaker=message.speaker,
            )
            self.db_session.add(db_message)
            # Commit immediately to ensure message persistence
            self.db_session.commit()
        except Exception as e:
            self.db_session.rollback()
            raise e
    
    def clear_conversation(self, conversation_id: str) -> None:
        # Get all messages to delete
        messages = self.db_session.exec(
            select(MessageModel).where(MessageModel.conversation_id == conversation_id)
        ).all()
        
        # Delete each message
        for msg in messages:
            self.db_session.delete(msg)
        
        # Commit the deletion
        self.db_session.commit()
    
    def get_all_conversations(self, user_id: str = None) -> List[dict]:
        """Get all conversations from database with their messages"""
        # Get all conversations
        conv_stmt = select(ConversationModel)
        if user_id:
            conv_stmt = conv_stmt.where(ConversationModel.user_id == user_id)
        
        db_conversations = self.db_session.exec(conv_stmt).all()
        
        # Get all messages for these conversations in one query
        conversation_ids = [conv.id for conv in db_conversations]
        if not conversation_ids:
            return []
        
        messages_stmt = select(MessageModel).where(
            MessageModel.conversation_id.in_(conversation_ids)
        ).order_by(MessageModel.conversation_id, MessageModel.created_at)
        
        all_messages = self.db_session.exec(messages_stmt).all()
        
        # Group messages by conversation_id
        messages_by_conv = {}
        for msg in all_messages:
            if msg.conversation_id not in messages_by_conv:
                messages_by_conv[msg.conversation_id] = []
            messages_by_conv[msg.conversation_id].append(msg)
        
        # Get all unique agent IDs for batch loading
        agent_ids_to_load = set()
        for msgs in messages_by_conv.values():
            for msg in msgs:
                if msg.agent_id and not msg.speaker:
                    agent_ids_to_load.add(msg.agent_id)
        
        # Load all agents in one query
        agents_map = {}
        if agent_ids_to_load:
            from ...models.database import Agent as AgentModel
            agents_stmt = select(AgentModel).where(AgentModel.id.in_(list(agent_ids_to_load)))
            agents = self.db_session.exec(agents_stmt).all()
            agents_map = {agent.id: agent.name for agent in agents}
        
        conversations = []
        for conv in db_conversations:
            agent_ids = set()
            messages = []
            
            conv_messages = messages_by_conv.get(conv.id, [])
            for msg in conv_messages:
                if msg.role == "assistant" and msg.agent_id:
                    agent_ids.add(msg.agent_id)
                
                speaker_name = msg.speaker
                if not speaker_name:
                    if msg.role == "user":
                        speaker_name = "user"
                    elif msg.agent_id:
                        speaker_name = agents_map.get(msg.agent_id, msg.agent_id)
                    else:
                        speaker_name = "assistant"
                
                messages.append({
                    "speaker": speaker_name,
                    "agent_id": msg.agent_id,
                    "message": self._clean_message_for_display(msg.content, msg.role),
                    "timestamp": msg.created_at.timestamp() if msg.created_at else 0
                })
            
            messages.sort(key=lambda x: x["timestamp"])
            
            conversations.append({
                "id": conv.id,
                "participants": list(agent_ids) if agent_ids else conv.participants,
                "messages": messages,
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "is_shared": conv.is_shared,
                "isActive": False
            })
        
        return conversations
    
    def get_conversation_by_id(self, conversation_id: str, user_id: str = None) -> dict:
        """Get a specific conversation by ID, including shared conversations"""
        # Get the conversation
        conv_stmt = select(ConversationModel).where(ConversationModel.id == conversation_id)
        
        if user_id:
            conv_stmt = conv_stmt.where(
                (ConversationModel.user_id == user_id) | 
                (ConversationModel.is_shared == True)
            )
        
        conv = self.db_session.exec(conv_stmt).first()
        
        if not conv:
            return None
        
        # Get all messages for this conversation
        messages_stmt = select(MessageModel).where(
            MessageModel.conversation_id == conversation_id
        ).order_by(MessageModel.created_at)
        
        conv_messages = self.db_session.exec(messages_stmt).all()
        
        # Get unique agent IDs that need names
        agent_ids_to_load = set()
        for msg in conv_messages:
            if msg.agent_id and not msg.speaker:
                agent_ids_to_load.add(msg.agent_id)
        
        # Load all agents in one query
        agents_map = {}
        if agent_ids_to_load:
            from ...models.database import Agent as AgentModel
            agents_stmt = select(AgentModel).where(AgentModel.id.in_(list(agent_ids_to_load)))
            agents = self.db_session.exec(agents_stmt).all()
            agents_map = {agent.id: agent.name for agent in agents}
        
        agent_ids = set()
        messages = []
        
        for msg in conv_messages:
            if msg.role == "assistant" and msg.agent_id:
                agent_ids.add(msg.agent_id)
            
            speaker_name = msg.speaker
            if not speaker_name:
                if msg.role == "user":
                    speaker_name = "user"
                elif msg.agent_id:
                    speaker_name = agents_map.get(msg.agent_id, msg.agent_id)
                else:
                    speaker_name = "assistant"
            
            messages.append({
                "speaker": speaker_name,
                "agent_id": msg.agent_id,
                "message": self._clean_message_for_display(msg.content, msg.role),
                "timestamp": msg.created_at.timestamp() if msg.created_at else 0
            })
        
        messages.sort(key=lambda x: x["timestamp"])
        
        return {
            "id": conv.id,
            "participants": list(agent_ids) if agent_ids else conv.participants,
            "messages": messages,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
            "is_shared": conv.is_shared,
            "user_id": conv.user_id,
            "isActive": False
        }
    
    def update_conversation_sharing(self, conversation_id: str, is_shared: bool, user_id: str) -> bool:
        """Update the sharing status of a conversation"""
        conversation = self.db_session.exec(
            select(ConversationModel)
            .where(ConversationModel.id == conversation_id)
            .where(ConversationModel.user_id == user_id)
        ).first()
        
        if not conversation:
            return False
        
        conversation.is_shared = is_shared
        self.db_session.commit()
        return True
    
    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a conversation and all its messages"""
        conversation = self.db_session.exec(
            select(ConversationModel)
            .where(ConversationModel.id == conversation_id)
            .where(ConversationModel.user_id == user_id)
        ).first()
        
        if not conversation:
            return False
        
        # Get all messages to delete
        messages = self.db_session.exec(
            select(MessageModel).where(MessageModel.conversation_id == conversation_id)
        ).all()
        
        # Delete each message
        for msg in messages:
            self.db_session.delete(msg)
        
        self.db_session.delete(conversation)
        self.db_session.commit()
        return True
    
    def _clean_message_for_display(self, content: str, role: str) -> str:
        """Remove file context from user messages for display purposes"""
        if role == "user" and "=== ATTACHED FILES CONTEXT ===" in content:
            parts = content.split("=== END FILE CONTEXT ===\n\n")
            if len(parts) > 1:
                return parts[1]
        return content