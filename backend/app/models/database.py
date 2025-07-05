from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import DateTime, func, Text, JSON


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(primary_key=True)
    email: str = Field(max_length=255, sa_column_kwargs={"unique": True, "nullable": False, "index": True})
    hashed_password: str = Field(max_length=255)
    first_name: Optional[str] = Field(max_length=100, default=None)
    last_name: Optional[str] = Field(max_length=100, default=None)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    # Credit system fields
    credits_balance: int = Field(default=10000)
    credits_used: int = Field(default=0)
    credits_purchased: int = Field(default=0)
    credit_plan: Optional[str] = Field(max_length=50, default=None)
    last_credit_refill_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True), default=None)

    # Relationships
    agents: List["Agent"] = Relationship(back_populates="user")
    conversations: List["Conversation"] = Relationship(back_populates="user")
    connections: List["Connection"] = Relationship(back_populates="user")
    voice_connections: List["VoiceConnection"] = Relationship(back_populates="user")
    projects: List["Project"] = Relationship(back_populates="user")


class Agent(SQLModel, table=True):
    __tablename__ = "agents"

    id: str = Field(primary_key=True)
    name: str = Field(max_length=255)
    prompt: str = Field(sa_column=Column(Text, nullable=False))
    characteristics: str = Field(sa_column=Column(Text, nullable=False))
    connection_id: str = Field(max_length=255)

    # Model configuration as JSON - renamed to avoid conflict
    ai_config: dict = Field(sa_column=Column(JSON, nullable=False))

    # Chat style as JSON
    chat_style: dict = Field(sa_column=Column(JSON, nullable=False))
    
    # Gender for voice assignment ('male', 'female', 'neutral')
    gender: str = Field(max_length=20, default='neutral')

    # Voice configuration
    voice_connection_id: Optional[str] = Field(foreign_key="voice_connections.id", default=None)
    voice_enabled: bool = Field(default=False)
    podcast_settings: Optional[dict] = Field(sa_column=Column(JSON, nullable=True), default=None)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    # User relationship
    user_id: str = Field(foreign_key="users.id")

    # Relationships
    user: "User" = Relationship(back_populates="agents")
    voice_connection: Optional["VoiceConnection"] = Relationship(back_populates="agents")
    conversations: List["Conversation"] = Relationship(back_populates="agent")
    messages: List["Message"] = Relationship(back_populates="agent")


class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    id: str = Field(primary_key=True)
    agent_id: Optional[str] = Field(foreign_key="agents.id", default=None)
    user_id: str = Field(foreign_key="users.id")
    project_id: Optional[str] = Field(foreign_key="projects.id", default=None)
    participants: List[str] = Field(sa_column=Column(JSON, nullable=False))
    is_shared: bool = Field(default=False)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    # Relationships
    agent: Optional["Agent"] = Relationship(back_populates="conversations")
    user: "User" = Relationship(back_populates="conversations")
    project: Optional["Project"] = Relationship(back_populates="conversations")
    messages: List["Message"] = Relationship(
        back_populates="conversation", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: Optional[int] = Field(primary_key=True, default=None)
    conversation_id: str = Field(foreign_key="conversations.id")
    agent_id: Optional[str] = Field(foreign_key="agents.id", default=None)

    role: str = Field(max_length=50)
    content: str = Field(sa_column=Column(Text, nullable=False))
    speaker: Optional[str] = Field(max_length=255, default=None)
    message_type: str = Field(max_length=50, default="message")
    
    # Detected language code (e.g., 'en', 'es', 'fr')
    language: Optional[str] = Field(max_length=10, default=None)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))

    # Relationships
    conversation: "Conversation" = Relationship(back_populates="messages")
    agent: Optional["Agent"] = Relationship(back_populates="messages")


class Connection(SQLModel, table=True):
    __tablename__ = "connections"

    id: str = Field(primary_key=True)
    name: str = Field(max_length=255)
    description: Optional[str] = Field(sa_column=Column(Text, nullable=True), default=None)
    provider: str = Field(max_length=100)
    model_name: str = Field(max_length=255)
    api_key: Optional[str] = Field(max_length=1000, default=None)
    api_key_encrypted: bool = Field(default=False)
    base_url: Optional[str] = Field(max_length=500, default=None)
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)  # Indicates if this is a default platform connection

    # User relationship
    user_id: str = Field(foreign_key="users.id")

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    # Relationships
    user: "User" = Relationship(back_populates="connections")


class VoiceConnection(SQLModel, table=True):
    __tablename__ = "voice_connections"

    id: str = Field(primary_key=True)
    name: str = Field(max_length=255)
    description: Optional[str] = Field(sa_column=Column(Text, nullable=True), default=None)
    # 'elevenlabs', 'openai', 'google', etc.
    provider: str = Field(max_length=100)
    provider_type: str = Field(max_length=50)  # 'tts', 'stt', 'both'

    # Voice settings
    voice_id: Optional[str] = Field(max_length=255, default=None)
    speed: float = Field(default=1.0)
    pitch: float = Field(default=1.0)
    stability: float = Field(default=0.75)
    clarity: float = Field(default=0.8)
    # conversational, podcast, professional
    style: str = Field(max_length=100, default='conversational')

    # Authentication & Configuration
    api_key: Optional[str] = Field(max_length=1000, default=None)
    api_key_encrypted: bool = Field(default=False)
    base_url: Optional[str] = Field(max_length=500, default=None)
    is_active: bool = Field(default=True)
    is_cloud_proxy: bool = Field(default=False)  # for ChatsParty cloud

    # User relationship
    user_id: str = Field(foreign_key="users.id")

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))

    # Relationships
    user: "User" = Relationship(back_populates="voice_connections")
    agents: List["Agent"] = Relationship(back_populates="voice_connection")


