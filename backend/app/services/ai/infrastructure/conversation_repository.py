from typing import List
from sqlalchemy.orm import Session, selectinload

from ....models.database import Conversation as ConversationModel, Message as MessageModel
from ..domain.entities import Message
from ..domain.interfaces import ConversationRepositoryInterface
from .base_repository import BaseRepository


class DatabaseConversationRepository(BaseRepository, ConversationRepositoryInterface):
    def __init__(self, db_session: Session):
        super().__init__(db_session)
    
    def create_conversation(self, conversation_id: str, user_id: str, is_shared: bool = False) -> List[Message]:
        db_conversation = ConversationModel(
            id=conversation_id,
            user_id=user_id,
            participants=[],
            is_shared=is_shared,
        )
        self.db_session.add(db_conversation)
        return []
    
    def get_conversation(self, conversation_id: str, user_id: str = None) -> List[Message]:
        query = (
            self.db_session.query(ConversationModel)
            .options(selectinload(ConversationModel.messages))
            .filter(ConversationModel.id == conversation_id)
        )
        
        if user_id:
            query = query.filter(
                (ConversationModel.user_id == user_id) | 
                (ConversationModel.is_shared == True)
            )
        
        db_conversation = query.first()
        
        if not db_conversation:
            return []
        
        return [
            Message(
                role=msg.role,
                content=msg.content,
                timestamp=msg.created_at,
            )
            for msg in db_conversation.messages
        ]
    
    def add_message(self, conversation_id: str, message: Message) -> None:
        db_message = MessageModel(
            conversation_id=conversation_id,
            role=message.role,
            content=message.content,
            created_at=message.timestamp,
            agent_id=message.agent_id,
            speaker=message.speaker,
        )
        self.db_session.add(db_message)
    
    def clear_conversation(self, conversation_id: str) -> None:
        self.db_session.query(MessageModel).filter(
            MessageModel.conversation_id == conversation_id
        ).delete()
    
    def get_all_conversations(self, user_id: str = None) -> List[dict]:
        """Get all conversations from database with their messages"""
        query = (
            self.db_session.query(ConversationModel)
            .options(selectinload(ConversationModel.messages))
        )
        
        if user_id:
            query = query.filter(ConversationModel.user_id == user_id)
        
        db_conversations = query.all()
        
        conversations = []
        for conv in db_conversations:
            agent_ids = set()
            messages = []
            
            for msg in conv.messages:
                if msg.role == "assistant" and msg.agent_id:
                    agent_ids.add(msg.agent_id)
                
                speaker_name = msg.speaker
                if not speaker_name:
                    if msg.role == "user":
                        speaker_name = "user"
                    elif msg.agent_id:
                        from ....models.database import Agent as AgentModel
                        agent = self.db_session.query(AgentModel).filter(AgentModel.id == msg.agent_id).first()
                        speaker_name = agent.name if agent else msg.agent_id
                    else:
                        speaker_name = "assistant"
                
                messages.append({
                    "speaker": speaker_name,
                    "agent_id": msg.agent_id,
                    "message": msg.content,
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
        query = (
            self.db_session.query(ConversationModel)
            .options(selectinload(ConversationModel.messages))
            .filter(ConversationModel.id == conversation_id)
        )
        
        if user_id:
            query = query.filter(
                (ConversationModel.user_id == user_id) | 
                (ConversationModel.is_shared == True)
            )
        
        conv = query.first()
        
        if not conv:
            return None
        
        agent_ids = set()
        messages = []
        
        for msg in conv.messages:
            if msg.role == "assistant" and msg.agent_id:
                agent_ids.add(msg.agent_id)
            
            speaker_name = msg.speaker
            if not speaker_name:
                if msg.role == "user":
                    speaker_name = "user"
                elif msg.agent_id:
                    from ....models.database import Agent as AgentModel
                    agent = self.db_session.query(AgentModel).filter(AgentModel.id == msg.agent_id).first()
                    speaker_name = agent.name if agent else msg.agent_id
                else:
                    speaker_name = "assistant"
            
            messages.append({
                "speaker": speaker_name,
                "agent_id": msg.agent_id,
                "message": msg.content,
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
        conversation = (
            self.db_session.query(ConversationModel)
            .filter(ConversationModel.id == conversation_id)
            .filter(ConversationModel.user_id == user_id)
            .first()
        )
        
        if not conversation:
            return False
        
        conversation.is_shared = is_shared
        self.db_session.commit()
        return True
    
    def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        """Delete a conversation and all its messages"""
        conversation = (
            self.db_session.query(ConversationModel)
            .filter(ConversationModel.id == conversation_id)
            .filter(ConversationModel.user_id == user_id)
            .first()
        )
        
        if not conversation:
            return False
        
        # Delete all messages first (due to foreign key constraints)
        self.db_session.query(MessageModel).filter(
            MessageModel.conversation_id == conversation_id
        ).delete()
        
        # Delete the conversation
        self.db_session.delete(conversation)
        self.db_session.commit()
        return True