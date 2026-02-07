import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  registrationNumber?: string;
  phone?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    registrationNumber?: string;
  };
}

export const authService = {
  // Test method to check connectivity
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing backend connection...');
      const response = await axios.get('http://localhost:5000/api/health', { timeout: 5000 });
      console.log('Backend connection successful:', response.data);
      return true;
    } catch (error) {
      console.error('Backend connection failed:', error.message);
      return false;
    }
  },

  async login(data: LoginData): Promise<AuthResponse> {
    console.log('Login attempt:', data);
    console.log('API URL:', API_BASE_URL);
    
    try {
      const response = await api.post('/auth/login', data);
      console.log('Login response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    console.log('Register attempt:', data);
    console.log('API URL:', API_BASE_URL);
    
    try {
      const response = await api.post('/auth/register', data);
      console.log('Register response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  async getCurrentUser(): Promise<{ user: any }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getUser(): any | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setAuth(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export default api;
