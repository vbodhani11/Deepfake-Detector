/**
 * @jest-environment jsdom
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';
import { login as loginRequest } from '../../api/authentication';

jest.mock('../../api/authentication', () => ({
  login: jest.fn(),
}));

const mockAuthLogin = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockAuthLogin,
  }),
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (initialEntries?: Parameters<typeof MemoryRouter>[0]['initialEntries']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <LoginPage />
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('logs in successfully and redirects home', async () => {
    (loginRequest as jest.Mock).mockResolvedValue({ access_token: 'token123' });

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password1');

    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(mockAuthLogin).toHaveBeenCalledWith('token123', { persist: 'local' });
  });

  it('shows validation error for invalid email format', async () => {
    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'password1');

    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(
      await screen.findByText(/please enter a valid email and password/i),
    ).toBeInTheDocument();
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it('shows API error for invalid password', async () => {
    (loginRequest as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('requires form fields before submitting', async () => {
    renderWithRouter();
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toHaveAttribute('aria-disabled', 'true');

    await userEvent.click(loginButton);

    expect(
      await screen.findByText(/please enter a valid email and password/i),
    ).toBeInTheDocument();
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it('shows loading state while authenticating', async () => {
    let resolvePromise: (value: unknown) => void = () => {};
    (loginRequest as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    const loadingButton = screen.getByRole('button', { name: /logging in/i });
    expect(loadingButton).toBeDisabled();

    resolvePromise({ access_token: 'token123' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled();
    });
  });

  it('requests session persistence when remember me is unchecked', async () => {
    (loginRequest as jest.Mock).mockResolvedValue({ access_token: 'token123' });

    renderWithRouter();

    await userEvent.click(screen.getByLabelText(/remember me/i));
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockAuthLogin).toHaveBeenCalledWith('token123', { persist: 'session' });
    });
  });

  it('includes a signup link for navigation', () => {
    renderWithRouter();
    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('shows fallback error message for unknown error types', async () => {
    (loginRequest as jest.Mock).mockRejectedValue('unexpected error');

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/login failed\. please try again/i)).toBeInTheDocument();
  });

  it('redirects to intended route when provided in location state', async () => {
    (loginRequest as jest.Mock).mockResolvedValue({ access_token: 'token123' });

    renderWithRouter([
      {
        pathname: '/login',
        state: { from: { pathname: '/reports' } },
      },
    ]);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/reports', { replace: true });
    });
  });
});

