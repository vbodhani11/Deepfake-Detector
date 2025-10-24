import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import UploadPage from '../pages/UploadPage';
import AnalysisPage from '../pages/AnalysisPage';

const DeepfakeRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<LandingPage />} />
      <Route path='/upload' element={<UploadPage />} />
      <Route path='/analysis' element={<AnalysisPage />} />
    </Routes>
  );
};

export default DeepfakeRoutes;
