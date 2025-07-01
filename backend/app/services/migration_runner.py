import logging
from pathlib import Path
from yoyo import get_backend, read_migrations
from app.core.config import settings

logger = logging.getLogger(__name__)

class MigrationRunner:
    def __init__(self):
        self.backend_dir = Path(__file__).parent.parent.parent
        self.migrations_dir = self.backend_dir / "migrations"
        
    async def check_migration_status(self):
        """Check if migrations are up to date"""
        try:
            # Get database URL
            db_url = settings.database_url_computed
            
            # Convert async SQLAlchemy URL to sync URL for yoyo
            if db_url.startswith("sqlite+aiosqlite:"):
                db_url = db_url.replace("sqlite+aiosqlite:", "sqlite:")
            elif db_url.startswith("postgresql+asyncpg:"):
                db_url = db_url.replace("postgresql+asyncpg:", "postgresql:")
            
            # Get backend and migrations
            backend = get_backend(db_url)
            migrations = read_migrations(str(self.migrations_dir))
            
            with backend.lock():
                # Get applied migrations
                applied = backend.to_apply(migrations)
                
                if not applied:
                    logger.info("✅ Database is up to date")
                    return True
                else:
                    logger.info(f"📦 {len(applied)} migrations need to be applied")
                    return False
                    
        except Exception as e:
            logger.error(f"Error checking migration status: {e}")
            return False
    
    async def run_migrations(self):
        """Run pending migrations"""
        try:
            logger.info("Running database migrations...")
            
            # Get database URL
            db_url = settings.database_url_computed
            
            # Convert async SQLAlchemy URL to sync URL for yoyo
            if db_url.startswith("sqlite+aiosqlite:"):
                db_url = db_url.replace("sqlite+aiosqlite:", "sqlite:")
            elif db_url.startswith("postgresql+asyncpg:"):
                db_url = db_url.replace("postgresql+asyncpg:", "postgresql:")
            
            # Get backend and migrations
            backend = get_backend(db_url)
            migrations = read_migrations(str(self.migrations_dir))
            
            with backend.lock():
                # Apply migrations
                backend.apply_migrations(backend.to_apply(migrations))
                
            logger.info("✅ Migrations applied successfully")
            return True
                
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
    
    async def ensure_migrations_applied(self):
        """Check and apply migrations if needed"""
        try:
            # Create migrations directory if it doesn't exist
            self.migrations_dir.mkdir(exist_ok=True)
            
            # Check if migrations are needed
            if await self.check_migration_status():
                return True
            
            # Run migrations
            logger.info("📦 Applying pending database migrations...")
            if await self.run_migrations():
                logger.info("✅ All migrations applied successfully")
                return True
            else:
                logger.error("❌ Failed to apply migrations")
                return False
                
        except Exception as e:
            logger.error(f"Error in migration runner: {e}")
            return False

# Global instance
migration_runner = MigrationRunner()