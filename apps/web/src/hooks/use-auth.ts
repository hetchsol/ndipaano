'use client';

import { create } from 'zustand';
import { authAPI, usersAPI } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'patient' | 'practitioner' | 'admin';
  avatar?: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  practitionerProfile?: {
    type: string;
    licenseNumber: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    rating: number;
    totalReviews: number;
    consultationFee: number;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'patient' | 'practitioner';
    practitionerType?: string;
    licenseNumber?: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  initialize: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ndipaano_token');
      const userStr = localStorage.getItem('ndipaano_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('ndipaano_token');
          localStorage.removeItem('ndipaano_user');
          localStorage.removeItem('ndipaano_refresh_token');
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },

  login: async (email: string, password: string, twoFactorCode?: string) => {
    const response = await authAPI.login({ email, password, twoFactorCode });
    const { user, token, refreshToken } = response.data.data;

    localStorage.setItem('ndipaano_token', token);
    localStorage.setItem('ndipaano_refresh_token', refreshToken);
    localStorage.setItem('ndipaano_user', JSON.stringify(user));

    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    const response = await authAPI.register(data);
    const { user, token, refreshToken } = response.data.data;

    localStorage.setItem('ndipaano_token', token);
    localStorage.setItem('ndipaano_refresh_token', refreshToken);
    localStorage.setItem('ndipaano_user', JSON.stringify(user));

    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('ndipaano_token');
    localStorage.removeItem('ndipaano_refresh_token');
    localStorage.removeItem('ndipaano_user');
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  setUser: (user: User) => {
    localStorage.setItem('ndipaano_user', JSON.stringify(user));
    set({ user });
  },

  refreshUser: async () => {
    try {
      const response = await usersAPI.getProfile();
      const user = response.data.data;
      localStorage.setItem('ndipaano_user', JSON.stringify(user));
      set({ user });
    } catch {
      get().logout();
    }
  },
}));
