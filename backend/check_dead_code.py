#!/usr/bin/env python3
"""
Dead Code Detection Tool for Python Projects

This script uses multiple tools to detect:
- Unused imports, functions, classes, and variables (vulture)
- Unused dependencies (deptry)
- Code quality issues (optional: pyflakes)
"""

import subprocess
import sys
import json
from typing import List
from pathlib import Path
import argparse


class DeadCodeChecker:
    def __init__(self, path: str = ".", verbose: bool = False):
        self.path = Path(path).absolute()
        self.verbose = verbose
        self.results = {
            "vulture": {"found": False, "issues": []},
            "deptry": {"found": False, "issues": []},
            "pyflakes": {"found": False, "issues": []},
        }
        
    def run_command(self, cmd: List[str]) -> tuple[int, str, str]:
        """Run a command and return exit code, stdout, stderr."""
        if self.verbose:
            print(f"Running: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=self.path
            )
            return result.returncode, result.stdout, result.stderr
        except FileNotFoundError:
            return 1, "", f"Command not found: {cmd[0]}"
    
    def check_tool_installed(self, tool: str) -> bool:
        """Check if a tool is installed."""
        exit_code, _, _ = self.run_command([tool, "--version"])
        return exit_code == 0
    
    def run_vulture(self, min_confidence: int = 80):
        """Run vulture to find dead code."""
        print("\n🔍 Running Vulture (Dead Code Detection)...")
        
        if not self.check_tool_installed("vulture"):
            print("❌ Vulture not installed. Install with: pip install vulture")
            return
        
        cmd = [
            "vulture",
            str(self.path),
            "--min-confidence", str(min_confidence),
            "--sort-by-size",
            "--exclude", "*.venv*,*__pycache__*,*.git*,*node_modules*,*dist*,*build*,*.egg-info*"
        ]
        
        exit_code, stdout, stderr = self.run_command(cmd)
        
        if stdout:
            self.results["vulture"]["found"] = True
            # Parse vulture output
            for line in stdout.strip().split('\n'):
                if line and not line.startswith('#'):
                    self.results["vulture"]["issues"].append(line)
            
            print(f"Found {len(self.results['vulture']['issues'])} potential dead code issues")
            if self.verbose:
                for issue in self.results["vulture"]["issues"][:10]:  # Show first 10
                    print(f"  - {issue}")
                if len(self.results["vulture"]["issues"]) > 10:
                    print(f"  ... and {len(self.results['vulture']['issues']) - 10} more")
        else:
            print("✅ No dead code found by Vulture!")
    
    def run_deptry(self):
        """Run deptry to find unused dependencies."""
        print("\n📦 Running Deptry (Dependency Analysis)...")
        
        if not self.check_tool_installed("deptry"):
            print("❌ Deptry not installed. Install with: pip install deptry")
            return
        
        # Check if this is a valid Python project
        project_files = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"]
        if not any((self.path / f).exists() for f in project_files):
            print("⚠️  No Python project files found (pyproject.toml, setup.py, requirements.txt)")
            return
        
        cmd = ["deptry", str(self.path), "--json-output", "deptry_report.json"]
        
        exit_code, stdout, stderr = self.run_command(cmd)
        
        # Read the JSON report if it exists
        report_path = self.path / "deptry_report.json"
        if report_path.exists():
            try:
                with open(report_path, 'r') as f:
                    report = json.load(f)
                
                # Process different types of issues
                issue_types = {
                    "missing": "Missing dependencies",
                    "obsolete": "Unused dependencies",
                    "transitive": "Transitive dependencies",
                    "misplaced_dev": "Misplaced dev dependencies"
                }
                
                total_issues = 0
                for issue_type, description in issue_types.items():
                    if issue_type in report and report[issue_type]:
                        self.results["deptry"]["found"] = True
                        count = len(report[issue_type])
                        total_issues += count
                        
                        issue_summary = f"{description}: {count}"
                        self.results["deptry"]["issues"].append(issue_summary)
                        
                        if self.verbose:
                            print(f"\n  {issue_summary}:")
                            for dep in report[issue_type][:5]:  # Show first 5
                                if isinstance(dep, dict):
                                    print(f"    - {dep.get('dependency', dep)}")
                                else:
                                    print(f"    - {dep}")
                            if len(report[issue_type]) > 5:
                                print(f"    ... and {len(report[issue_type]) - 5} more")
                
                if total_issues == 0:
                    print("✅ No dependency issues found!")
                else:
                    print(f"Found {total_issues} dependency issues")
                    
            except json.JSONDecodeError:
                print("❌ Error reading deptry report")
            finally:
                # Clean up the report file
                if report_path.exists():
                    report_path.unlink()
        else:
            if stderr:
                print(f"❌ Deptry error: {stderr}")
    
    def run_pyflakes(self):
        """Run pyflakes for basic checks."""
        print("\n🔥 Running Pyflakes (Quick Syntax Check)...")
        
        if not self.check_tool_installed("pyflakes"):
            print("❌ Pyflakes not installed. Install with: pip install pyflakes")
            return
        
        # Find all Python files, excluding common directories
        exclude_dirs = {'.venv', 'venv', '__pycache__', '.git', 'node_modules', 'dist', 'build', '.egg-info'}
        python_files = []
        for f in self.path.rglob("*.py"):
            if not any(excluded in f.parts for excluded in exclude_dirs):
                python_files.append(f)
        
        if not python_files:
            print("No Python files found")
            return
        
        cmd = ["pyflakes"] + [str(f) for f in python_files[:100]]  # Limit to 100 files
        
        exit_code, stdout, stderr = self.run_command(cmd)
        
        if stdout:
            self.results["pyflakes"]["found"] = True
            issues = stdout.strip().split('\n')
            self.results["pyflakes"]["issues"] = issues
            
            print(f"Found {len(issues)} syntax/import issues")
            if self.verbose:
                for issue in issues[:10]:  # Show first 10
                    print(f"  - {issue}")
                if len(issues) > 10:
                    print(f"  ... and {len(issues) - 10} more")
        else:
            print("✅ No issues found by Pyflakes!")
    
    def generate_report(self, output_file: str = None):
        """Generate a comprehensive report."""
        print("\n" + "="*60)
        print("📊 DEAD CODE DETECTION SUMMARY")
        print("="*60)
        
        report_lines = []
        
        # Vulture summary
        if self.results["vulture"]["found"]:
            report_lines.append(f"\n🔍 Vulture: {len(self.results['vulture']['issues'])} dead code issues")
            for issue in self.results["vulture"]["issues"][:20]:
                report_lines.append(f"   {issue}")
            if len(self.results["vulture"]["issues"]) > 20:
                report_lines.append(f"   ... and {len(self.results['vulture']['issues']) - 20} more")
        
        # Deptry summary
        if self.results["deptry"]["found"]:
            report_lines.append(f"\n📦 Deptry: Dependency issues found")
            for issue in self.results["deptry"]["issues"]:
                report_lines.append(f"   {issue}")
        
        # Pyflakes summary
        if self.results["pyflakes"]["found"]:
            report_lines.append(f"\n🔥 Pyflakes: {len(self.results['pyflakes']['issues'])} issues")
            for issue in self.results["pyflakes"]["issues"][:10]:
                report_lines.append(f"   {issue}")
            if len(self.results["pyflakes"]["issues"]) > 10:
                report_lines.append(f"   ... and {len(self.results['pyflakes']['issues']) - 10} more")
        
        # Print to console
        if report_lines:
            print("\n".join(report_lines))
        else:
            print("\n✅ No issues found! Your code is clean! 🎉")
        
        # Save to file if requested
        if output_file and report_lines:
            with open(output_file, 'w') as f:
                f.write("DEAD CODE DETECTION REPORT\n")
                f.write("="*60 + "\n")
                f.write(f"Path analyzed: {self.path}\n")
                f.write("="*60 + "\n")
                f.write("\n".join(report_lines))
            print(f"\n📄 Full report saved to: {output_file}")
    
    def run_all_checks(self, min_confidence: int = 80):
        """Run all available checks."""
        self.run_vulture(min_confidence)
        self.run_deptry()
        self.run_pyflakes()
        self.generate_report()


def main():
    parser = argparse.ArgumentParser(
        description="Detect dead code and unused dependencies in Python projects"
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Path to analyze (default: current directory)"
    )
    parser.add_argument(
        "--min-confidence",
        type=int,
        default=80,
        help="Minimum confidence for vulture (default: 80)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output"
    )
    parser.add_argument(
        "--output", "-o",
        help="Save report to file"
    )
    parser.add_argument(
        "--install-tools",
        action="store_true",
        help="Install required tools"
    )
    
    args = parser.parse_args()
    
    if args.install_tools:
        print("Installing required tools...")
        subprocess.run([sys.executable, "-m", "pip", "install", "vulture", "deptry", "pyflakes"])
        print("✅ Tools installed!")
        return
    
    checker = DeadCodeChecker(args.path, args.verbose)
    checker.run_all_checks(args.min_confidence)
    
    if args.output:
        checker.generate_report(args.output)


if __name__ == "__main__":
    main()