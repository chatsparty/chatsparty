"""
Initial migration - Create all tables
"""

from yoyo import step

__depends__ = {}

# Use a helper function to handle database-specific SQL
def get_timestamp_type(backend):
    """Get the appropriate timestamp type for the database"""
    if 'postgresql' in backend.uri.scheme:
        return 'TIMESTAMP'
    else:
        return 'DATETIME'

def get_autoincrement_type(backend):
    """Get the appropriate autoincrement type for the database"""
    if 'postgresql' in backend.uri.scheme:
        return 'SERIAL'
    else:
        return 'INTEGER'

# Define steps that work for both SQLite and PostgreSQL
steps = [
    step("""
    CREATE TABLE model_credit_costs (
    	id VARCHAR NOT NULL, 
    	provider VARCHAR(100) NOT NULL, 
    	model_name VARCHAR(255) NOT NULL, 
    	cost_per_message INTEGER NOT NULL, 
    	cost_per_1k_tokens INTEGER, 
    	is_default_model BOOLEAN NOT NULL, 
    	is_active BOOLEAN NOT NULL, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	PRIMARY KEY (id)
    )
    """),
    step("""
    CREATE TABLE users (
    	id VARCHAR NOT NULL, 
    	email VARCHAR(255) NOT NULL UNIQUE, 
    	hashed_password VARCHAR(255) NOT NULL, 
    	first_name VARCHAR(100), 
    	last_name VARCHAR(100), 
    	is_active BOOLEAN NOT NULL, 
    	is_verified BOOLEAN NOT NULL, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	credits_balance INTEGER NOT NULL, 
    	credits_used INTEGER NOT NULL, 
    	credits_purchased INTEGER NOT NULL, 
    	credit_plan VARCHAR(50), 
    	last_credit_refill_at TIMESTAMP, 
    	PRIMARY KEY (id)
    )
    """),
    step("""
    CREATE TABLE connections (
    	id VARCHAR NOT NULL, 
    	name VARCHAR(255) NOT NULL, 
    	description TEXT, 
    	provider VARCHAR(100) NOT NULL, 
    	model_name VARCHAR(255) NOT NULL, 
    	api_key VARCHAR(1000), 
    	api_key_encrypted BOOLEAN NOT NULL, 
    	base_url VARCHAR(500), 
    	is_active BOOLEAN NOT NULL, 
    	is_default BOOLEAN NOT NULL, 
    	mcp_server_url VARCHAR(500), 
    	mcp_server_config JSON, 
    	available_tools JSON, 
    	mcp_capabilities JSON, 
    	user_id VARCHAR NOT NULL, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id)
    )
    """),
    step("""
    CREATE TABLE credit_transactions (
    	id VARCHAR NOT NULL, 
    	user_id VARCHAR NOT NULL, 
    	amount INTEGER NOT NULL, 
    	transaction_type VARCHAR(20) NOT NULL, 
    	reason VARCHAR(100) NOT NULL, 
    	description TEXT, 
    	transaction_metadata JSON, 
    	balance_after INTEGER NOT NULL, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id)
    )
    """),
    step("""
    CREATE TABLE projects (
    	id VARCHAR NOT NULL, 
    	name VARCHAR(255) NOT NULL, 
    	description TEXT, 
    	vm_container_id VARCHAR(255), 
    	vm_status VARCHAR(50) NOT NULL, 
    	vm_config JSON, 
    	vm_url VARCHAR(500), 
    	storage_mount_path VARCHAR(500), 
    	storage_config JSON, 
    	is_active BOOLEAN NOT NULL, 
    	auto_sync_files BOOLEAN NOT NULL, 
    	instructions TEXT, 
    	user_id VARCHAR NOT NULL, 
    	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    	last_vm_activity TIMESTAMP, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id)
    )
    """),
    step("""
    CREATE TABLE voice_connections (
    	id VARCHAR NOT NULL, 
    	name VARCHAR(255) NOT NULL, 
    	description TEXT, 
    	provider VARCHAR(100) NOT NULL, 
    	provider_type VARCHAR(50) NOT NULL, 
    	voice_id VARCHAR(255), 
    	speed REAL NOT NULL, 
    	pitch REAL NOT NULL, 
    	stability REAL NOT NULL, 
    	clarity REAL NOT NULL, 
    	style VARCHAR(100) NOT NULL, 
    	api_key VARCHAR(1000), 
    	api_key_encrypted BOOLEAN NOT NULL, 
    	base_url VARCHAR(500), 
    	is_active BOOLEAN NOT NULL, 
    	is_cloud_proxy BOOLEAN NOT NULL, 
    	user_id VARCHAR NOT NULL, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id)
    )
    """),
    step("""
    CREATE TABLE agents (
    	id VARCHAR NOT NULL, 
    	name VARCHAR(255) NOT NULL, 
    	prompt TEXT NOT NULL, 
    	characteristics TEXT NOT NULL, 
    	connection_id VARCHAR(255) NOT NULL, 
    	model_config JSON NOT NULL, 
    	chat_style JSON NOT NULL, 
    	gender VARCHAR(20) NOT NULL, 
    	voice_connection_id VARCHAR, 
    	voice_enabled BOOLEAN NOT NULL, 
    	podcast_settings JSON, 
    	selected_mcp_tools JSON, 
    	mcp_tool_config JSON, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	user_id VARCHAR NOT NULL, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(voice_connection_id) REFERENCES voice_connections (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id)
    )
    """),
    step("""
    CREATE TABLE project_files (
    	id VARCHAR NOT NULL, 
    	project_id VARCHAR NOT NULL, 
    	filename VARCHAR(255) NOT NULL, 
    	file_path VARCHAR(500) NOT NULL, 
    	vm_path VARCHAR(500), 
    	content_type VARCHAR(100) NOT NULL, 
    	file_size INTEGER NOT NULL, 
    	checksum VARCHAR(64), 
    	is_synced_to_vm BOOLEAN NOT NULL, 
    	last_sync_at TIMESTAMP, 
    	last_modified_in_vm TIMESTAMP, 
    	is_executable BOOLEAN NOT NULL, 
    	file_permissions VARCHAR(10), 
    	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(project_id) REFERENCES projects (id)
    )
    """),
    step("""
    CREATE TABLE project_vm_services (
    	id VARCHAR NOT NULL, 
    	project_id VARCHAR NOT NULL, 
    	service_name VARCHAR(100) NOT NULL, 
    	service_type VARCHAR(50) NOT NULL, 
    	port INTEGER, 
    	command TEXT NOT NULL, 
    	working_directory VARCHAR(500), 
    	environment_vars JSON, 
    	status VARCHAR(20) NOT NULL, 
    	process_id INTEGER, 
    	service_url VARCHAR(500), 
    	auto_start BOOLEAN NOT NULL, 
    	restart_policy VARCHAR(20) NOT NULL, 
    	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    	last_started_at TIMESTAMP, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(project_id) REFERENCES projects (id)
    )
    """),
    step("""
    CREATE TABLE conversations (
    	id VARCHAR NOT NULL, 
    	agent_id VARCHAR, 
    	user_id VARCHAR NOT NULL, 
    	project_id VARCHAR, 
    	participants JSON NOT NULL, 
    	is_shared BOOLEAN NOT NULL, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(agent_id) REFERENCES agents (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id), 
    	FOREIGN KEY(project_id) REFERENCES projects (id)
    )
    """),
    # For PostgreSQL - use SERIAL
    step(
        """
        CREATE TABLE messages (
        	id SERIAL PRIMARY KEY, 
        	conversation_id VARCHAR NOT NULL, 
        	agent_id VARCHAR, 
        	role VARCHAR(50) NOT NULL, 
        	content TEXT NOT NULL, 
        	speaker VARCHAR(255), 
        	message_type VARCHAR(50) NOT NULL, 
        	language VARCHAR(10), 
        	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
        	FOREIGN KEY(conversation_id) REFERENCES conversations (id), 
        	FOREIGN KEY(agent_id) REFERENCES agents (id)
        )
        """,
        ignore_errors='apply',  # Ignore errors on apply (will fail on SQLite)
    ),
    # For SQLite - use INTEGER PRIMARY KEY
    step(
        """
        CREATE TABLE IF NOT EXISTS messages (
        	id INTEGER PRIMARY KEY, 
        	conversation_id VARCHAR NOT NULL, 
        	agent_id VARCHAR, 
        	role VARCHAR(50) NOT NULL, 
        	content TEXT NOT NULL, 
        	speaker VARCHAR(255), 
        	message_type VARCHAR(50) NOT NULL, 
        	language VARCHAR(10), 
        	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
        	FOREIGN KEY(conversation_id) REFERENCES conversations (id), 
        	FOREIGN KEY(agent_id) REFERENCES agents (id)
        )
        """,
        ignore_errors='apply',  # Ignore errors on apply (will fail on PostgreSQL)
    ),
    step("""
    CREATE TABLE podcast_jobs (
    	id VARCHAR NOT NULL, 
    	conversation_id VARCHAR NOT NULL, 
    	user_id VARCHAR NOT NULL, 
    	status VARCHAR(50) NOT NULL, 
    	audio_path VARCHAR(500), 
    	error_message TEXT, 
    	total_messages INTEGER, 
    	processed_messages INTEGER, 
    	duration_seconds REAL, 
    	file_size_bytes INTEGER, 
    	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
    	completed_at TIMESTAMP, 
    	PRIMARY KEY (id), 
    	FOREIGN KEY(conversation_id) REFERENCES conversations (id), 
    	FOREIGN KEY(user_id) REFERENCES users (id)
    )
    """),
]