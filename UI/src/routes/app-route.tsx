import React from 'react';
import { RouteObject } from 'react-router-dom';

import { NotFoundPage } from '@/core/error';
import { DeepfakeRoutes } from '../features/deepfake-detector/routes';

const appRoutes: Array<RouteObject> = [
  {
    path: '/*',
    element: <DeepfakeRoutes />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export default appRoutes;
