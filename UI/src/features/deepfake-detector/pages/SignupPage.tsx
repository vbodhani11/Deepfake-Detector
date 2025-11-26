// UI/src/features/deepfake-detector/pages/SignupPage.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import { signup, login } from '../api/authentication';
import { useAuth } from '../context/AuthContext';

const getPasswordStrength = (password: string): { strength: string; color: string } => {
  if (password.length === 0) return { strength: '', color: '' };
  if (password.length < 8) return { strength: 'Weak', color: 'text-red-400' };
  if (password.length < 12) return { strength: 'Medium', color: 'text-yellow-400' };
  return { strength: 'Strong', color: 'text-green-400' };
};

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: setAuthToken } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const passwordStrength = getPasswordStrength(password);

  // ---------- Form validation (on submit) ----------
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------- Real-time validation: email ----------
  useEffect(() => {
    setValidationErrors((prev: Record<string, string>) => {
      const newErrors = { ...prev };
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Invalid email format';
      } else {
        delete newErrors.email;
      }
      return newErrors;
    });
  }, [email]);

  // ---------- Real-time validation: password match ----------
  useEffect(() => {
    setValidationErrors((prev: Record<string, string>) => {
      const newErrors = { ...prev };
      if (confirmPassword && password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else {
        delete newErrors.confirmPassword;
      }
      return newErrors;
    });
  }, [password, confirmPassword]);

  // ---------- Submit handler ----------
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create user account
      await signup({
        email,
        password,
        full_name: fullName || undefined,
      });

      // 2. Show success message
      setIsSuccess(true);

      // 3. After short delay, auto-login & redirect
      setTimeout(async () => {
        try {
          const loginResponse = await login(email, password);
          // useAuth().login stores token and user in auth context
          setAuthToken(loginResponse.access_token);

          navigate('/');
        } catch (loginError) {
          console.error('Auto-login after signup failed:', loginError);
          setError(
            loginError instanceof Error
              ? loginError.message
              : 'Signup succeeded but auto-login failed. Please login manually.',
          );
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 relative overflow-x-hidden">
      <ParticlesBackground />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 bg-opacity-60 rounded-xl p-8 backdrop-blur-sm">
            <h1 className="text-4xl font-bold text-blue-400 uppercase tracking-wide mb-2 text-center">
              Sign Up
            </h1>
            <p className="text-gray-400 mb-8 text-center">
              Create your account to get started
            </p>

            {error && (
              <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {isSuccess && (
              <div className="bg-green-900 bg-opacity-50 border border-green-500 rounded-lg p-4 mb-6">
                <p className="text-green-400">
                  Account created successfully! Logging you in...
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name (optional) */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Full Name (Optional)
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                  placeholder="your.email@example.com"
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-sm mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                  placeholder="••••••••"
                />
                {validationErrors.password && (
                  <p className="text-red-400 text-sm mt-1">
                    {validationErrors.password}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Must be at least 8 characters
                </p>

                {/* Password strength indicator */}
                {password && (
                  <div className="mt-1">
                    <p className={`text-xs ${passwordStrength.color}`}>
                      Password strength: {passwordStrength.strength}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
                  placeholder="••••••••"
                />
                {validationErrors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <FuturisticButton
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </FuturisticButton>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
