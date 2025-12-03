"""
Video Processing Utilities for Deepfake Detection V2

This module handles:
- Frame extraction from videos using ffmpeg
- Face detection and cropping from frames
- Batch preprocessing of face crops for model inference
"""

import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
import logging

import cv2
import numpy as np
from PIL import Image

# Try to import MediaPipe (optional - for Python 3.12 and below)
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    mp = None

logger = logging.getLogger(__name__)


class FaceDetector:
    """Face detection using MediaPipe or OpenCV fallback"""
    
    def __init__(self):
        self.use_mediapipe = MEDIAPIPE_AVAILABLE
        self.face_detector = None
        self.opencv_face_detector = None
        
        if MEDIAPIPE_AVAILABLE:
            self.mp_face_detection = mp.solutions.face_detection
            self.face_detector = self.mp_face_detection.FaceDetection(
                model_selection=1,
                min_detection_confidence=0.5
            )
            logger.info("Using MediaPipe for face detection")
        else:
            self._init_opencv_face_detector()
            logger.info("Using OpenCV for face detection (MediaPipe not available)")
    
    def _init_opencv_face_detector(self):
        """Initialize OpenCV DNN face detector or fallback to Haar Cascade"""
        self.use_haar_cascade = False
        
        try:
            # Try to use OpenCV DNN face detector
            prototxt_path = None
            model_path = None
            
            # Check common locations
            for base_path in [Path(__file__).parent, Path.home() / ".opencv_dnn"]:
                prototxt_file = base_path / "opencv_face_detector.pbtxt"
                model_file = base_path / "opencv_face_detector_uint8.pb"
                
                if prototxt_file.exists() and model_file.exists():
                    prototxt_path = str(prototxt_file)
                    model_path = str(model_file)
                    break
            
            if prototxt_path and model_path:
                self.opencv_face_detector = cv2.dnn.readNetFromTensorflow(model_path, prototxt_path)
                self.use_haar_cascade = False
                logger.info(f"Loaded OpenCV DNN face detector from {model_path}")
            else:
                # Fall back to Haar Cascade
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                if os.path.exists(cascade_path):
                    self.opencv_face_detector = cv2.CascadeClassifier(cascade_path)
                    self.use_haar_cascade = True
                    logger.info(f"Using Haar Cascade face detector from {cascade_path}")
                else:
                    raise FileNotFoundError("Could not find face detection model files")
        except Exception as e:
            logger.warning(f"Could not initialize OpenCV DNN face detector: {e}")
            # Final fallback to Haar Cascade
            try:
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                self.opencv_face_detector = cv2.CascadeClassifier(cascade_path)
                self.use_haar_cascade = True
                logger.info("Using Haar Cascade face detector (fallback)")
            except Exception as e2:
                raise RuntimeError(f"Could not initialize any face detector: {e2}")
    
    def detect_largest_face(self, img: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect the largest face in the image.
        
        Args:
            img: Image as numpy array (BGR format)
            
        Returns:
            Tuple of (x1, y1, x2, y2) bounding box coordinates, or None if no face found
        """
        if self.use_mediapipe and self.face_detector is not None:
            return self._detect_mediapipe(img)
        else:
            return self._detect_opencv(img)
    
    def _detect_mediapipe(self, img: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect face using MediaPipe"""
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = self.face_detector.process(img_rgb)
        
        if not results.detections:
            return None
        
        largest_face = None
        largest_area = 0
        
        for detection in results.detections:
            bbox = detection.location_data.relative_bounding_box
            ih, iw, _ = img.shape
            x = int(bbox.xmin * iw)
            y = int(bbox.ymin * ih)
            w = int(bbox.width * iw)
            h = int(bbox.height * ih)
            
            area = w * h
            if area > largest_area:
                largest_area = area
                largest_face = (x, y, x + w, y + h)
        
        return largest_face
    
    def _detect_opencv(self, img: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect face using OpenCV (DNN or Haar Cascade)"""
        h, w = img.shape[:2]
        largest_face = None
        largest_area = 0
        
        if self.use_haar_cascade:
            # Use Haar Cascade
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.opencv_face_detector.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            for (x, y, face_w, face_h) in faces:
                area = face_w * face_h
                if area > largest_area:
                    largest_area = area
                    largest_face = (x, y, x + face_w, y + face_h)
        else:
            # Use DNN face detector
            blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 1.0, (300, 300), [104, 117, 123])
            self.opencv_face_detector.setInput(blob)
            detections = self.opencv_face_detector.forward()
            
            confidence_threshold = 0.5
            
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > confidence_threshold:
                    x1 = int(detections[0, 0, i, 3] * w)
                    y1 = int(detections[0, 0, i, 4] * h)
                    x2 = int(detections[0, 0, i, 5] * w)
                    y2 = int(detections[0, 0, i, 6] * h)
                    
                    area = (x2 - x1) * (y2 - y1)
                    if area > largest_area:
                        largest_area = area
                        largest_face = (x1, y1, x2, y2)
        
        return largest_face


def extract_frames_from_video(
    video_path: str,
    output_dir: Path,
    fps: int = 3,
    video_name: Optional[str] = None
) -> List[Path]:
    """
    Extract frames from video using ffmpeg.
    
    Args:
        video_path: Path to input video file
        output_dir: Directory to save extracted frames
        fps: Frames per second to extract (default: 3)
        video_name: Optional video name for frame naming (default: use video filename)
    
    Returns:
        List of paths to extracted frame files (PNG format)
    
    Raises:
        FileNotFoundError: If video file doesn't exist
        subprocess.CalledProcessError: If ffmpeg command fails
        RuntimeError: If ffmpeg is not installed
    """
    video_path = Path(video_path)
    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")
    
    # Create output directory
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Determine video name for frame naming
    if video_name is None:
        video_name = video_path.stem
    
    # Frame output pattern
    frame_pattern = output_dir / f"{video_name}_%04d.png"
    
    # Check if ffmpeg is available
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError(
            "ffmpeg is not installed or not in PATH. "
            "Please install ffmpeg to use frame extraction."
        )
    
    # Build ffmpeg command
    # -i: input video
    # -vf fps=3: extract 3 frames per second
    # -y: overwrite output files
    cmd = [
        'ffmpeg',
        '-i', str(video_path),
        '-vf', f'fps={fps}',
        '-y',  # Overwrite existing files
        str(frame_pattern)
    ]
    
    logger.info(f"Extracting frames from {video_path} at {fps} fps")
    logger.debug(f"FFmpeg command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        logger.info(f"Frame extraction completed. Output: {output_dir}")
    except subprocess.CalledProcessError as e:
        error_msg = f"FFmpeg failed: {e.stderr}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    # Collect extracted frame files
    frame_files = sorted(output_dir.glob(f"{video_name}_*.png"))
    
    if not frame_files:
        raise RuntimeError(f"No frames were extracted from {video_path}")
    
    logger.info(f"Extracted {len(frame_files)} frames")
    return frame_files


def enlarge_box(x1: int, y1: int, x2: int, y2: int, scale: float, W: int, H: int) -> Tuple[int, int, int, int]:
    """
    Enlarge bounding box by scale factor.
    
    Args:
        x1, y1, x2, y2: Bounding box coordinates
        scale: Scale factor (e.g., 1.3 for 30% enlargement)
        W, H: Image width and height
    
    Returns:
        Enlarged bounding box coordinates (x1, y1, x2, y2)
    """
    cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
    w, h = (x2 - x1) * scale, (y2 - y1) * scale
    nx1 = max(0, int(cx - w / 2))
    ny1 = max(0, int(cy - h / 2))
    nx2 = min(W - 1, int(cx + w / 2))
    ny2 = min(H - 1, int(cy + h / 2))
    return nx1, ny1, nx2, ny2


def crop_faces_from_frames(
    frame_files: List[Path],
    output_dir: Path,
    enlarge_scale: float = 1.3,
    jpeg_quality: int = 95,
    video_name: Optional[str] = None
) -> List[Path]:
    """
    Crop faces from frames and save as 299x299 JPG files.
    
    Args:
        frame_files: List of paths to frame image files
        output_dir: Directory to save face crops
        enlarge_scale: Scale factor to enlarge bounding box (default: 1.3)
        jpeg_quality: JPEG quality for saved images (default: 95)
        video_name: Optional video name for crop naming
    
    Returns:
        List of paths to saved face crop files (JPG format)
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    face_detector = FaceDetector()
    crop_files = []
    skipped_frames = 0
    
    for frame_file in frame_files:
        # Load frame
        img = cv2.imread(str(frame_file))
        if img is None:
            logger.warning(f"Could not read frame: {frame_file}")
            skipped_frames += 1
            continue
        
        H, W = img.shape[:2]
        
        # Detect face
        face_box = face_detector.detect_largest_face(img)
        if face_box is None:
            logger.debug(f"No face detected in frame: {frame_file}")
            skipped_frames += 1
            continue
        
        x1, y1, x2, y2 = face_box
        
        # Enlarge bounding box
        x1, y1, x2, y2 = enlarge_box(x1, y1, x2, y2, enlarge_scale, W, H)
        
        # Crop face
        face_crop = img[y1:y2, x1:x2]
        
        # Resize to 299x299
        face_crop = cv2.resize(face_crop, (299, 299), interpolation=cv2.INTER_AREA)
        
        # Determine output filename
        if video_name is None:
            video_name = frame_file.stem.rsplit('_', 1)[0]
        frame_number = frame_file.stem.rsplit('_', 1)[-1]
        crop_filename = f"{video_name}_{frame_number}.jpg"
        crop_path = output_dir / crop_filename
        
        # Save as JPG
        cv2.imwrite(
            str(crop_path),
            face_crop,
            [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
        )
        
        crop_files.append(crop_path)
    
    if skipped_frames > 0:
        logger.warning(f"Skipped {skipped_frames} frames (no face detected or read error)")
    
    logger.info(f"Cropped {len(crop_files)} faces from {len(frame_files)} frames")
    return crop_files


def create_temp_processing_dir(base_temp_dir: Optional[Path] = None) -> Tuple[Path, Path]:
    """
    Create temporary directory structure for video processing.
    
    Args:
        base_temp_dir: Base directory for temp files (None = system temp)
    
    Returns:
        Tuple of (frames_dir, crops_dir) paths
    """
    if base_temp_dir is None:
        temp_base = Path(tempfile.gettempdir()) / "deepfake_detection"
    else:
        temp_base = Path(base_temp_dir)
    
    # Create unique subdirectory for this processing session
    import uuid
    session_id = str(uuid.uuid4())
    session_dir = temp_base / session_id
    
    frames_dir = session_dir / "frames"
    crops_dir = session_dir / "crops"
    
    frames_dir.mkdir(parents=True, exist_ok=True)
    crops_dir.mkdir(parents=True, exist_ok=True)
    
    return frames_dir, crops_dir, session_dir


def cleanup_temp_dir(temp_dir: Path):
    """
    Clean up temporary directory and all its contents.
    
    Args:
        temp_dir: Path to temporary directory to remove
    """
    try:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            logger.info(f"Cleaned up temporary directory: {temp_dir}")
    except Exception as e:
        logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")

