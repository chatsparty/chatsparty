"""
Testing Framework Configuration

This file contains all configuration settings for the testing framework.
Modify these settings to match your project needs.
"""

import os
from pathlib import Path
from typing import Dict, Any, List

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
FRONTEND_ROOT = PROJECT_ROOT.parent / "frontend"
TESTING_ROOT = Path(__file__).parent

# Backend configuration
BACKEND_CONFIG = {
    "host": "localhost",
    "port": 8000,
    "base_url": "http://localhost:8000",
    "startup_timeout": 30,  # seconds to wait for backend startup
}

# Frontend configuration  
FRONTEND_CONFIG = {
    "host": "localhost",
    "port": 5173,
    "base_url": "http://localhost:5173",
    "startup_timeout": 30,  # seconds to wait for frontend startup
}

# Database configuration for tests
DATABASE_CONFIG = {
    "test_db_name": "wisty_test",
    "cleanup_after_tests": True,
    "use_transactions": True,  # Rollback after each test
}

# Test user credentials for authentication tests
TEST_USERS = {
    "admin": {
        "email": "test.admin@example.com",
        "password": "admin_test_password_123",
        "first_name": "Test",
        "last_name": "Admin"
    },
    "regular": {
        "email": "test.user@example.com", 
        "password": "user_test_password_123",
        "first_name": "Test",
        "last_name": "User"
    }
}

# VM/Docker configuration for tests
VM_CONFIG = {
    "test_project_prefix": "test_project_",
    "cleanup_containers": True,
    "container_timeout": 60,  # seconds
}

# Test timing and timeouts
TIMEOUTS = {
    "unit_test": 5,        # seconds
    "integration_test": 30, # seconds  
    "e2e_test": 120,       # seconds
    "api_request": 10,     # seconds
    "database_query": 5,   # seconds
}

# Features to test (add new features here as you develop them)
FEATURES = {
    "auth": {
        "description": "Authentication and authorization",
        "endpoints": ["/auth/login", "/auth/register", "/auth/refresh"],
        "critical": True
    },
    "projects": {
        "description": "Project management",
        "endpoints": ["/api/projects", "/api/projects/{id}"],
        "critical": True
    },
    "file_operations": {
        "description": "File upload, download, delete operations", 
        "endpoints": ["/api/projects/{id}/files"],
        "critical": True
    },
    "vm_management": {
        "description": "VM/Container management",
        "endpoints": ["/api/projects/{id}/vm"],
        "critical": True
    },
    "chat": {
        "description": "AI chat functionality",
        "endpoints": ["/chat", "/chat/agents"],
        "critical": False
    }
}

# Test data paths
TEST_DATA = {
    "files": TESTING_ROOT / "test_data" / "files",
    "images": TESTING_ROOT / "test_data" / "images", 
    "documents": TESTING_ROOT / "test_data" / "documents",
    "fixtures": TESTING_ROOT / "fixtures"
}

# Reporting configuration
REPORTING = {
    "save_reports": True,
    "report_formats": ["json"],  # Future: "html", "xml"
    "reports_dir": TESTING_ROOT / "reports",
    "max_report_age_days": 30,  # Auto-cleanup old reports
}

# Coverage configuration
COVERAGE = {
    "enabled": False,  # Set to True when you add coverage tools
    "min_coverage": 80,  # Minimum coverage percentage
    "exclude_patterns": [
        "*/test_*",
        "*/testing_framework/*",
        "*/__pycache__/*"
    ]
}

# Performance test thresholds
PERFORMANCE = {
    "api_response_time_ms": 1000,  # Max acceptable API response time
    "database_query_time_ms": 500,  # Max acceptable DB query time
    "page_load_time_ms": 3000,     # Max acceptable page load time
}

# Test environment variables
TEST_ENV_VARS = {
    "WISTY_ENV": "test",
    "VM_PROVIDER": "docker",
    "DATABASE_URL": "sqlite:///test_wisty.db",
    "DISABLE_AUTH": "false",  # Keep auth enabled for most tests
}

# Logging configuration for tests
LOGGING = {
    "level": "INFO",  # DEBUG, INFO, WARNING, ERROR
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "save_logs": True,
    "logs_dir": TESTING_ROOT / "logs"
}

def get_test_config() -> Dict[str, Any]:
    """Get complete test configuration"""
    return {
        "backend": BACKEND_CONFIG,
        "frontend": FRONTEND_CONFIG,
        "database": DATABASE_CONFIG,
        "vm": VM_CONFIG,
        "timeouts": TIMEOUTS,
        "features": FEATURES,
        "test_data": TEST_DATA,
        "reporting": REPORTING,
        "coverage": COVERAGE,
        "performance": PERFORMANCE,
        "test_users": TEST_USERS,
        "env_vars": TEST_ENV_VARS,
        "logging": LOGGING
    }

def setup_test_environment():
    """Set up test environment variables and directories"""
    # Set environment variables
    for key, value in TEST_ENV_VARS.items():
        os.environ[key] = value
    
    # Create necessary directories
    directories = [
        TESTING_ROOT / "reports",
        TESTING_ROOT / "logs", 
        TESTING_ROOT / "test_data" / "files",
        TESTING_ROOT / "test_data" / "images",
        TESTING_ROOT / "test_data" / "documents",
        TESTING_ROOT / "fixtures"
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

def get_feature_config(feature_name: str) -> Dict[str, Any]:
    """Get configuration for a specific feature"""
    return FEATURES.get(feature_name, {})

def is_critical_feature(feature_name: str) -> bool:
    """Check if a feature is marked as critical"""
    return FEATURES.get(feature_name, {}).get("critical", False)

# Initialize test environment when this module is imported
setup_test_environment()