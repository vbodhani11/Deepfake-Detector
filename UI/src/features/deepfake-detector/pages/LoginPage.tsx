import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, Location, useLocation, useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import FuturisticButton from '../components/FuturisticButton';
import { login } from '../api/authentication';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: persistToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const isFormValid = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email.trim()) && password.trim().length >= 6;
  }, [email, password]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Please enter a valid email and password.');
      return;
    }

    if (!isMountedRef.current) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email.trim(), password);
      
      if (!isMountedRef.current) return;
      
      persistToken(response.access_token, { persist: rememberMe ? 'local' : 'session' });

      const redirectPath =
        (location.state as { from?: Location } | null)?.from?.pathname?.toString() || '/';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className='min-h-screen bg-black text-gray-300 relative overflow-x-hidden'>
      <ParticlesBackground />

      <div className='relative z-10 flex items-center justify-center min-h-screen px-4 py-8'>
        <div className='w-full max-w-md'>
          <div className='bg-gray-900/70 rounded-2xl p-8 backdrop-blur-md shadow-2xl shadow-blue-900/50'>
            <h1 className='text-4xl font-bold text-blue-400 uppercase tracking-wide mb-2 text-center'>
              Login
            </h1>
            <p className='text-gray-400 mb-8 text-center'>Sign in to access your reports</p>

            {error && (
              <div
                className='bg-red-900/40 border border-red-500/50 rounded-lg p-4 mb-6 text-sm'
                role='alert'
              >
                <p className='text-red-300'>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label htmlFor='email' className='block text-sm font-medium text-gray-300 mb-2'>
                  Email
                </label>
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300'
                  placeholder='your.email@example.com'
                  autoComplete='email'
                />
              </div>

              <div>
                <label htmlFor='password' className='block text-sm font-medium text-gray-300 mb-2'>
                  Password
                </label>
                <input
                  id='password'
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-300'
                  placeholder='••••••••'
                  autoComplete='current-password'
                />
              </div>

              <div className='flex items-center justify-between text-sm text-gray-400'>
                <label className='inline-flex items-center space-x-2 cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className='h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-400'
                  />
                  <span>Remember me</span>
                </label>
                <Link to='/' className='text-blue-400 hover:text-blue-300 underline transition-colors'>
                  Back to home
                </Link>
              </div>

              <FuturisticButton
                type='submit'
                disabled={isLoading}
                aria-disabled={isLoading || !isFormValid}
                className={`w-full ${!isFormValid && !isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </FuturisticButton>
            </form>

            <div className='mt-6 text-center'>
              <p className='text-gray-400'>
                Don't have an account?{' '}
                <Link to='/signup' className='text-blue-400 hover:text-blue-300 underline'>
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

