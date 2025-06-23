# Wisty Backend Development Shortcuts

.PHONY: dev start debug logs help install test clean

# Default target
help:
	@echo "🚀 Wisty Backend Development Commands:"
	@echo ""
	@echo "  make dev      - Start development server with hot reload and logging"
	@echo "  make start    - Start production server"
	@echo "  make debug    - Start server with debug logging"
	@echo "  make logs     - Start server with maximum logging detail"
	@echo "  make install  - Install dependencies with uv"
	@echo "  make test     - Run tests"
	@echo "  make clean    - Clean up temporary files"
	@echo "  make help     - Show this help message"
	@echo ""

# Development server with proper environment loading
dev:
	@python run_dev.py

# Alternative: Use shell script
dev-shell:
	@./start_dev.sh

# Start production server
start:
	@echo "🚀 Starting production server..."
	@if command -v uv >/dev/null 2>&1; then \
		uv run python main.py; \
	else \
		python main.py; \
	fi

# Debug mode with maximum logging
debug:
	@echo "🐛 Starting debug server with maximum logging..."
	@if command -v uv >/dev/null 2>&1; then \
		uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug --reload; \
	else \
		uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level debug --reload; \
	fi

# Maximum logging detail
logs:
	@echo "📋 Starting server with maximum logging detail..."
	@export PYTHONPATH=. && \
	if command -v uv >/dev/null 2>&1; then \
		uv run python -c "import logging; logging.basicConfig(level=logging.DEBUG); exec(open('dev_server.py').read())"; \
	else \
		python -c "import logging; logging.basicConfig(level=logging.DEBUG); exec(open('dev_server.py').read())"; \
	fi

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@if command -v uv >/dev/null 2>&1; then \
		uv sync; \
	else \
		pip install -r requirements.txt; \
	fi

# Run tests
test:
	@echo "🧪 Running tests..."
	@if command -v uv >/dev/null 2>&1; then \
		uv run pytest; \
	else \
		pytest; \
	fi

# Clean up
clean:
	@echo "🧹 Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.pyo" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true