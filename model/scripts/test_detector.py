"""
Standalone testing script for the deepfake detector
No backend or database dependencies
"""

import sys
import argparse
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent / "src"))

from detector import create_detector, MediaType
from config.model_config import default_config

def test_single_file(detector, file_path: str, media_type: MediaType):
    """Test detection on a single file"""
    print(f"\nTesting {media_type.value}: {file_path}")
    print("-" * 50)
    
    try:
        result = detector.detect(file_path, media_type)
        
        print(f"Result: {result.result.value}")
        print(f"Confidence: {result.confidence_score:.4f}")
        print(f"Processing time: {result.processing_time_seconds:.4f}s")
        print(f"Model version: {result.model_version}")
        print(f"Metadata: {result.metadata}")
        
        return result
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_directory(detector, directory: str, media_type: MediaType):
    """Test detection on all files in a directory"""
    directory_path = Path(directory)
    
    if not directory_path.exists():
        print(f"Directory not found: {directory}")
        return
    
    # Get file extensions based on media type
    if media_type == MediaType.IMAGE:
        extensions = default_config.supported_image_formats
    else:
        extensions = default_config.supported_video_formats
    
    # Find all supported files
    files = []
    for ext in extensions:
        files.extend(directory_path.glob(f"*{ext}"))
    
    if not files:
        print(f"No {media_type.value} files found in {directory}")
        return
    
    print(f"Found {len(files)} {media_type.value} files")
    
    results = []
    for file_path in files:
        result = test_single_file(detector, str(file_path), media_type)
        if result:
            results.append(result)
    
    # Summary statistics
    if results:
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        
        fake_count = sum(1 for r in results if r.result.value == "fake")
        real_count = sum(1 for r in results if r.result.value == "real")
        uncertain_count = sum(1 for r in results if r.result.value == "uncertain")
        
        avg_confidence = sum(r.confidence_score for r in results) / len(results)
        avg_time = sum(r.processing_time_seconds for r in results) / len(results)
        
        print(f"Total files processed: {len(results)}")
        print(f"Detected as FAKE: {fake_count}")
        print(f"Detected as REAL: {real_count}")
        print(f"Detected as UNCERTAIN: {uncertain_count}")
        print(f"Average confidence: {avg_confidence:.4f}")
        print(f"Average processing time: {avg_time:.4f}s")

def main():
    parser = argparse.ArgumentParser(description='Test deepfake detector')
    parser.add_argument('--model-path', required=True, help='Path to the trained model')
    parser.add_argument('--file', help='Single file to test')
    parser.add_argument('--directory', help='Directory of files to test')
    parser.add_argument('--type', choices=['image', 'video'], required=True, 
                       help='Media type to test')
    parser.add_argument('--model-version', default='v1.0', help='Model version')
    
    args = parser.parse_args()
    
    if not args.file and not args.directory:
        print("Error: Must specify either --file or --directory")
        return
    
    # Create detector
    print(f"Creating detector with model: {args.model_path}")
    detector = create_detector(args.model_path, args.model_version)
    
    # Load model
    if not detector.load_model():
        print("Failed to load model")
        return
    
    media_type = MediaType.IMAGE if args.type == 'image' else MediaType.VIDEO
    
    # Test single file or directory
    if args.file:
        test_single_file(detector, args.file, media_type)
    elif args.directory:
        test_directory(detector, args.directory, media_type)

if __name__ == "__main__":
    main()
