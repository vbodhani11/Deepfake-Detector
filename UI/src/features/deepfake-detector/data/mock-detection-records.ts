import { DetectionRecord, DetectionResult, FramePrediction } from '../api/detection';

const buildFramePredictions = (
  count: number,
  startIndex: number,
  resultBias: DetectionResult,
  baseProbability: number
): FramePrediction[] => {
  const predictions: FramePrediction[] = [];
  for (let idx = 0; idx < count; idx += 1) {
    const frameIndex = startIndex + idx;
    const fluctuation = Math.sin(frameIndex / 3) * 0.05;
    const fakeProbability =
      resultBias === 'fake'
        ? Math.min(1, baseProbability + fluctuation + 0.1)
        : resultBias === 'real'
          ? Math.max(0, baseProbability + fluctuation - 0.1)
          : baseProbability + fluctuation;

    predictions.push({
      frame_index: frameIndex,
      timestamp_ms: frameIndex * 44,
      fake_probability: Number(fakeProbability.toFixed(2)),
      classification: fakeProbability > 0.5 ? 'fake' : 'real',
    });
  }
  return predictions;
};

export const mockDetectionRecords: DetectionRecord[] = [
  {
    id: 'rpt-241103-001',
    file_name: 'conference_interview.mp4',
    file_path: '/uploads/conference_interview.mp4',
    file_size: 1887436,
    media_type: 'video',
    created_at: '2025-11-12T14:05:33.000Z',
    status: 'completed',
    result: 'fake',
    confidence_score: 92,
    processing_time_seconds: 48,
    total_frames_processed: 530,
    fake_frames: 287,
    real_frames: 243,
    fake_ratio: 0.54,
    average_fake_probability: 0.73,
    fps_used: 24,
    threshold_used: 0.55,
    frame_predictions: buildFramePredictions(24, 0, 'fake', 0.7),
  },
  {
    id: 'rpt-241103-002',
    file_name: 'team_townhall.mov',
    file_path: '/uploads/team_townhall.mov',
    file_size: 2796202,
    media_type: 'video',
    created_at: '2025-11-11T19:22:10.000Z',
    status: 'processing',
    result: 'uncertain',
    confidence_score: 64,
    processing_time_seconds: 61,
    total_frames_processed: 612,
    fake_frames: 190,
    real_frames: 422,
    fake_ratio: 0.31,
    average_fake_probability: 0.46,
    fps_used: 30,
    threshold_used: 0.6,
    frame_predictions: buildFramePredictions(18, 10, 'uncertain', 0.48),
  },
  {
    id: 'rpt-241101-009',
    file_name: 'press_release_qna.mp4',
    file_path: '/uploads/press_release_qna.mp4',
    file_size: 1048576,
    media_type: 'video',
    created_at: '2025-11-09T09:45:55.000Z',
    status: 'completed',
    result: 'real',
    confidence_score: 88,
    processing_time_seconds: 37,
    total_frames_processed: 420,
    fake_frames: 30,
    real_frames: 390,
    fake_ratio: 0.07,
    average_fake_probability: 0.18,
    fps_used: 24,
    threshold_used: 0.55,
    frame_predictions: buildFramePredictions(20, 5, 'real', 0.2),
  },
];

