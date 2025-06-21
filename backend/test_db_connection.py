#!/usr/bin/env python3
"""
Test database connection script

Usage:
    python test_db_connection.py [--env=ENV_FILE]

Environment Options:
    --env=.env       # Test local environment (default)
    --env=.env.cloud # Test cloud environment
"""

import sys
import asyncio
import argparse
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def test_connection(env_file: str = ".env"):
    """Test database connection"""
    print(f"🔧 Testing connection using {env_file}...")
    
    # Load environment file
    load_dotenv(env_file)
    
    # Import settings after loading environment
    from app.core.config import get_settings
    settings = get_settings(env_file)
    
    print(f"📍 Database URL: {settings.database_url_computed}")
    
    try:
        # Create engine
        engine = create_async_engine(
            settings.database_url_computed,
            echo=False,
            pool_pre_ping=True
        )
        
        # Test connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
            if row and row[0] == 1:
                print("✅ Database connection successful!")
                
                # Test if tables exist
                if settings.use_sqlite:
                    table_query = "SELECT name FROM sqlite_master WHERE type='table'"
                else:
                    table_query = "SELECT tablename FROM pg_tables WHERE schemaname='public'"
                
                result = await conn.execute(text(table_query))
                tables = result.fetchall()
                
                if tables:
                    print(f"📊 Found {len(tables)} tables:")
                    for table in tables:
                        print(f"  - {table[0]}")
                else:
                    print("📊 No tables found - database may need initialization")
            else:
                print("❌ Database connection test failed")
                
        await engine.dispose()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    return True


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Test database connection")
    parser.add_argument("--env", default=".env", 
                       help="Environment file to use (default: .env)")
    return parser.parse_args()


async def main():
    args = parse_args()
    
    # Validate environment file exists
    if not Path(args.env).exists():
        print(f"❌ Environment file '{args.env}' not found!")
        print("Available environment files:")
        for env_file in Path(".").glob(".env*"):
            print(f"  - {env_file}")
        sys.exit(1)
    
    success = await test_connection(args.env)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())