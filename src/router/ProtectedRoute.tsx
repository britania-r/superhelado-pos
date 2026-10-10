// src/router/ProtectedRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

export const ProtectedRoute = () => {
  const { user, isLoading } = useUserStore();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};