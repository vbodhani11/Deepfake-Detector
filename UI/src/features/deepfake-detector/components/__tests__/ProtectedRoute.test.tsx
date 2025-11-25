/**
 * @jest-environment jsdom
 */
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { InitialEntry } from 'history';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';

const mockUseAuth = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const LoginEcho = () => {
  const location = useLocation();
  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? 'none';

  return (
    <div>
      <p>Login Page</p>
      <p data-testid='redirect-path'>{fromPath}</p>
    </div>
  );
};

const setupRouter = (initialEntries: InitialEntry[] = ['/reports']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path='/login' element={<LoginEcho />} />
        <Route
          path='/reports'
          element={
            <ProtectedRoute>
              <div>Reports Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to login and preserves destination', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    setupRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.getByTestId('redirect-path').textContent).toBe('/reports');
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });

    setupRouter();

    expect(screen.getByText('Reports Content')).toBeInTheDocument();
  });

  it('shows loading screen while auth is determining state', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });

    setupRouter();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('respects custom initial entries when redirecting', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    setupRouter([
      {
        pathname: '/reports',
        state: { from: { pathname: '/reports' } },
      } as InitialEntry,
    ]);

    expect(screen.getByTestId('redirect-path').textContent).toBe('/reports');
  });
});

