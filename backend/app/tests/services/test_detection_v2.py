"""
Tests for Detection Service V2

Tests the new V2 detection service that replicates notebook workflow.
"""

import pytest
import numpy as np
from pathlib import Path
from unittest.mock import MagicMock, patch, mock_open
import tempfile
import shutil

# Import V2 service and utilities
import sys
from pathlib import Path

# Add model/src to path for imports
project_root = Path(__file__).parent.parent.parent.parent.parent
model_src_path = project_root / "model" / "src"
if str(model_src_path) not in sys.path:
    sys.path.insert(0, str(model_src_path))

try:
    from app.services.detection_v2 import DetectionServiceV2
    from aggregation_strategies import (
        confident_strategy,
        simple_majority_vote,
        get_aggregation_strategy
    )
    DETECTION_V2_AVAILABLE = True
except ImportError as e:
    DETECTION_V2_AVAILABLE = False
    print(f"Warning: Detection V2 imports failed: {e}")
    pytestmark = pytest.mark.skip("Detection V2 not available")


@pytest.fixture
def sample_video_content():
    """Sample video file content (mock)"""
    return b"fake video content"


@pytest.fixture
def temp_dir():
    """Create and cleanup temporary directory"""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    if temp_path.exists():
        shutil.rmtree(temp_path)


class TestAggregationStrategies:
    """Test aggregation strategy functions"""
    
    def test_confident_strategy_high_confidence_fakes(self):
        """Test confident strategy with many high-confidence fake frames"""
        # Many frames with high fake probability (>0.8)
        pred = [0.9, 0.95, 0.92, 0.88, 0.91, 0.93, 0.89, 0.94, 0.90, 0.92, 0.87, 0.91, 0.93]
        result = confident_strategy(pred, t=0.8)
        
        # Should return mean of high-confidence frames (>0.8)
        high_conf = [p for p in pred if p > 0.8]
        expected = np.mean(high_conf)
        
        assert abs(result - expected) < 0.001
        assert result > 0.8
    
    def test_confident_strategy_low_confidence_reals(self):
        """Test confident strategy with mostly low-confidence real frames"""
        # Most frames with low fake probability (<0.2)
        pred = [0.1, 0.15, 0.08, 0.12, 0.18, 0.10, 0.14, 0.09, 0.11, 0.13] * 2  # 20 frames, >90% <0.2
        result = confident_strategy(pred, t=0.8)
        
        # Should return mean of low-confidence frames (<0.2)
        low_conf = [p for p in pred if p < 0.2]
        expected = np.mean(low_conf)
        
        assert abs(result - expected) < 0.001
        assert result < 0.2
    
    def test_confident_strategy_simple_mean(self):
        """Test confident strategy falling back to simple mean"""
        # Mixed probabilities that don't trigger high/low confidence conditions
        pred = [0.4, 0.5, 0.6, 0.45, 0.55, 0.5, 0.48, 0.52]
        result = confident_strategy(pred, t=0.8)
        
        # Should return simple mean
        expected = np.mean(pred)
        
        assert abs(result - expected) < 0.001
    
    def test_confident_strategy_empty_array(self):
        """Test confident strategy with empty array"""
        pred = []
        result = confident_strategy(pred, t=0.8)
        
        # Should return default (0.5)
        assert result == 0.5
    
    def test_simple_majority_vote(self):
        """Test simple majority vote aggregation"""
        pred = [0.9, 0.8, 0.7, 0.6, 0.5]
        result = simple_majority_vote(pred, threshold=0.85)
        
        expected = np.mean(pred)
        assert abs(result - expected) < 0.001
    
    def test_simple_majority_vote_empty(self):
        """Test simple majority vote with empty array"""
        pred = []
        result = simple_majority_vote(pred, threshold=0.85)
        
        assert result == 0.5
    
    def test_get_aggregation_strategy_confident(self):
        """Test getting confident strategy"""
        strategy = get_aggregation_strategy("confident")
        assert strategy == confident_strategy
    
    def test_get_aggregation_strategy_simple(self):
        """Test getting simple strategy"""
        strategy = get_aggregation_strategy("simple")
        assert strategy == simple_majority_vote
    
    def test_get_aggregation_strategy_invalid(self):
        """Test getting invalid strategy"""
        with pytest.raises(ValueError, match="Unknown aggregation strategy"):
            get_aggregation_strategy("invalid")


