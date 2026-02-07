import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthResponse } from '../services/authService';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
    registrationNumber: string;
    phone: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      const savedUser = authService.getUser();

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await authService.getCurrentUser();
          setUser({
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role as UserRole,
            avatar: `https://ui-avatars.com/api/?name=${response.user.name}&background=random`,
            campusCoins: 0,
            stats: {
              attendancePercentage: 85,
              eventsAttended: 5,
              arrears: 0,
              standing: 'Silver',
              cgpa: 8.5,
            },
          });
        } catch (error) {
          // Token is invalid, clear auth
          authService.logout();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await authService.login({ email, password });
      
      const userObj: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role as UserRole,
        avatar: `https://ui-avatars.com/api/?name=${response.user.name}&background=random`,
        campusCoins: 0,
        stats: {
          attendancePercentage: 85,
          eventsAttended: 5,
          arrears: 0,
          standing: 'Silver',
          cgpa: 8.5,
        },
      };

      authService.setAuth(response.token, userObj);
      setUser(userObj);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    department: string;
    registrationNumber: string;
    phone: string;
  }) => {
    console.log('=== AUTH CONTEXT REGISTER ===');
    console.log('Register data:', data);
    try {
      const response: AuthResponse = await authService.register(data);
      console.log('Auth service register response:', response);
      
      const userObj: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role as UserRole,
        avatar: `https://ui-avatars.com/api/?name=${response.user.name}&background=random`,
        campusCoins: 0,
        stats: {
          attendancePercentage: 85,
          eventsAttended: 5,
          arrears: 0,
          standing: 'Silver',
          cgpa: 8.5,
        },
      };

      authService.setAuth(response.token, userObj);
      setUser(userObj);
      console.log('User set in context:', userObj);
    } catch (error: any) {
      console.error('Auth context register error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
