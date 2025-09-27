"""
Model Configuration
Standalone configuration without database dependencies
"""

import os
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class ModelConfig:
    """Configuration for the deepfake detection model"""
    
    # Model paths
    model_path: str = "models/deepfake_detector.h5"
    model_version: str = "v1.0"
    
    # Input specifications
    image_size: tuple = (224, 224)
    max_video_frames: int = 30
    supported_image_formats: List[str] = None
    supported_video_formats: List[str] = None
    
    # Processing parameters
    confidence_threshold_fake: float = 0.7
    confidence_threshold_real: float = 0.3
    batch_size: int = 32
    
    # File size limits (in MB)
    max_image_size_mb: int = 10
    max_video_size_mb: int = 100
    
    def __post_init__(self):
        if self.supported_image_formats is None:
            self.supported_image_formats = ['.jpg', '.jpeg', '.png', '.bmp']
        
        if self.supported_video_formats is None:
            self.supported_video_formats = ['.mp4', '.avi', '.mov', '.mkv']
    
    @property
    def model_full_path(self) -> Path:
        """Get the full path to the model file"""
        return Path(__file__).parent.parent / self.model_path
    
    def is_supported_image_format(self, file_path: str) -> bool:
        """Check if the image format is supported"""
        return Path(file_path).suffix.lower() in self.supported_image_formats
    
    def is_supported_video_format(self, file_path: str) -> bool:
        """Check if the video format is supported"""
        return Path(file_path).suffix.lower() in self.supported_video_formats
    
    def validate_file_size(self, file_path: str, is_video: bool = False) -> bool:
        """Validate file size against limits"""
        if not os.path.exists(file_path):
            return False
        
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        max_size = self.max_video_size_mb if is_video else self.max_image_size_mb
        
        return file_size_mb <= max_size

# Default configuration instance
default_config = ModelConfig()
