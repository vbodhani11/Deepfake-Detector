const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_V1_BASE = `${API_BASE_URL.replace(/\/$/, '')}/v1`;

export type DetectionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DetectionResult = 'real' | 'fake' | 'uncertain';
export type MediaType = 'image' | 'video';

export interface FramePrediction {
  frame_index: number;
  timestamp_ms?: number;
  fake_probability: number;
  classification?: DetectionResult; // Optional - can be derived from fake_probability
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

export interface DetectionListResponse {
  items: DetectionRecord[];
  total: number;
  page: number;
  per_page: number;
}

// DEV: mock data used when VITE_SKIP_LOGIN=true
const SKIP_LOGIN = import.meta.env.VITE_SKIP_LOGIN === 'true' || import.meta.env.VITE_SKIP_LOGIN === true;

const mockDetections: DetectionRecord[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-15T10:35:00Z',
    user_id: 'user-123',
    media_type: 'video',
    file_name: 'sample_video.mp4',
    file_path: '/uploads/sample_video.mp4',
    file_size: 5242880,
    status: 'completed',
    result: 'fake',
    confidence_score: 85,
    average_fake_probability: 0.87,
    fake_ratio: 0.75,
    total_frames_processed: 90,
    fake_frames: 68,
    real_frames: 22,
    fps_used: 3,
    threshold_used: 0.5,
    processing_time_seconds: 12.5,
    frame_predictions: {
      frames: [
        { frame_index: 0, fake_probability: 0.9, classification: 'fake' },
        { frame_index: 1, fake_probability: 0.85, classification: 'fake' },
        { frame_index: 2, fake_probability: 0.1, classification: 'real' },
      ],
    },
    error_message: null,
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    created_at: '2025-02-10T14:20:00Z',
    updated_at: '2025-02-10T14:22:00Z',
    user_id: null,
    media_type: 'video',
    file_name: 'anonymous_sample.mp4',
    file_path: '/uploads/anonymous_sample.mp4',
    file_size: 3145728,
    status: 'completed',
    result: 'uncertain',
    confidence_score: 62,
    average_fake_probability: 0.61,
    fake_ratio: 0.45,
    total_frames_processed: 60,
    fake_frames: 27,
    real_frames: 33,
    fps_used: 2,
    threshold_used: 0.5,
    processing_time_seconds: 8.2,
    frame_predictions: {
      frames: [
        { frame_index: 0, fake_probability: 0.6, classification: 'uncertain' },
        { frame_index: 1, fake_probability: 0.4, classification: 'real' },
      ],
    },
    error_message: null,
  },
];

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
  
  // Check if user is authenticated - if so, use /analyze endpoint with save_report=true
  const token = resolveAuthToken();
  const isAuthenticated = !!token;
  
  if (isAuthenticated) {
    // Use /analyze endpoint which supports saving reports for authenticated users
    formData.append('save_report', 'true'); // FormData sends as string, backend converts to bool
    // Note: /analyze doesn't require media_type, it infers it from the file
    // fps and threshold use defaults if not provided
  } else {
    // Use /upload endpoint for anonymous users
    formData.append('media_type', inferMediaType(file));
  }
  
  if (options?.description) {
    formData.append('description', options.description);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Use /analyze if authenticated (supports save_report), otherwise use /upload
    const endpoint = isAuthenticated ? `${API_V1_BASE}/detection/analyze` : `${API_V1_BASE}/detection/upload`;
    xhr.open('POST', endpoint);
    
    // Add authentication header if user is logged in
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
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
  if (SKIP_LOGIN) {
    const found = mockDetections.find(d => d.id === detectionId);
    if (!found) throw new Error('Report not found (mock)');
    return Promise.resolve(found);
  }

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

export const fetchUserDetections = async (
  page: number = 1,
  perPage: number = 20,
): Promise<DetectionListResponse> => {
  const token = resolveAuthToken();
  if (!token) {
    throw new Error('Authentication required to view reports');
  }
  if (SKIP_LOGIN) {
    const items = mockDetections.slice((page - 1) * perPage, page * perPage);
    return Promise.resolve({ items, total: mockDetections.length, page, per_page: perPage });
  }

  const response = await fetch(`${API_V1_BASE}/detection/?page=${page}&per_page=${perPage}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = (payload && (payload.detail ?? payload.message)) || `Unable to fetch reports (${response.status})`;
    throw new Error(message);
  }

  return response.json();
};

export const saveDetectionReport = async (detectionId: string): Promise<DetectionRecord> => {
  const token = resolveAuthToken();
  if (!token) {
    throw new Error('Authentication required to save reports');
  }
  if (SKIP_LOGIN) {
    // emulate saving by assigning a user_id
    const idx = mockDetections.findIndex(d => d.id === detectionId);
    if (idx === -1) throw new Error('Report not found (mock)');
    const updated = { ...mockDetections[idx], user_id: 'dev-user' };
    mockDetections[idx] = updated;
    return Promise.resolve(updated);
  }

  const response = await fetch(`${API_V1_BASE}/detection/${detectionId}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = (payload && (payload.detail ?? payload.message)) || `Unable to save report (${response.status})`;
    throw new Error(message);
  }

  return response.json();
};

