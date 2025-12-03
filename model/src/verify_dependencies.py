"""
Dependency Verification Script for Detection V2

This script verifies that all required dependencies are installed.
"""

import sys
from pathlib import Path

def check_dependency(name: str, import_name: str = None, optional: bool = False):
    """Check if a dependency is available"""
    if import_name is None:
        import_name = name
    
    try:
        __import__(import_name)
        print(f"✓ {name} is installed")
        return True
    except ImportError:
        if optional:
            print(f"⚠ {name} is not installed (optional)")
            return False
        else:
            print(f"✗ {name} is NOT installed (required)")
            return False

def check_ffmpeg():
    """Check if ffmpeg is available"""
    import subprocess
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        print("✓ ffmpeg is installed and available")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ ffmpeg is NOT installed or not in PATH (required)")
        print("  Install: https://ffmpeg.org/download.html")
        return False

def main():
    """Main verification function"""
    print("=" * 60)
    print("Detection V2 Dependency Verification")
    print("=" * 60)
    print()
    
    all_ok = True
    
    # Required dependencies
    print("Required Dependencies:")
    print("-" * 60)
    all_ok &= check_dependency("torch", "torch")
    all_ok &= check_dependency("timm", "timm")
    all_ok &= check_dependency("opencv-python", "cv2")
    all_ok &= check_dependency("PIL", "PIL")
    all_ok &= check_dependency("numpy", "numpy")
    all_ok &= check_ffmpeg()
    print()
    
    # Optional dependencies
    print("Optional Dependencies:")
    print("-" * 60)
    check_dependency("mediapipe", "mediapipe", optional=True)
    print("  (MediaPipe is preferred but OpenCV fallback is available)")
    print()
    
    # Summary
    print("=" * 60)
    if all_ok:
        print("✓ All required dependencies are installed!")
        print("  Detection V2 is ready to use.")
    else:
        print("✗ Some required dependencies are missing.")
        print("  Please install missing dependencies before using Detection V2.")
        sys.exit(1)
    print("=" * 60)

if __name__ == "__main__":
    main()

