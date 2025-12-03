# Deepfake Detection V2 Implementation Plan

## Executive Summary

This document outlines the plan to refactor the existing detection service to match the exact workflow used in the training notebooks. The new implementation will replicate the frame extraction → face cropping → batch prediction pipeline with the DFDC winner's confident strategy for video-level aggregation.

---

## Current State Analysis

### Current Implementation (V1)
- **Location**: `backend/app/services/detection.py` + `model/src/deepfake_detector.py`
- **Workflow**: 
  - Processes video frame-by-frame using OpenCV
  - Face detection and cropping done on-the-fly
  - Simple averaging for video-level prediction
  - Threshold: 0.5
  - No temporary file management for intermediate steps

### Notebook Workflow (Target)
- **Frame Extraction**: Uses `ffmpeg` with `fps=3` to extract frames as PNG files
- **Face Cropping**: Uses MediaPipe (or OpenCV fallback) with 1.3x enlargement, saves as 299x299 JPG
- **Prediction**: Loads all crops for a video, runs batch inference
- **Aggregation**: Uses DFDC winner's "confident strategy" (or simple majority vote)
- **Threshold**: 0.85 (optimized for FP reduction)
- **Class Mapping**: Class 0 = FAKE, Class 1 = REAL

### Key Differences
1. **Two-step process**: Notebook uses frames → crops → prediction (vs. current one-pass)
2. **Batch processing**: Notebook processes all crops together (vs. frame-by-frame)
3. **Aggregation strategy**: Notebook uses confident strategy (vs. simple mean)
4. **Threshold**: Notebook uses 0.85 (vs. 0.5)
5. **Temporary files**: Notebook creates intermediate files that should be cleaned up

---

## Implementation Plan

### Checkpoint 1: Project Structure & Dependencies ✅
**Status**: Ready to start

**Tasks**:
1. Create new detection service module: `backend/app/services/detection_v2.py`
2. Create video processing utilities: `model/src/video_processing.py`
3. Verify dependencies:
   - `ffmpeg` (for frame extraction)
   - `mediapipe` or `opencv-python` (for face detection)
   - `timm` (for model loading)
   - `torch` (for inference)
   - `PIL` (for image processing)

**Deliverables**:
- New module structure
- Dependency verification script
- Requirements update (if needed)

**Files to Create**:
- `backend/app/services/detection_v2.py`
- `model/src/video_processing.py`
- `model/src/aggregation_strategies.py`

---

### Checkpoint 2: Frame Extraction Module
**Status**: Waiting for approval

**Tasks**:
1. Implement `extract_frames_from_video()` function:
   - Uses `ffmpeg` subprocess with `-vf fps=3`
   - Saves frames as PNG files: `{video_name}_%04d.png`
   - Returns list of frame file paths
   - Handles errors gracefully

2. Create temporary directory structure:
   ```
   temp_dir/
   ├── {video_id}/
   │   ├── frames/
   │   │   ├── frame_0001.png
   │   │   ├── frame_0002.png
   │   │   └── ...
   │   └── crops/
   │       ├── frame_0001.jpg
   │       ├── frame_0002.jpg
   │       └── ...
   ```

3. Add cleanup utility to remove temp directories

**Deliverables**:
- `extract_frames_from_video()` function
- Temporary directory management
- Error handling and logging

**Files to Modify**:
- `model/src/video_processing.py` (new)

---

### Checkpoint 3: Face Cropping Module
**Status**: Waiting for approval

**Tasks**:
1. Implement `crop_faces_from_frames()` function:
   - Uses MediaPipe (preferred) or OpenCV DNN/Haar Cascade (fallback)
   - Detects largest face in each frame
   - Enlarges bounding box by 1.3x
   - Crops and resizes to 299x299
   - Saves as JPG files with quality 95

2. Handle edge cases:
   - Frames with no faces (skip or log warning)
   - Multiple faces (use largest)
   - Face detection failures (graceful degradation)

3. Match notebook's exact preprocessing:
   - Same enlargement scale (1.3x)
   - Same resize method (INTER_AREA)
   - Same output size (299x299)

