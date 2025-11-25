/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import { getCurrentUser, logout as apiLogout } from '../../api/authentication';

jest.mock('../../api/authentication', () => ({
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
}));

const mockUser = {
  id: '123',
  email: 'user@example.com',
  full_name: 'User Example',
  is_active: true,
  is_superuser: false,
};

const TestConsumer = () => {
  const { user, isAuthenticated, isLoading, login, logout, refreshUser } = useAuth();

  return (
    <div>
      <p data-testid='user-email'>{user?.email ?? 'none'}</p>
      <p data-testid='auth-state'>{isAuthenticated ? 'yes' : 'no'}</p>
      <p data-testid='loading-state'>{isLoading ? 'yes' : 'no'}</p>
      <button type='button' onClick={() => login('token-local')}>
        login-local
      </button>
      <button type='button' onClick={() => login('token-session', { persist: 'session' })}>
        login-session
      </button>
      <button type='button' onClick={() => logout()}>
        logout
      </button>
      <button type='button' onClick={() => refreshUser()}>
        refresh
      </button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads user when token exists (persistence)', async () => {
    localStorage.setItem('deepfake_token', 'token');
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    renderWithProvider();

    expect(screen.getByTestId('loading-state').textContent).toBe('yes');

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email);
    });
    expect(screen.getByTestId('auth-state').textContent).toBe('yes');
    expect(screen.getByTestId('loading-state').textContent).toBe('no');
  });

  it('clears state on logout', async () => {
    localStorage.setItem('deepfake_token', 'token');
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    renderWithProvider();
    await waitFor(() => screen.getByText('logout'));

    await userEvent.click(screen.getByText('logout'));

    expect(apiLogout).toHaveBeenCalled();
    expect(screen.getByTestId('user-email').textContent).toBe('none');
    expect(screen.getByTestId('auth-state').textContent).toBe('no');
  });

  it('handles invalid token by clearing storage', async () => {
    localStorage.setItem('deepfake_token', 'token');
    (getCurrentUser as jest.Mock).mockRejectedValue(new Error('invalid token'));

    renderWithProvider();

    await waitFor(() => {
      expect(localStorage.getItem('deepfake_token')).toBeNull();
    });
    expect(screen.getByTestId('auth-state').textContent).toBe('no');
  });

  it('stores tokens according to persist option', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    renderWithProvider();

    await userEvent.click(screen.getByText('login-local'));
    await waitFor(() => {
      expect(localStorage.getItem('deepfake_token')).toBe('token-local');
    });
    expect(sessionStorage.getItem('deepfake_token')).toBeNull();

    await userEvent.click(screen.getByText('login-session'));
    await waitFor(() => {
      expect(sessionStorage.getItem('deepfake_token')).toBe('token-session');
    });
    expect(localStorage.getItem('deepfake_token')).toBeNull();
  });

  it('refreshUser fetches latest data on demand', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValueOnce(mockUser).mockResolvedValueOnce({
      ...mockUser,
      email: 'updated@example.com',
    });

    renderWithProvider();
    await userEvent.click(screen.getByText('login-local'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe(mockUser.email);
    });

    await userEvent.click(screen.getByText('refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('updated@example.com');
    });
  });

  it('throws when useAuth used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });
});

