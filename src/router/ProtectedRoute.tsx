// src/router/ProtectedRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { FullScreenLoader } from '../components/ui/FullScreenLoader';

export const ProtectedRoute = () => {
  const { user, isLoading } = useUserStore();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};