**Deliverables**:
- `crop_faces_from_frames()` function
- Face detection with fallback options
- Error handling for missing faces

**Files to Modify**:
- `model/src/video_processing.py`

---

### Checkpoint 4: Batch Prediction Module
**Status**: Waiting for approval

**Tasks**:
1. Implement `predict_crops_batch()` function:
   - Loads all crop images for a video
   - Applies same transforms as validation (Resize, CenterCrop, Normalize)
   - Runs batch inference (not frame-by-frame)
   - Returns probabilities for each crop

2. Model loading:
   - Load checkpoint from `model/models/xception_best.pt` (or config path)
   - Use `timm.create_model("xception", pretrained=False, num_classes=2)`
   - Load `checkpoint['model_state']`
   - Set to evaluation mode

3. Class mapping:
   - **CRITICAL**: Class 0 = FAKE, Class 1 = REAL
   - Extract probabilities: `probs[:, 0]` for fake probability

**Deliverables**:
- `predict_crops_batch()` function
- Model loading utility
- Batch inference with proper transforms

**Files to Modify**:
- `model/src/video_processing.py`
- `backend/app/services/detection_v2.py`

---

### Checkpoint 5: Aggregation Strategies
**Status**: Waiting for approval

**Tasks**:
1. Implement `confident_strategy()` function (DFDC winner's method):
   ```python
   def confident_strategy(pred, t=0.8):
       pred = np.array(pred)
       sz = len(pred)
       fakes = np.count_nonzero(pred > t)
       
       if fakes > sz // 2.5 and fakes > 11:
           return np.mean(pred[pred > t])
       elif np.count_nonzero(pred < 0.2) > 0.9 * sz:
           return np.mean(pred[pred < 0.2])
       else:
           return np.mean(pred)
   ```

2. Implement `simple_majority_vote()` function:
   - Uses threshold 0.85 for frame classification
   - Video is fake if >50% frames are fake

3. Make aggregation strategy configurable (default: confident strategy)

**Deliverables**:
- `confident_strategy()` function
- `simple_majority_vote()` function
- Strategy selection logic

**Files to Create**:
- `model/src/aggregation_strategies.py`

---

### Checkpoint 6: Detection Service V2 Integration
**Status**: Waiting for approval

**Tasks**:
1. Create `DetectionServiceV2` class:
   - Wraps all processing steps
   - Manages temporary directories
   - Handles cleanup on success/failure
   - Returns same response format as V1

2. Main processing flow:
   ```python
   def process_video_v2(video_path, model_path, fps=3, threshold=0.85, 
                        strategy='confident', confident_t=0.8):
       # 1. Create temp directory
       # 2. Extract frames
       # 3. Crop faces
       # 4. Batch predict
       # 5. Aggregate results
       # 6. Cleanup temp directory
       # 7. Return results
   ```

3. Error handling:
   - Cleanup on any failure
   - Detailed error messages
   - Logging for debugging

**Deliverables**:
- `DetectionServiceV2` class
- Complete processing pipeline
- Error handling and cleanup

**Files to Create**:
- `backend/app/services/detection_v2.py`

---

### Checkpoint 7: API Integration
**Status**: Waiting for approval

**Tasks**:
1. Update detection route to use V2 service:
   - Add feature flag or config option to switch between V1/V2
   - Keep V1 as fallback if V2 fails
   - Update response format if needed

2. Configuration:
   - Add `USE_DETECTION_V2` setting
   - Add `DEFAULT_AGGREGATION_STRATEGY` setting
   - Add `CONFIDENT_STRATEGY_THRESHOLD` setting (default: 0.8)

3. Backward compatibility:
   - Ensure API response format matches V1
   - Handle edge cases gracefully

**Deliverables**:
- Updated detection route
- Configuration options
- Backward compatibility

**Files to Modify**:
- `backend/app/api/routes/detection.py`
- `backend/app/core/config.py`

---

### Checkpoint 8: Testing & Validation
**Status**: Waiting for approval

**Tasks**:
1. Unit tests:
   - Frame extraction
   - Face cropping
   - Batch prediction
   - Aggregation strategies

2. Integration tests:
   - End-to-end video processing
   - Temporary file cleanup
   - Error handling

3. Validation:
   - Test on sample videos from notebook
   - Compare results with notebook output
   - Verify accuracy matches notebook performance

**Deliverables**:
- Unit test suite
- Integration tests
- Validation report

**Files to Create**:
- `backend/app/tests/services/test_detection_v2.py`
- `backend/app/tests/services/test_video_processing.py`

---

## Technical Specifications

### Frame Extraction
- **Tool**: `ffmpeg` (subprocess)
- **Command**: `ffmpeg -i {video_path} -vf fps=3 {output_pattern}`
- **Format**: PNG files
- **Naming**: `{video_name}_%04d.png`

### Face Cropping
- **Primary**: MediaPipe Face Detection (model_selection=1, min_detection_confidence=0.5)
- **Fallback**: OpenCV DNN or Haar Cascade
- **Enlargement**: 1.3x
- **Output Size**: 299x299
- **Format**: JPG (quality 95)
- **Naming**: `{video_name}_{frame_number}.jpg`

### Model Inference
- **Model**: Xception (via timm)
- **Checkpoint**: `model/models/xception_best.pt`
- **Input Size**: 299x299
- **Transforms**: Resize(299) → CenterCrop(299) → ToTensor() → Normalize(ImageNet stats)
- **Batch Processing**: Process all crops together (not frame-by-frame)
- **Class Mapping**: Class 0 = FAKE, Class 1 = REAL

### Aggregation
- **Default Strategy**: Confident Strategy (DFDC winner)
- **Confident Threshold**: 0.8 (for high-confidence frames)
- **Video Threshold**: 0.85 (for final classification)
- **Fallback**: Simple majority vote if confident strategy not applicable

### Temporary Files
- **Location**: System temp directory or configurable path
- **Structure**: `{temp_dir}/{video_id}/frames/` and `{temp_dir}/{video_id}/crops/`
- **Cleanup**: Always cleanup on success/failure (try/finally)

---

## Configuration Changes

### New Settings (config.py)
```python
# Detection V2 Settings
USE_DETECTION_V2: bool = True  # Feature flag
DEFAULT_AGGREGATION_STRATEGY: str = "confident"  # "confident" or "simple"
CONFIDENT_STRATEGY_THRESHOLD: float = 0.8  # Threshold for high-confidence frames
DETECTION_V2_THRESHOLD: float = 0.85  # Video-level classification threshold
TEMP_DIR_BASE: str = None  # None = system temp, or specify path
```

---

## Risk Assessment

### High Risk
- **FFmpeg dependency**: Must be installed on system
- **Face detection failures**: Some frames may not have detectable faces
- **Performance**: Batch processing may be slower for very long videos

### Medium Risk
- **Temporary file cleanup**: Must ensure cleanup happens even on errors
- **Memory usage**: Loading all crops at once may use significant memory
- **Backward compatibility**: Need to maintain API response format

### Low Risk
- **Model loading**: Already working in V1
- **Dependencies**: Most already installed

---

## Success Criteria

1. ✅ V2 produces same results as notebook for test videos
2. ✅ Temporary files are always cleaned up
3. ✅ API response format matches V1
4. ✅ Error handling is robust
5. ✅ Performance is acceptable (< 2x slower than V1)
6. ✅ Can switch between V1/V2 via configuration

---

## Next Steps

**Awaiting approval to proceed with Checkpoint 1**

Once approved, I will:
1. Create the project structure
2. Set up dependencies
3. Implement each checkpoint sequentially
4. Wait for approval before moving to next checkpoint

---

## Questions for Review

1. Should we keep V1 as fallback or fully replace it?
2. What should be the default aggregation strategy?
3. Should we support both strategies via API parameter?
4. What's the acceptable processing time increase?
5. Should we add progress reporting for long videos?

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-27  
**Status**: Awaiting Approval for Checkpoint 1

