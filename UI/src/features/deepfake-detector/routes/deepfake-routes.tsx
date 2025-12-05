import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import UploadPage from '../pages/UploadPage';
import AnalysisPage from '../pages/AnalysisPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ReportsPage from '../pages/ReportsPage';
import ReportDetailPage from '../pages/ReportDetailPage';
import ProtectedRoute from '../components/ProtectedRoute';

const DeepfakeRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<LandingPage />} />
      <Route path='/upload' element={<UploadPage />} />
      <Route path='/analysis' element={<AnalysisPage />} />
      <Route 
        path='/reports' 
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path='/reports/:reportId' 
        element={
          <ProtectedRoute>
            <ReportDetailPage />
          </ProtectedRoute>
        } 
      />
      <Route path='/login' element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Routes>
  );
};

export default DeepfakeRoutes;
