import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Login } from './Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('=== PROTECTED ROUTE ===');
  console.log('isLoading:', isLoading);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('user:', user);
  console.log('=== END PROTECTED ROUTE ===');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, showing Login');
    return <Login />;
  }

  console.log('Authenticated, showing children');
  return <>{children}</>;
};
