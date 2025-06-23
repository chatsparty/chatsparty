# Solo Developer Testing Framework - Quick Start

## 🚀 Quick Setup (2 minutes)

1. **Make sure your backend is running**:
   ```bash
   cd backend
   python main.py
   ```

2. **Run your first test**:
   ```bash
   cd backend/testing_framework
   python test_runner.py --feature file_operations --verbose
   ```

3. **Create tests for a new feature**:
   ```bash
   python test_runner.py --create-feature my_awesome_feature
   ```

## 📋 Common Commands

```bash
# Run all tests
python test_runner.py

# Run tests for specific feature
python test_runner.py --feature auth
python test_runner.py --feature projects
python test_runner.py --feature file_operations

# Run specific types of tests
python test_runner.py --type unit      # Fast unit tests
python test_runner.py --type api       # API endpoint tests  
python test_runner.py --type integration # Integration tests

# Get detailed output
python test_runner.py --verbose

# Save test report
python test_runner.py --report json
```

## 🏗️ Writing Your First Test

### 1. Create a feature test structure:
```bash
python test_runner.py --create-feature my_feature
```

### 2. Edit the generated test file (example for API test):
```python
# features/my_feature/test_api.py
from testing_framework.test_base import APITestBase

async def test_my_feature_endpoint():
    test = APITestBase()
    await test.async_setup()
    await test.login_as_test_user()
    
    try:
        # Test your API endpoint
        async with await test.get("/api/my-endpoint") as response:
            assert response.status == 200
            data = await response.json()
            assert "expected_field" in data
    finally:
        await test.async_teardown()
```

### 3. Run your test:
```bash
python test_runner.py --feature my_feature
```

## 🎯 Test Types Guide

### Unit Tests (`test_unit.py`)
- Test individual functions/classes
- Use mocks for external dependencies
- Fast execution (< 1 second)

```python
def test_calculation_function():
    result = my_calculation(10, 5)
    assert result == 15
```

### API Tests (`test_api.py`)
- Test HTTP endpoints
- Use real authentication
- Verify request/response behavior

```python
async def test_create_project_api():
    test = APITestBase()
    await test.async_setup()
    await test.login_as_test_user()
    
    project_data = {"name": "Test Project"}
    async with await test.post("/api/projects", json=project_data) as response:
        assert response.status == 201
```

### Integration Tests (`test_integration.py`)
- Test feature interactions
- Use real database/services
- Verify complete workflows

```python
async def test_project_file_workflow():
    # Test: Create project → Upload file → Delete file → Delete project
    pass
```

## 📊 Reading Test Results

```
🚀 Solo Developer Testing Framework
==================================================
Found 3 test files

📁 Testing feature: file_operations
------------------------------
  🧪 test_api.py (api)
    ✅ PASSED test_file_delete_api (0.234s)
    ✅ PASSED test_file_list_api (0.156s)
    ❌ FAILED test_file_upload_api (0.089s)

📊 TEST SUMMARY
==================================================
Total Tests: 15
✅ Passed: 12
❌ Failed: 3
📈 Success Rate: 80.0%
```

## 🛠️ Development Workflow

### As you develop a new feature:

1. **Create test structure**:
   ```bash
   python test_runner.py --create-feature user_management
   ```

2. **Write failing tests first** (TDD approach):
   ```python
   # Write what you expect the API to do
   async def test_create_user():
       # This will fail initially
       response = await test.post("/api/users", json=user_data)
       assert response.status == 201
   ```

3. **Run tests to see failures**:
   ```bash
   python test_runner.py --feature user_management
   ```

4. **Implement the feature** until tests pass

5. **Run all tests** to ensure no regressions:
   ```bash
   python test_runner.py
   ```

### Daily development routine:

```bash
# Morning: Run all tests to ensure clean state
python test_runner.py

# During development: Run feature-specific tests
python test_runner.py --feature current_feature --verbose

# Before committing: Run all tests + generate report
python test_runner.py --report json
```

## 🚨 Troubleshooting

### "Registration failed" errors
- Check that backend is running on localhost:8000
- Verify test user emails are valid (should use @example.com)

### "No tests found"
- Make sure test files start with `test_`
- Check that test functions start with `test_`
- Verify file paths are correct

### Tests are slow
- Run only the tests you need: `--feature myfeature --type unit`
- Use unit tests for fast feedback during development
- Save integration/API tests for final verification

### Authentication errors
- Make sure you call `await test.login_as_test_user()` in API tests
- Check that test users are properly configured in `test_config.py`

## 📁 Project Structure

```
testing_framework/
├── test_runner.py          # Main runner - your entry point
├── test_config.py          # Configuration (modify test users here)
├── test_base.py            # Base classes (inherit from these)
├── features/               # Your feature tests go here
│   ├── auth/
│   ├── projects/ 
│   └── file_operations/
├── integration/            # Cross-feature tests
├── e2e/                   # End-to-end tests
└── reports/               # Generated test reports
```

## 💡 Tips for Solo Development

1. **Start simple**: Begin with basic unit tests, add complexity later
2. **Test as you code**: Don't wait until the end to write tests
3. **Use test failures as documentation**: Failed tests show what needs to be built
4. **Run tests frequently**: Catch issues early when they're easy to fix
5. **Focus on critical paths**: Test the most important functionality first
6. **Use the framework patterns**: Follow the base classes and examples

## 🎉 Success Metrics

- **Green tests**: All tests passing gives you confidence to deploy
- **Coverage**: Aim for testing all critical user workflows  
- **Speed**: Unit tests should be fast, integration tests can be slower
- **Reliability**: Tests should pass consistently, not flaky

Ready to start testing? Create your first feature test:

```bash
python test_runner.py --create-feature your_new_feature
```