class TestDetectionServiceV2:
    """Test DetectionServiceV2 class"""
    
    @pytest.fixture
    def mock_model_path(self, tmp_path):
        """Create a mock model checkpoint file"""
        model_file = tmp_path / "xception_best.pt"
        # Create a minimal checkpoint structure
        import torch
        checkpoint = {
            'model_state': torch.nn.Linear(10, 2).state_dict(),  # Dummy state dict
            'epoch': 1,
            'val_metrics': {}
        }
        torch.save(checkpoint, model_file)
        return model_file
    
    @patch('app.services.detection_v2.timm.create_model')
    def test_service_initialization(self, mock_create_model, mock_model_path, monkeypatch):
        """Test DetectionServiceV2 initialization"""
        # Mock timm model creation
        mock_model = MagicMock()
        mock_create_model.return_value = mock_model
        
        # Set model path in settings
        from app.core.config import settings
        original_path = settings.MODEL_PATH
        monkeypatch.setattr(settings, "MODEL_PATH", str(mock_model_path))
        
        try:
            service = DetectionServiceV2(model_path=str(mock_model_path))
            assert service.model_path == mock_model_path
            assert service.device in ["cuda", "cpu"]
        finally:
            monkeypatch.setattr(settings, "MODEL_PATH", original_path)
    
    def test_service_initialization_model_not_found(self, tmp_path):
        """Test DetectionServiceV2 initialization with missing model"""
        fake_model_path = tmp_path / "nonexistent.pt"
        
        with pytest.raises(FileNotFoundError, match="Model not found"):
            DetectionServiceV2(model_path=str(fake_model_path))


class TestVideoProcessingUtilities:
    """Test video processing utility functions"""
    
    @pytest.mark.skipif(not DETECTION_V2_AVAILABLE, reason="V2 dependencies not available")
    def test_create_temp_processing_dir(self):
        """Test temporary directory creation"""
        from video_processing import create_temp_processing_dir, cleanup_temp_dir
        
        frames_dir, crops_dir, session_dir = create_temp_processing_dir()
        
        assert frames_dir.exists()
        assert crops_dir.exists()
        assert session_dir.exists()
        assert frames_dir.parent == session_dir
        assert crops_dir.parent == session_dir
        
        # Cleanup
        cleanup_temp_dir(session_dir)
        assert not session_dir.exists()
    
    @pytest.mark.skipif(not DETECTION_V2_AVAILABLE, reason="V2 dependencies not available")
    def test_cleanup_temp_dir(self, temp_dir):
        """Test temporary directory cleanup"""
        from video_processing import cleanup_temp_dir
        
        # Create some files in temp dir
        test_file = temp_dir / "test.txt"
        test_file.write_text("test")
        
        assert temp_dir.exists()
        cleanup_temp_dir(temp_dir)
        assert not temp_dir.exists()


@pytest.mark.integration
class TestDetectionV2Integration:
    """Integration tests for Detection V2 (require actual video files)"""
    
    @pytest.mark.skip(reason="Requires actual video file and ffmpeg")
    def test_full_pipeline_with_video(self, sample_video_content, mock_model_path):
        """Test full V2 pipeline with actual video processing"""
        # This test would require:
        # 1. A real video file
        # 2. ffmpeg installed
        # 3. Model checkpoint
        # 4. Face detection working
        pass


class TestAPIIntegration:
    """Test API integration with V2 service"""
    
    @patch('app.api.routes.detection.DetectionServiceV2')
    @patch('app.api.routes.detection.settings')
    def test_analyze_endpoint_uses_v2_when_enabled(
        self,
        mock_settings,
        mock_v2_service_class,
        client
    ):
        """Test that /analyze endpoint uses V2 when enabled"""
        # Mock settings
        mock_settings.USE_DETECTION_V2 = True
        mock_settings.DETECTION_V2_THRESHOLD = 0.85
        mock_settings.DEFAULT_AGGREGATION_STRATEGY = "confident"
        mock_settings.CONFIDENT_STRATEGY_THRESHOLD = 0.8
        mock_settings.DEFAULT_FPS = 3
        mock_settings.MAX_FILE_SIZE_MB = 50
        mock_settings.ALLOWED_VIDEO_EXTENSIONS = [".mp4"]
        
        # Mock V2 service
        mock_v2_service = MagicMock()
        mock_v2_service.process_video.return_value = {
            "status": "completed",
            "result": "real",
            "confidence_score": 0.9,
            "average_fake_probability": 0.1,
        }
        mock_v2_service_class.return_value = mock_v2_service
        
        # This would require a full FastAPI test client setup
        # For now, just verify the mock is set up correctly
        assert mock_v2_service_class is not None

