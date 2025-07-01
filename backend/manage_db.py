#!/usr/bin/env python3
"""
Database management script for Wisty AI API using yoyo-migrations

Usage:
    python manage_db.py migrate [--env=ENV_FILE]
        # Run pending migrations
    python manage_db.py rollback [--env=ENV_FILE]
        # Rollback last migration
    python manage_db.py status [--env=ENV_FILE]
        # Show migration status
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
import sys
from pathlib import Path
from yoyo import get_backend, read_migrations
from dotenv import load_dotenv


def get_db_url(env_file: str = ".env"):
    """Get database URL from environment file"""
    load_dotenv(env_file)
    
    use_sqlite = os.getenv("USE_SQLITE", "true").lower() == "true"
    
    if use_sqlite:
        db_path = os.getenv("SQLITE_DB_PATH", "wisty.db")
        return f"sqlite:///{db_path}"
    else:
        # PostgreSQL - support both DATABASE_* and POSTGRES_* prefixes
        db_host = os.getenv("DATABASE_HOST") or os.getenv("POSTGRES_HOST", "localhost")
        db_port = os.getenv("DATABASE_PORT") or os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("DATABASE_NAME") or os.getenv("POSTGRES_DB", "wisty")
        db_user = os.getenv("DATABASE_USER") or os.getenv("POSTGRES_USER", "postgres")
        db_pass = os.getenv("DATABASE_PASSWORD") or os.getenv("POSTGRES_PASSWORD", "")
        
        if db_pass:
            return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
        else:
            return f"postgresql://{db_user}@{db_host}:{db_port}/{db_name}"


def migrate(env_file: str = ".env"):
    """Run database migrations"""
    print(f"Running database migrations using {env_file}...")
    
    db_url = get_db_url(env_file)
    backend = get_backend(db_url)
    migrations = read_migrations("./migrations")
    
    with backend.lock():
        pending = backend.to_apply(migrations)
        if pending:
            print(f"Applying {len(pending)} migration(s)...")
            backend.apply_migrations(pending)
            print("✅ Migrations completed successfully")
        else:
            print("✅ No pending migrations")


def rollback(env_file: str = ".env"):
    """Rollback last migration"""
    print(f"Rolling back last migration using {env_file}...")
    
    db_url = get_db_url(env_file)
    backend = get_backend(db_url)
    migrations = read_migrations("./migrations")
    
    with backend.lock():
        applied = backend.to_rollback(migrations)
        if applied:
            last_migration = applied[-1]
            print(f"Rolling back: {last_migration.id}")
            backend.rollback_migrations([last_migration])
            print("✅ Rollback completed successfully")
        else:
            print("⚠️  No migrations to rollback")


def status(env_file: str = ".env"):
    """Show migration status"""
    print(f"Checking migration status using {env_file}...")
    
    db_url = get_db_url(env_file)
    backend = get_backend(db_url)
    migrations = read_migrations("./migrations")
    
    with backend.lock():
        applied_migrations = [m for m in migrations if backend.is_applied(m)]
        pending = backend.to_apply(migrations)
        
        print("\n📋 Applied migrations:")
        if applied_migrations:
            for migration in applied_migrations:
                print(f"  ✅ {migration.id}")
        else:
            print("  (none)")
        
        print("\n📦 Pending migrations:")
        if pending:
            for migration in pending:
                print(f"  ⏳ {migration.id}")
        else:
            print("  (none)")


def reset_database(env_file: str = ".env"):
    """Reset database to empty state"""
    print("⚠️  This will delete all data in the database!")
    confirm = input("Are you sure? (yes/no): ")
    if confirm.lower() != "yes":
        print("Database reset cancelled")
        return

    # Load environment to check database type
    load_dotenv(env_file)
    use_sqlite = os.getenv("USE_SQLITE", "true").lower() == "true"

    if use_sqlite:
        # For SQLite, delete the database file
        db_path = Path(os.getenv("SQLITE_DB_PATH", "wisty.db"))
        if db_path.exists():
            db_path.unlink()
            print("🗑️  SQLite database file deleted")
    else:
        # For PostgreSQL, rollback all migrations
        db_url = get_db_url(env_file)
        backend = get_backend(db_url)
        migrations = read_migrations("./migrations")
        
        with backend.lock():
            print("🗑️  Rolling back all migrations...")
            backend.rollback_migrations(backend.to_rollback(migrations))

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
        choices=["migrate", "rollback", "status", "reset", "init"],
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
        "rollback": lambda: rollback(args.env),
        "status": lambda: status(args.env),
        "reset": lambda: reset_database(args.env),
        "init": lambda: init_database(args.env),
    }

    commands[args.command]()


if __name__ == "__main__":
    main()