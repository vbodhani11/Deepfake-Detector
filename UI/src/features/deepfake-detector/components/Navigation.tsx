import React from 'react';
import { useNavigate } from 'react-router-dom';
import FuturisticButton from './FuturisticButton';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className='w-full flex justify-end items-center gap-4 p-6'>
      {isAuthenticated ? (
        <>
          <span className='text-gray-400 text-sm md:text-base'>
            Welcome, <span className='text-blue-400'>{user?.email}</span>
          </span>
          <FuturisticButton onClick={() => navigate('/reports')}>My Reports</FuturisticButton>
          <FuturisticButton onClick={logout} variant='secondary'>
            Logout
          </FuturisticButton>
        </>
      ) : (
        <>
          <FuturisticButton onClick={() => navigate('/login')}>Login</FuturisticButton>
          <FuturisticButton onClick={() => navigate('/signup')} variant='secondary'>
            Sign Up
          </FuturisticButton>
        </>
      )}
    </nav>
  );
};

export default Navigation;

