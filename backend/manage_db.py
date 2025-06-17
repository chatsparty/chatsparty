#!/usr/bin/env python3
"""
Database management script for Wisty AI API

Usage:
    python manage_db.py migrate          # Run pending migrations
    python manage_db.py create-migration # Create a new migration
    python manage_db.py reset           # Reset database to empty state
    python manage_db.py init            # Initialize fresh database
"""

import sys
import os
import subprocess
from pathlib import Path

def run_alembic_command(cmd: str):
    """Run an alembic command"""
    result = subprocess.run(f"uv run alembic {cmd}", shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running alembic {cmd}:")
        print(result.stderr)
        sys.exit(1)
    print(result.stdout)

def migrate():
    """Run database migrations"""
    print("Running database migrations...")
    run_alembic_command("upgrade head")
    print("✅ Migrations completed successfully")

def create_migration():
    """Create a new migration"""
    message = input("Enter migration message: ")
    if not message:
        print("Migration message cannot be empty")
        sys.exit(1)
    
    print(f"Creating migration: {message}")
    run_alembic_command(f'revision --autogenerate -m "{message}"')
    print("✅ Migration created successfully")

def reset_database():
    """Reset database to empty state"""
    print("⚠️  This will delete all data in the database!")
    confirm = input("Are you sure? (yes/no): ")
    if confirm.lower() != "yes":
        print("Database reset cancelled")
        return
    
    # For SQLite, just delete the file
    db_path = Path("wisty.db")
    if db_path.exists():
        db_path.unlink()
        print("🗑️  Database file deleted")
    
    print("🔄 Reinitializing database...")
    migrate()
    print("✅ Database reset completed")

def init_database():
    """Initialize a fresh database"""
    print("Initializing database...")
    migrate()
    print("✅ Database initialized successfully")

def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    
    command = sys.argv[1]
    
    commands = {
        "migrate": migrate,
        "create-migration": create_migration,
        "reset": reset_database,
        "init": init_database,
    }
    
    if command not in commands:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)
    
    commands[command]()

if __name__ == "__main__":
    main()