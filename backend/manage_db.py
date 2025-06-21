#!/usr/bin/env python3
"""
Database management script for Wisty AI API

Usage:
    python manage_db.py migrate [--env=ENV_FILE]
        # Run pending migrations
    python manage_db.py create-migration [--env=ENV_FILE]
        # Create a new migration
    python manage_db.py reset [--env=ENV_FILE]
        # Reset database to empty state
    python manage_db.py init [--env=ENV_FILE]
        # Initialize fresh database

Environment Options:
    --env=.env       # Use local environment (default)
    --env=.env.cloud # Use cloud environment
    --env=custom.env # Use custom environment file
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_alembic_command(cmd: str, env_file: str = ".env"):
    """Run an alembic command with specified environment file"""
    # Set environment file for the command
    env = os.environ.copy()
    env['ENV_FILE'] = env_file

    result = subprocess.run(
        f"uv run alembic {cmd}",
        shell=True,
        capture_output=True,
        text=True,
        env=env
    )
    if result.returncode != 0:
        print(f"Error running alembic {cmd} with {env_file}:")
        print(result.stderr)
        sys.exit(1)
    print(result.stdout)


def migrate(env_file: str = ".env"):
    """Run database migrations"""
    print(f"Running database migrations using {env_file}...")
    run_alembic_command("upgrade head", env_file)
    print("✅ Migrations completed successfully")


def create_migration(env_file: str = ".env"):
    """Create a new migration"""
    message = input("Enter migration message: ")
    if not message:
        print("Migration message cannot be empty")
        sys.exit(1)

    print(f"Creating migration: {message} using {env_file}")
    run_alembic_command(f'revision --autogenerate -m "{message}"', env_file)
    print("✅ Migration created successfully")


def reset_database(env_file: str = ".env"):
    """Reset database to empty state"""
    print("⚠️  This will delete all data in the database!")
    confirm = input("Are you sure? (yes/no): ")
    if confirm.lower() != "yes":
        print("Database reset cancelled")
        return

    # Load environment to check database type
    from dotenv import load_dotenv
    load_dotenv(env_file)
    use_sqlite = os.getenv("USE_SQLITE", "true").lower() == "true"

    if use_sqlite:
        # For SQLite, delete the database file
        db_path = Path(os.getenv("SQLITE_DB_PATH", "chatsparty.db"))
        if db_path.exists():
            db_path.unlink()
            print("🗑️  SQLite database file deleted")
    else:
        # For PostgreSQL, drop all tables
        print("🗑️  Dropping all tables in PostgreSQL database...")
        run_alembic_command("downgrade base", env_file)

    print("🔄 Reinitializing database...")
    migrate(env_file)
    print("✅ Database reset completed")


def init_database(env_file: str = ".env"):
    """Initialize a fresh database"""
    print(f"Initializing database using {env_file}...")
    migrate(env_file)
    print("✅ Database initialized successfully")


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Database management for Wisty AI API"
    )
    parser.add_argument(
        "command",
        choices=["migrate", "create-migration", "reset", "init"],
        help="Command to execute"
    )
    parser.add_argument(
        "--env",
        default=".env",
        help="Environment file to use (default: .env)"
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Validate environment file exists
    if not Path(args.env).exists():
        print(f"❌ Environment file '{args.env}' not found!")
        print("Available environment files:")
        for env_file in Path(".").glob(".env*"):
            print(f"  - {env_file}")
        sys.exit(1)

    print(f"🔧 Using environment: {args.env}")

    commands = {
        "migrate": lambda: migrate(args.env),
        "create-migration": lambda: create_migration(args.env),
        "reset": lambda: reset_database(args.env),
        "init": lambda: init_database(args.env),
    }

    commands[args.command]()


if __name__ == "__main__":
    main()
