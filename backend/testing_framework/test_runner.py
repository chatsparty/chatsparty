#!/usr/bin/env python3
"""
Solo Developer Testing Framework - Main Test Runner

This is your one-stop test runner that discovers and runs all tests in your project.
Perfect for solo developers who want comprehensive testing without complexity.

Usage:
    python test_runner.py                    # Run all tests
    python test_runner.py --feature auth     # Run auth feature tests
    python test_runner.py --type unit        # Run only unit tests
    python test_runner.py --verbose          # Detailed output
    python test_runner.py --coverage         # Generate coverage report
    python test_runner.py --create-feature myfeature  # Create new feature tests
"""

import asyncio
import argparse
import os
import sys
import time
import importlib.util
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import json

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class TestType(Enum):
    UNIT = "unit"
    INTEGRATION = "integration"
    E2E = "e2e"
    API = "api"
    PERFORMANCE = "performance"

class TestStatus(Enum):
    PASSED = "✅ PASSED"
    FAILED = "❌ FAILED"
    SKIPPED = "⏭️ SKIPPED"
    ERROR = "💥 ERROR"

@dataclass
class TestResult:
    name: str
    feature: str
    test_type: TestType
    status: TestStatus
    duration: float
    error_message: Optional[str] = None
    details: Optional[str] = None

