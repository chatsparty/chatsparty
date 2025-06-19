from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, JSON, Boolean, Float
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func

from ..core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    agents: Mapped[List["Agent"]] = relationship("Agent", back_populates="user")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user")
    connections: Mapped[List["Connection"]] = relationship("Connection", back_populates="user")
    voice_connections: Mapped[List["VoiceConnection"]] = relationship("VoiceConnection", back_populates="user")


class Agent(Base):
    __tablename__ = "agents"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    characteristics: Mapped[str] = mapped_column(Text, nullable=False)
    connection_id: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Model configuration as JSON
    model_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Chat style as JSON
    chat_style: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Voice configuration
    voice_connection_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("voice_connections.id"), nullable=True)
    voice_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    podcast_settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # User relationship
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="agents")
    voice_connection: Mapped[Optional["VoiceConnection"]] = relationship("VoiceConnection", back_populates="agents")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="agent")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="agent")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("agents.id"), nullable=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    participants: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    agent: Mapped[Optional["Agent"]] = relationship("Agent", back_populates="conversations")
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id"), nullable=False)
    agent_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("agents.id"), nullable=True)
    
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    speaker: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message_type: Mapped[str] = mapped_column(String(50), default="message")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    agent: Mapped[Optional["Agent"]] = relationship("Agent", back_populates="messages")


class Connection(Base):
    __tablename__ = "connections"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)  # Increased size for encrypted data
    api_key_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Track encryption status
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # User relationship
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="connections")


class VoiceConnection(Base):
    __tablename__ = "voice_connections"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)  # 'elevenlabs', 'openai', 'google', etc.
    provider_type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'tts', 'stt', 'both'
    
    # Voice settings
    voice_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # provider-specific voice identifier
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    pitch: Mapped[float] = mapped_column(Float, default=1.0)
    stability: Mapped[float] = mapped_column(Float, default=0.75)
    clarity: Mapped[float] = mapped_column(Float, default=0.8)
    style: Mapped[str] = mapped_column(String(100), default='conversational')  # conversational, podcast, professional
    
    # Authentication & Configuration
    api_key: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)  # encrypted
    api_key_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_cloud_proxy: Mapped[bool] = mapped_column(Boolean, default=False)  # for ChatsParty cloud
    
    # User relationship
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="voice_connections")
    agents: Mapped[List["Agent"]] = relationship("Agent", back_populates="voice_connection")


class PodcastJob(Base):
    __tablename__ = "podcast_jobs"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    
    # Job status and tracking
    status: Mapped[str] = mapped_column(String(50), default='queued')  # queued, processing, completed, failed
    audio_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Job metadata
    total_messages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    processed_messages: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation")
    user: Mapped["User"] = relationship("User")