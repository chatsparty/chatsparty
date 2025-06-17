from typing import List
from sqlalchemy.orm import Session, selectinload

from ....models.database import Conversation as ConversationModel, Message as MessageModel
from ..domain.entities import Message
from ..domain.interfaces import ConversationRepositoryInterface
from .base_repository import BaseRepository


class DatabaseConversationRepository(BaseRepository, ConversationRepositoryInterface):
    def __init__(self, db_session: Session):
        super().__init__(db_session)
    
    def create_conversation(self, conversation_id: str) -> List[Message]:
        db_conversation = ConversationModel(
            id=conversation_id,
            participants=[],
        )
        self.db_session.add(db_conversation)
        return []
    
    def get_conversation(self, conversation_id: str) -> List[Message]:
        db_conversation = (
            self.db_session.query(ConversationModel)
            .options(selectinload(ConversationModel.messages))
            .filter(ConversationModel.id == conversation_id)
            .first()
        )
        
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
    
    def get_all_conversations(self) -> List[dict]:
        """Get all conversations from database with their messages"""
        db_conversations = (
            self.db_session.query(ConversationModel)
            .options(selectinload(ConversationModel.messages))
            .all()
        )
        
        conversations = []
        for conv in db_conversations:
            # Extract agent IDs from messages for participants
            agent_ids = set()
            messages = []
            
            for msg in conv.messages:
                if msg.role == "assistant" and msg.agent_id:
                    agent_ids.add(msg.agent_id)
                
                # Convert database message to frontend format
                # For messages with agent_id, try to get agent name from database
                speaker_name = msg.speaker
                if not speaker_name:
                    if msg.role == "user":
                        speaker_name = "user"
                    elif msg.agent_id:
                        # Try to get agent name from database
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
            
            # Sort messages by timestamp
            messages.sort(key=lambda x: x["timestamp"])
            
            conversations.append({
                "id": conv.id,
                "participants": list(agent_ids) if agent_ids else conv.participants,
                "messages": messages,
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "isActive": False  # All saved conversations are inactive
            })
        
        return conversations