class PodcastJob(SQLModel, table=True):
    __tablename__ = "podcast_jobs"

    id: str = Field(primary_key=True)
    conversation_id: str = Field(foreign_key="conversations.id")
    user_id: str = Field(foreign_key="users.id")

    # Job status and tracking
    # queued, processing, completed, failed
    status: str = Field(max_length=50, default='queued')
    audio_path: Optional[str] = Field(max_length=500, default=None)
    error_message: Optional[str] = Field(sa_column=Column(Text, nullable=True), default=None)

    # Job metadata
    total_messages: Optional[int] = Field(default=None)
    processed_messages: Optional[int] = Field(default=0)
    duration_seconds: Optional[float] = Field(default=None)
    file_size_bytes: Optional[int] = Field(default=None)

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    completed_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True), default=None)

    # Relationships
    conversation: "Conversation" = Relationship()
    user: "User" = Relationship()


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: str = Field(primary_key=True)
    name: str = Field(max_length=255)
    description: Optional[str] = Field(sa_column=Column(Text, nullable=True), default=None)

    # VM Integration
    vm_container_id: Optional[str] = Field(max_length=255, default=None)
    # inactive, starting, active, error, stopped
    vm_status: str = Field(max_length=50, default='inactive')
    vm_configuration: Optional[dict] = Field(sa_column=Column(JSON, nullable=True), default=None)
    vm_url: Optional[str] = Field(max_length=500, default=None)

    # Storage & Files
    storage_mount_path: Optional[str] = Field(max_length=500, default=None)
    storage_config: Optional[dict] = Field(sa_column=Column(JSON, nullable=True), default=None)

    # Project settings
    is_active: bool = Field(default=True)
    auto_sync_files: bool = Field(default=True)
    instructions: Optional[str] = Field(sa_column=Column(Text, nullable=True), default=None)

    # User relationship
    user_id: str = Field(foreign_key="users.id")

    # Timestamps
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow))
    last_vm_activity: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True), default=None)

    # Relationships
    user: "User" = Relationship(back_populates="projects")
    project_files: List["ProjectFile"] = Relationship(
        back_populates="project", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    conversations: List["Conversation"] = Relationship(back_populates="project")
    vm_services: List["ProjectVMService"] = Relationship(
        back_populates="project", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class ProjectFile(SQLModel, table=True):
    __tablename__ = "project_files"

    id: str = Field(primary_key=True)
    project_id: str = Field(foreign_key="projects.id")
    filename: str = Field(max_length=255)
    file_path: str = Field(max_length=500)  # Path in storage
    vm_path: Optional[str] = Field(max_length=500, default=None)  # Path in VM
    content_type: str = Field(max_length=100)
    file_size: int = Field()
    checksum: Optional[str] = Field(max_length=64, default=None)

    # File metadata
    is_synced_to_vm: bool = Field(default=False)
    last_sync_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True), default=None)
    last_modified_in_vm: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True), default=None)

    # File permissions and access
    is_executable: bool = Field(default=False)
    file_permissions: Optional[str] = Field(max_length=10, default=None)  # e.g., "755", "644"

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow))

    # Relationships
    project: "Project" = Relationship(back_populates="project_files")


class ProjectVMService(SQLModel, table=True):
    __tablename__ = "project_vm_services"

    id: str = Field(primary_key=True)
    project_id: str = Field(foreign_key="projects.id")
    # e.g., "jupyter", "webapp", "database"
    service_name: str = Field(max_length=100)
    service_type: str = Field(max_length=50)  # e.g., "web", "database", "notebook"

    # Service configuration
    port: Optional[int] = Field(default=None)
    command: str = Field(sa_column=Column(Text, nullable=False))
    working_directory: Optional[str] = Field(max_length=500, default=None)
    environment_vars: Optional[dict] = Field(sa_column=Column(JSON, nullable=True), default=None)

    # Service status
    # stopped, starting, running, failed
    status: str = Field(max_length=20, default='stopped')
    process_id: Optional[int] = Field(default=None)
    service_url: Optional[str] = Field(max_length=500, default=None)

    # Service metadata
    auto_start: bool = Field(default=False)
    restart_policy: str = Field(max_length=20, default='no')  # no, always, on-failure

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow))
    last_started_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True), default=None)

    # Relationships
    project: "Project" = Relationship(back_populates="vm_services")


class CreditTransaction(SQLModel, table=True):
    __tablename__ = "credit_transactions"

    id: str = Field(primary_key=True)
    user_id: str = Field(foreign_key="users.id", sa_column_kwargs={"index": True})
    amount: int = Field()
    transaction_type: str = Field(max_length=20)
    reason: str = Field(max_length=100)
    description: Optional[str] = Field(sa_column=Column(Text, nullable=True), default=None)
    transaction_metadata: Optional[dict] = Field(sa_column=Column(JSON, nullable=True), default=None)
    balance_after: int = Field()
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True))

    # Relationships
    user: "User" = Relationship()


class ModelCreditCost(SQLModel, table=True):
    __tablename__ = "model_credit_costs"

    id: str = Field(primary_key=True)
    provider: str = Field(max_length=100)
    model_name: str = Field(max_length=255)
    cost_per_message: int = Field(default=1)
    cost_per_1k_tokens: Optional[int] = Field(default=None)
    is_default_model: bool = Field(default=False)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()))
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()))