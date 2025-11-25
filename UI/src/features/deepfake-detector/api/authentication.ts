const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const API_V1_BASE = `${API_BASE_URL.replace(/\/$/, '')}/v1`;

const TOKEN_KEY = 'deepfake_token';
const LEGACY_TOKEN_KEY = 'auth_token';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

const getStoredToken = (): string | null => {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY)
  );
};

export const login = async (email: string, password: string): Promise<TokenResponse> => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_V1_BASE}/authentication/access-token`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && (payload.detail ?? payload.message)) || `Login failed (${response.status})`;
    throw new Error(message);
  }

  return response.json();
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  const token = getStoredToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_V1_BASE}/users/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && (payload.detail ?? payload.message)) || `Failed to get user (${response.status})`;
    throw new Error(message);
  }

  return response.json();
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  window.location.href = '/';
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};

