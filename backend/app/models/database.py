from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Credit system fields
    credits_balance: Mapped[int] = mapped_column(Integer, default=10000)
    credits_used: Mapped[int] = mapped_column(Integer, default=0)
    credits_purchased: Mapped[int] = mapped_column(Integer, default=0)
    credit_plan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    last_credit_refill_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # Relationships
    agents: Mapped[List["Agent"]] = relationship(
        "Agent", back_populates="user")
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="user")
    connections: Mapped[List["Connection"]] = relationship(
        "Connection", back_populates="user")
    voice_connections: Mapped[List["VoiceConnection"]] = relationship(
        "VoiceConnection", back_populates="user")
    projects: Mapped[List["Project"]] = relationship(
        "Project", back_populates="user")


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
    
    # Gender for voice assignment ('male', 'female', 'neutral')
    gender: Mapped[str] = mapped_column(String(20), default='neutral', nullable=False)

    # Voice configuration
    voice_connection_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("voice_connections.id"), nullable=True)
    voice_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    podcast_settings: Mapped[Optional[dict]
                             ] = mapped_column(JSON, nullable=True)

    # MCP tool configuration
    selected_mcp_tools: Mapped[Optional[List[str]]
                               ] = mapped_column(JSON, nullable=True)
    mcp_tool_config: Mapped[Optional[dict]
                            ] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # User relationship
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="agents")
    voice_connection: Mapped[Optional["VoiceConnection"]] = relationship(
        "VoiceConnection", back_populates="agents")
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="agent")
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="agent")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("agents.id"), nullable=True)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False)
    project_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("projects.id"), nullable=True)
    participants: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent", back_populates="conversations")
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    project: Mapped[Optional["Project"]] = relationship(
        "Project", back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id"), nullable=False)
    agent_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("agents.id"), nullable=True)

    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    speaker: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    message_type: Mapped[str] = mapped_column(String(50), default="message")
    
    # Detected language code (e.g., 'en', 'es', 'fr')
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages")
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent", back_populates="messages")


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[Optional[str]] = mapped_column(
        String(1000), nullable=True)
    api_key_encrypted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False)
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)  # Indicates if this is a default platform connection

    # MCP-specific fields
    mcp_server_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True)
    mcp_server_config: Mapped[Optional[dict]
                              ] = mapped_column(JSON, nullable=True)
    available_tools: Mapped[Optional[List[dict]]
                            ] = mapped_column(JSON, nullable=True)
    mcp_capabilities: Mapped[Optional[dict]
                             ] = mapped_column(JSON, nullable=True)

    # User relationship
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="connections")


class VoiceConnection(Base):
    __tablename__ = "voice_connections"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 'elevenlabs', 'openai', 'google', etc.
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_type: Mapped[str] = mapped_column(
        String(50), nullable=False)  # 'tts', 'stt', 'both'

    # Voice settings
    voice_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True)
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    pitch: Mapped[float] = mapped_column(Float, default=1.0)
    stability: Mapped[float] = mapped_column(Float, default=0.75)
    clarity: Mapped[float] = mapped_column(Float, default=0.8)
    # conversational, podcast, professional
    style: Mapped[str] = mapped_column(String(100), default='conversational')

    # Authentication & Configuration
    api_key: Mapped[Optional[str]] = mapped_column(
        String(1000), nullable=True)
    api_key_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_cloud_proxy: Mapped[bool] = mapped_column(
        Boolean, default=False)  # for ChatsParty cloud

    # User relationship
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(
        "User", back_populates="voice_connections")
    agents: Mapped[List["Agent"]] = relationship(
        "Agent", back_populates="voice_connection")


class PodcastJob(Base):
    __tablename__ = "podcast_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False)

    # Job status and tracking
    # queued, processing, completed, failed
    status: Mapped[str] = mapped_column(String(50), default='queued')
    audio_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Job metadata
    total_messages: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True)
    processed_messages: Mapped[Optional[int]
                               ] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[Optional[float]
                             ] = mapped_column(Float, nullable=True)
    file_size_bytes: Mapped[Optional[int]
                            ] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation")
    user: Mapped["User"] = relationship("User")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # VM Integration
    vm_container_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True)
    # inactive, starting, active, error, stopped
    vm_status: Mapped[str] = mapped_column(String(50), default='inactive')
    vm_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    vm_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Storage & Files
    storage_mount_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True)
    storage_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Project settings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_sync_files: Mapped[bool] = mapped_column(Boolean, default=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # User relationship
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_vm_activity: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    project_files: Mapped[List["ProjectFile"]] = relationship(
        "ProjectFile", back_populates="project", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="project")
    vm_services: Mapped[List["ProjectVMService"]] = relationship(
        "ProjectVMService", back_populates="project", cascade="all, delete-orphan")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(
        String(500), nullable=False)  # Path in storage
    vm_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True)  # Path in VM
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # File metadata
    is_synced_to_vm: Mapped[bool] = mapped_column(Boolean, default=False)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)
    last_modified_in_vm: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # File permissions and access
    is_executable: Mapped[bool] = mapped_column(Boolean, default=False)
    file_permissions: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True)  # e.g., "755", "644"

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project", back_populates="project_files")


class ProjectVMService(Base):
    __tablename__ = "project_vm_services"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id"), nullable=False)
    # e.g., "jupyter", "webapp", "database"
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_type: Mapped[str] = mapped_column(
        String(50), nullable=False)  # e.g., "web", "database", "notebook"

    # Service configuration
    port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    command: Mapped[str] = mapped_column(Text, nullable=False)
    working_directory: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True)
    environment_vars: Mapped[Optional[dict]
                             ] = mapped_column(JSON, nullable=True)

    # Service status
    # stopped, starting, running, failed
    status: Mapped[str] = mapped_column(String(20), default='stopped')
    process_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    service_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True)

    # Service metadata
    auto_start: Mapped[bool] = mapped_column(Boolean, default=False)
    restart_policy: Mapped[str] = mapped_column(
        String(20), default='no')  # no, always, on-failure

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project", back_populates="vm_services")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transaction_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class ModelCreditCost(Base):
    __tablename__ = "model_credit_costs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cost_per_message: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    cost_per_1k_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_default_model: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
