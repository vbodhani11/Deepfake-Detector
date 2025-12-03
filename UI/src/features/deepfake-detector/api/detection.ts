const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_V1_BASE = `${API_BASE_URL.replace(/\/$/, '')}/v1`;

export type DetectionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DetectionResult = 'real' | 'fake' | 'uncertain';
export type MediaType = 'image' | 'video';

export interface FramePrediction {
  frame_index: number;
  timestamp_ms?: number;
  fake_probability: number;
  classification: DetectionResult;
}

export interface DetectionRecord {
  id: string;
  created_at: string;
  updated_at?: string | null;
  user_id?: string | null;
  media_type: MediaType;
  file_name: string;
  file_path: string;
  file_size: number;
  status: DetectionStatus;
  result?: DetectionResult | null;
  confidence_score?: number | null;
  processing_time_seconds?: number | null;
  error_message?: string | null;
  total_frames_processed?: number | null;
  fake_frames?: number | null;
  real_frames?: number | null;
  fake_ratio?: number | null;
  average_fake_probability?: number | null;
  fps_used?: number | null;
  threshold_used?: number | null;
  frame_predictions?: {
    frames: FramePrediction[];
  } | null;
}

const resolveAuthToken = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedToken = window.localStorage.getItem('deepfake_token') || window.localStorage.getItem('auth_token');
    if (storedToken) {
      return storedToken;
    }
  }
  return import.meta.env.VITE_API_TOKEN ?? null;
};

const buildAuthHeader = (): Record<string, string> => {
  const token = resolveAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const inferMediaType = (file: File): MediaType => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  return 'video';
};

interface UploadOptions {
  description?: string;
  onProgress?: (progress: number) => void;
}

export const uploadDetection = (file: File, options?: UploadOptions): Promise<DetectionRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('media_type', inferMediaType(file));
  if (options?.description) {
    formData.append('description', options.description);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_V1_BASE}/detection/upload`);
    // No authentication required - this is a public endpoint
    xhr.responseType = 'json';
    xhr.onerror = () => reject(new Error('Network error while uploading file'));
    xhr.ontimeout = () => reject(new Error('Request timed out while uploading file'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as DetectionRecord);
      } else {
        const message =
          (xhr.response && (xhr.response.detail ?? xhr.response.message)) || `Upload failed with status ${xhr.status}`;
        reject(new Error(typeof message === 'string' ? message : 'Upload failed'));
      }
    };
    if (options?.onProgress) {
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }
    xhr.send(formData);
  });
};

export const fetchDetectionById = async (detectionId: string): Promise<DetectionRecord> => {
  const response = await fetch(`${API_V1_BASE}/detection/${detectionId}`, {
    headers: {
      'Content-Type': 'application/json',
      // No authentication required - this is a public endpoint
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && (payload.detail ?? payload.message)) || `Unable to fetch detection (${response.status})`;
    throw new Error(message);
  }

  return response.json();
};

