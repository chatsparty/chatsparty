"""Error handling utilities for production environments"""

import logging
from typing import Optional
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from .config import settings

logger = logging.getLogger(__name__)


class DatabaseErrorHandler:
    """Handle database errors with production-safe error messages"""
    
    @staticmethod
    def handle_db_error(
        e: Exception, 
        operation: str = "database operation",
        user_message: str = "A database error occurred",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ) -> HTTPException:
        """
        Handle database errors with appropriate logging and user-friendly messages
        
        Args:
            e: The exception that occurred
            operation: Description of the operation that failed
            user_message: User-friendly error message
            status_code: HTTP status code to return
            
        Returns:
            HTTPException with appropriate message
        """
        # Always log the detailed error for debugging
        logger.error(f"Database error in {operation}: {str(e)}", exc_info=True)
        
        # In production mode, hide detailed database errors
        if settings.hide_db_errors and not settings.debug_mode:
            detail = user_message
        else:
            # In development, show detailed error information
            detail = f"{user_message}: {str(e)}"
        
        return HTTPException(
            status_code=status_code,
            detail=detail
        )
    
    @staticmethod
    def handle_connection_error(e: Exception) -> HTTPException:
        """Handle database connection errors specifically"""
        return DatabaseErrorHandler.handle_db_error(
            e,
            operation="database connection",
            user_message="Database connection failed. Please try again later.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    @staticmethod
    def handle_transaction_error(e: Exception) -> HTTPException:
        """Handle database transaction errors specifically"""
        return DatabaseErrorHandler.handle_db_error(
            e,
            operation="database transaction",
            user_message="Database operation failed. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    @staticmethod
    def handle_query_error(e: Exception, resource: str = "resource") -> HTTPException:
        """Handle database query errors specifically"""
        return DatabaseErrorHandler.handle_db_error(
            e,
            operation=f"querying {resource}",
            user_message=f"Failed to fetch {resource}. Please try again later.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def safe_db_operation(operation_name: str = "database operation"):
    """
    Decorator for safely executing database operations with proper error handling
    
    Args:
        operation_name: Name of the operation for logging purposes
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except SQLAlchemyError as e:
                raise DatabaseErrorHandler.handle_db_error(e, operation_name)
            except Exception as e:
                # Handle non-database errors
                logger.error(f"Unexpected error in {operation_name}: {str(e)}", exc_info=True)
                if settings.hide_db_errors and not settings.debug_mode:
                    detail = f"An error occurred during {operation_name}"
                else:
                    detail = f"Unexpected error in {operation_name}: {str(e)}"
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=detail
                )
        return wrapper
    return decorator