/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navigation from '../Navigation';

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows login and signup buttons when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: jest.fn(),
    });

    render(<Navigation />);

    const loginBtn = screen.getByRole('button', { name: /login/i });
    const signupBtn = screen.getByRole('button', { name: /sign up/i });
    expect(loginBtn).toBeInTheDocument();
    expect(signupBtn).toBeInTheDocument();

    await userEvent.click(loginBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/login');

    await userEvent.click(signupBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('shows user info and logout when authenticated', async () => {
    const logoutMock = jest.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'user@example.com' },
      logout: logoutMock,
    });

    render(<Navigation />);

    expect(
      screen.getByText((content, element) => element?.textContent === 'Welcome, user@example.com'),
    ).toBeInTheDocument();
    const reportsBtn = screen.getByRole('button', { name: /my reports/i });
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    expect(reportsBtn).toBeInTheDocument();
    expect(logoutBtn).toBeInTheDocument();

    await userEvent.click(reportsBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/reports');

    await userEvent.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalled();
  });
});