class TestRunner:
    def __init__(self):
        self.results: List[TestResult] = []
        self.framework_root = Path(__file__).parent
        self.project_root = self.framework_root.parent
        self.verbose = False
        
    def discover_tests(self, feature_filter: Optional[str] = None, type_filter: Optional[TestType] = None) -> List[Dict[str, Any]]:
        """Discover all test files and methods"""
        tests = []
        
        # Discover feature tests
        features_dir = self.framework_root / "features"
        if features_dir.exists():
            for feature_dir in features_dir.iterdir():
                if not feature_dir.is_dir() or feature_dir.name.startswith('_'):
                    continue
                    
                feature_name = feature_dir.name
                if feature_filter and feature_name != feature_filter:
                    continue
                
                # Find test files in this feature
                for test_file in feature_dir.glob("test_*.py"):
                    test_type = self._determine_test_type(test_file.name)
                    if type_filter and test_type != type_filter:
                        continue
                        
                    tests.append({
                        'file': test_file,
                        'feature': feature_name,
                        'type': test_type,
                        'module_name': f"features.{feature_name}.{test_file.stem}"
                    })
        
        # Discover integration tests
        integration_dir = self.framework_root / "integration"
        if integration_dir.exists() and (not type_filter or type_filter == TestType.INTEGRATION):
            for test_file in integration_dir.glob("test_*.py"):
                tests.append({
                    'file': test_file,
                    'feature': 'integration',
                    'type': TestType.INTEGRATION,
                    'module_name': f"integration.{test_file.stem}"
                })
        
        # Discover E2E tests
        e2e_dir = self.framework_root / "e2e"
        if e2e_dir.exists() and (not type_filter or type_filter == TestType.E2E):
            for test_file in e2e_dir.glob("test_*.py"):
                tests.append({
                    'file': test_file,
                    'feature': 'e2e',
                    'type': TestType.E2E,
                    'module_name': f"e2e.{test_file.stem}"
                })
        
        return tests
    
    def _determine_test_type(self, filename: str) -> TestType:
        """Determine test type from filename"""
        filename_lower = filename.lower()
        if 'unit' in filename_lower:
            return TestType.UNIT
        elif 'integration' in filename_lower:
            return TestType.INTEGRATION
        elif 'api' in filename_lower:
            return TestType.API
        elif 'e2e' in filename_lower or 'end_to_end' in filename_lower:
            return TestType.E2E
        elif 'performance' in filename_lower or 'load' in filename_lower:
            return TestType.PERFORMANCE
        else:
            return TestType.UNIT  # Default
    
    async def run_test_file(self, test_info: Dict[str, Any]) -> List[TestResult]:
        """Run all tests in a single test file"""
        results = []
        
        try:
            # Import the test module
            spec = importlib.util.spec_from_file_location(
                test_info['module_name'], 
                test_info['file']
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find test classes and functions
            test_methods = []
            
            # Look for test functions (functions starting with 'test_')
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if callable(attr) and attr_name.startswith('test_'):
                    test_methods.append(('function', attr_name, attr))
            
            # Look for test classes (classes with test methods)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, type) and attr_name.startswith('Test'):
                    instance = attr()
                    for method_name in dir(instance):
                        if method_name.startswith('test_'):
                            method = getattr(instance, method_name)
                            test_methods.append(('method', f"{attr_name}.{method_name}", method))
            
            # Run each test
            for test_kind, test_name, test_func in test_methods:
                result = await self._run_single_test(
                    test_name, 
                    test_func, 
                    test_info['feature'], 
                    test_info['type']
                )
                results.append(result)
                
        except Exception as e:
            # If we can't even import the module, create an error result
            result = TestResult(
                name=f"Import {test_info['file'].name}",
                feature=test_info['feature'],
                test_type=test_info['type'],
                status=TestStatus.ERROR,
                duration=0.0,
                error_message=str(e),
                details=traceback.format_exc()
            )
            results.append(result)
        
        return results
    
    async def _run_single_test(self, test_name: str, test_func, feature: str, test_type: TestType) -> TestResult:
        """Run a single test method"""
        start_time = time.time()
        
        try:
            if self.verbose:
                print(f"    Running {test_name}...")
            
            # Check if it's an async function
            if asyncio.iscoroutinefunction(test_func):
                await test_func()
            else:
                test_func()
                
            duration = time.time() - start_time
            
            return TestResult(
                name=test_name,
                feature=feature,
                test_type=test_type,
                status=TestStatus.PASSED,
                duration=duration
            )
            
        except AssertionError as e:
            duration = time.time() - start_time
            return TestResult(
                name=test_name,
                feature=feature,
                test_type=test_type,
                status=TestStatus.FAILED,
                duration=duration,
                error_message=str(e),
                details=traceback.format_exc()
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                name=test_name,
                feature=feature,
                test_type=test_type,
                status=TestStatus.ERROR,
                duration=duration,
                error_message=str(e),
                details=traceback.format_exc()
            )
    
    async def run_all_tests(self, feature_filter: Optional[str] = None, type_filter: Optional[TestType] = None):
        """Run all discovered tests"""
        print("🚀 Solo Developer Testing Framework")
        print("=" * 50)
        
        # Discover tests
        tests = self.discover_tests(feature_filter, type_filter)
        
        if not tests:
            print("No tests found!")
            if feature_filter:
                print(f"Feature filter: {feature_filter}")
            if type_filter:
                print(f"Type filter: {type_filter.value}")
            return
        
        print(f"Found {len(tests)} test files")
        if feature_filter:
            print(f"Feature filter: {feature_filter}")
        if type_filter:
            print(f"Type filter: {type_filter.value}")
        print()
        
        # Run tests by feature
        features = {}
        for test in tests:
            feature = test['feature']
            if feature not in features:
                features[feature] = []
            features[feature].append(test)
        
        for feature_name, feature_tests in features.items():
            print(f"📁 Testing feature: {feature_name}")
            print("-" * 30)
            
            for test_info in feature_tests:
                test_file_name = test_info['file'].name
                test_type = test_info['type'].value
                
                print(f"  🧪 {test_file_name} ({test_type})")
                
                results = await self.run_test_file(test_info)
                self.results.extend(results)
                
                # Print results for this file
                for result in results:
                    status_symbol = result.status.value
                    duration_str = f"{result.duration:.3f}s"
                    print(f"    {status_symbol} {result.name} ({duration_str})")
                    
                    if result.status in [TestStatus.FAILED, TestStatus.ERROR] and self.verbose:
                        print(f"      Error: {result.error_message}")
            
            print()
    
    def print_summary(self):
        """Print test summary"""
        if not self.results:
            return
        
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        # Count by status
        passed = len([r for r in self.results if r.status == TestStatus.PASSED])
        failed = len([r for r in self.results if r.status == TestStatus.FAILED])
        errors = len([r for r in self.results if r.status == TestStatus.ERROR])
        skipped = len([r for r in self.results if r.status == TestStatus.SKIPPED])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"💥 Errors: {errors}")
        print(f"⏭️ Skipped: {skipped}")
        
        # Calculate success rate
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Total duration
        total_duration = sum(r.duration for r in self.results)
        print(f"⏱️ Total Duration: {total_duration:.3f}s")
        
        # Feature breakdown
        print("\n📁 By Feature:")
        features = {}
        for result in self.results:
            feature = result.feature
            if feature not in features:
                features[feature] = {'passed': 0, 'failed': 0, 'errors': 0, 'skipped': 0}
            
            if result.status == TestStatus.PASSED:
                features[feature]['passed'] += 1
            elif result.status == TestStatus.FAILED:
                features[feature]['failed'] += 1
            elif result.status == TestStatus.ERROR:
                features[feature]['errors'] += 1
            elif result.status == TestStatus.SKIPPED:
                features[feature]['skipped'] += 1
        
        for feature, counts in features.items():
            total_feature = sum(counts.values())
            passed_feature = counts['passed']
            rate = (passed_feature / total_feature * 100) if total_feature > 0 else 0
            print(f"  {feature}: {passed_feature}/{total_feature} ({rate:.1f}%)")
        
        # Print failed tests
        failed_tests = [r for r in self.results if r.status in [TestStatus.FAILED, TestStatus.ERROR]]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for result in failed_tests:
                print(f"  {result.status.value} {result.feature}.{result.name}")
                if result.error_message:
                    print(f"    {result.error_message}")
        
        print()
        if failed + errors == 0:
            print("🎉 ALL TESTS PASSED! Great job!")
        else:
            print(f"⚠️ {failed + errors} tests need attention")
    
    def save_report(self, format: str = "json"):
        """Save test report to file"""
        reports_dir = self.framework_root / "reports"
        reports_dir.mkdir(exist_ok=True)
        
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        
        if format == "json":
            report_file = reports_dir / f"test_report_{timestamp}.json"
            
            report_data = {
                'timestamp': timestamp,
                'summary': {
                    'total': len(self.results),
                    'passed': len([r for r in self.results if r.status == TestStatus.PASSED]),
                    'failed': len([r for r in self.results if r.status == TestStatus.FAILED]),
                    'errors': len([r for r in self.results if r.status == TestStatus.ERROR]),
                    'skipped': len([r for r in self.results if r.status == TestStatus.SKIPPED]),
                    'duration': sum(r.duration for r in self.results)
                },
                'results': [
                    {
                        'name': r.name,
                        'feature': r.feature,
                        'type': r.test_type.value,
                        'status': r.status.name,
                        'duration': r.duration,
                        'error': r.error_message,
                        'details': r.details
                    }
                    for r in self.results
                ]
            }
            
            with open(report_file, 'w') as f:
                json.dump(report_data, f, indent=2)
            
            print(f"📄 Report saved to: {report_file}")
    
    def create_feature_template(self, feature_name: str):
        """Create template files for a new feature"""
        feature_dir = self.framework_root / "features" / feature_name
        feature_dir.mkdir(parents=True, exist_ok=True)
        
        # Create __init__.py
        (feature_dir / "__init__.py").write_text("")
        
        # Create test_unit.py
        unit_test_template = f'''"""
Unit tests for {feature_name} feature
"""
import unittest
from unittest.mock import Mock, patch
import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)


class Test{feature_name.title()}Unit(unittest.TestCase):
    """Unit tests for {feature_name} core functionality"""
    
    def setUp(self):
        """Set up test fixtures before each test"""
        pass
    
    def tearDown(self):
        """Clean up after each test"""
        pass
    
    def test_{feature_name}_placeholder(self):
        """Test basic {feature_name} functionality"""
        # TODO: Replace with actual test
        self.assertTrue(True)
    
    # Add more unit tests here as you develop the feature


# Async test functions (if needed)
async def test_{feature_name}_async_placeholder():
    """Test async {feature_name} functionality"""
    # TODO: Replace with actual async test
    assert True
'''
        (feature_dir / "test_unit.py").write_text(unit_test_template)
        
        # Create test_api.py
        api_test_template = f'''"""
API tests for {feature_name} feature
"""
import asyncio
import aiohttp
import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)


class Test{feature_name.title()}API:
    """API tests for {feature_name} endpoints"""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.auth_token = None
    
    async def setup(self):
        """Set up test fixtures"""
        # TODO: Add setup logic (get auth token, etc.)
        pass
    
    async def teardown(self):
        """Clean up after tests"""
        # TODO: Add cleanup logic
        pass


async def test_{feature_name}_api_placeholder():
    """Test {feature_name} API endpoints"""
    test_instance = Test{feature_name.title()}API()
    await test_instance.setup()
    
    try:
        # TODO: Replace with actual API test
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{{test_instance.base_url}}/health") as response:
                assert response.status == 200
    finally:
        await test_instance.teardown()


# Add more API tests here
'''
        (feature_dir / "test_api.py").write_text(api_test_template)
        
        # Create test_integration.py
        integration_test_template = f'''"""
Integration tests for {feature_name} feature
"""
import asyncio
import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, project_root)


async def test_{feature_name}_integration_placeholder():
    """Test {feature_name} integration with other features"""
    # TODO: Replace with actual integration test
    # Test how this feature interacts with:
    # - Database
    # - Other features
    # - External services
    assert True


# Add more integration tests here
'''
        (feature_dir / "test_integration.py").write_text(integration_test_template)
        
        # Create fixtures.py
        fixtures_template = f'''"""
Test fixtures for {feature_name} feature
"""
import asyncio
from typing import Dict, Any


class {feature_name.title()}Fixtures:
    """Shared test fixtures for {feature_name} tests"""
    
    @staticmethod
    def get_sample_{feature_name}_data() -> Dict[str, Any]:
        """Get sample data for testing"""
        return {{
            "id": "test-{feature_name}-id",
            "name": "Test {feature_name.title()}",
            # TODO: Add relevant test data
        }}
    
    @staticmethod
    async def create_test_{feature_name}():
        """Create a test {feature_name} instance"""
        # TODO: Implement test data creation
        pass
    
    @staticmethod
    async def cleanup_test_{feature_name}(test_id: str):
        """Clean up test {feature_name} instance"""
        # TODO: Implement test data cleanup
        pass


# Convenience functions
def get_test_{feature_name}_data():
    return {feature_name.title()}Fixtures.get_sample_{feature_name}_data()
'''
        (feature_dir / "fixtures.py").write_text(fixtures_template)
        
        print(f"✅ Created feature test template: {feature_name}")
        print(f"📁 Location: {feature_dir}")
        print(f"📝 Files created:")
        print(f"  - test_unit.py")
        print(f"  - test_api.py") 
        print(f"  - test_integration.py")
        print(f"  - fixtures.py")
        print()
        print(f"💡 Next steps:")
        print(f"  1. Edit the test files to add your actual tests")
        print(f"  2. Run tests: python test_runner.py --feature {feature_name}")
        print(f"  3. Add tests as you develop your feature")


def main():
    parser = argparse.ArgumentParser(description="Solo Developer Testing Framework")
    parser.add_argument("--feature", help="Run tests for specific feature")
    parser.add_argument("--type", choices=[t.value for t in TestType], help="Run specific type of tests")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--coverage", action="store_true", help="Generate coverage report")
    parser.add_argument("--report", choices=["json"], help="Save test report")
    parser.add_argument("--create-feature", help="Create test template for new feature")
    
    args = parser.parse_args()
    
    runner = TestRunner()
    runner.verbose = args.verbose
    
    if args.create_feature:
        runner.create_feature_template(args.create_feature)
        return
    
    # Convert type filter
    type_filter = None
    if args.type:
        type_filter = TestType(args.type)
    
    # Run tests
    asyncio.run(runner.run_all_tests(args.feature, type_filter))
    
    # Print summary
    runner.print_summary()
    
    # Save report if requested
    if args.report:
        runner.save_report(args.report)
    
    # Exit with error code if tests failed
    failed_count = len([r for r in runner.results if r.status in [TestStatus.FAILED, TestStatus.ERROR]])
    sys.exit(1 if failed_count > 0 else 0)


if __name__ == "__main__":
    main()