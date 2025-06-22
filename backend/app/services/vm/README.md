# VM Provider Abstraction System

## 🚨 CRITICAL: ALWAYS USE THE ABSTRACT INTERFACE

This directory contains the **ABSTRACT VM PROVIDER SYSTEM** that enables cloud-agnostic container/VM management.

## Quick Reference

### ✅ Correct Usage
```python
from services.vm_factory import get_vm_service

vm_service = get_vm_service()  # Auto-selects provider
await vm_service.create_project_sandbox(project_id)
```

### ❌ Incorrect Usage
```python
from services.docker.docker_facade import DockerFacade
docker = DockerFacade()  # DON'T DO THIS
```

## Directory Structure

```
vm/
├── interfaces/
│   └── vm_provider.py          # ⭐ MAIN INTERFACE - Add new methods here
├── implementations/
│   ├── docker_provider.py      # Docker implementation
│   └── fly_provider.py         # Fly.io implementation
└── vm_factory.py               # Factory pattern
```

## Adding New VM Features

1. **Add method to `VMProviderInterface`** (interfaces/vm_provider.py)
2. **Implement in ALL providers** (implementations/*.py)
3. **Use factory pattern** in your code
4. **Test both providers**

## Provider Configuration

```bash
# Environment Variables
VM_PROVIDER=docker  # or 'fly'
FLY_TOKEN=xxx       # if using Fly.io
FLY_APP_NAME=xxx    # if using Fly.io
```

## Current Providers

- **Docker** (`docker`): Local development
- **Fly.io** (`fly`): Production deployment
- **Future**: GKE, AWS ECS, etc. (easy to add)

---
**Remember**: This abstraction allows seamless switching between cloud providers without changing business logic!