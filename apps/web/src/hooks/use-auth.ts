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

/**
 * Maps the API role (uppercase Prisma enum) to the frontend role.
 * API roles: ADMIN, SUPER_ADMIN, PATIENT, DOCTOR, NURSE, CLINICAL_OFFICER, PHYSIOTHERAPIST, PHARMACIST
 * Frontend roles: admin, patient, practitioner
 */
function mapApiRole(apiRole: string): 'admin' | 'patient' | 'practitioner' {
  const role = apiRole.toUpperCase();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'admin';
  if (role === 'PATIENT') return 'patient';
  return 'practitioner'; // DOCTOR, NURSE, CLINICAL_OFFICER, PHYSIOTHERAPIST, PHARMACIST
}

/**
 * Set auth cookies so the Next.js middleware can read them (middleware runs
 * on the edge and cannot access localStorage).
 */
function setAuthCookies(token: string, role: string) {
  document.cookie = `ndipaano_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  document.cookie = `ndipaano_role=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearAuthCookies() {
  document.cookie = 'ndipaano_token=; path=/; max-age=0';
  document.cookie = 'ndipaano_role=; path=/; max-age=0';
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
          // Ensure cookies are in sync with localStorage
          setAuthCookies(token, user.role || 'patient');
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('ndipaano_token');
          localStorage.removeItem('ndipaano_user');
          localStorage.removeItem('ndipaano_refresh_token');
          clearAuthCookies();
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    }
  },

  login: async (email: string, password: string, twoFactorCode?: string) => {
    const response = await authAPI.login({ email, password, twoFactorCode });
    const { user: apiUser, accessToken, refreshToken } = response.data.data;

    // Map the API role to the frontend role
    const mappedRole = mapApiRole(apiUser.role);
    const user = { ...apiUser, role: mappedRole };

    localStorage.setItem('ndipaano_token', accessToken);
    localStorage.setItem('ndipaano_refresh_token', refreshToken);
    localStorage.setItem('ndipaano_user', JSON.stringify(user));
    setAuthCookies(accessToken, mappedRole);

    set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
  },

  register: async (data) => {
    const response = data.role === 'practitioner'
      ? await authAPI.registerPractitioner({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          practitionerType: data.practitionerType || 'NURSE',
          hpczRegistrationNumber: data.licenseNumber || '',
        })
      : await authAPI.registerPatient({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        });

    const { user: apiUser, accessToken, refreshToken } = response.data.data;

    const mappedRole = mapApiRole(apiUser.role);
    const user = { ...apiUser, role: mappedRole };

    localStorage.setItem('ndipaano_token', accessToken);
    localStorage.setItem('ndipaano_refresh_token', refreshToken);
    localStorage.setItem('ndipaano_user', JSON.stringify(user));
    setAuthCookies(accessToken, mappedRole);

    set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('ndipaano_token');
    localStorage.removeItem('ndipaano_refresh_token');
    localStorage.removeItem('ndipaano_user');
    clearAuthCookies();
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
      const apiUser = response.data.data;
      const mappedRole = mapApiRole(apiUser.role);
      const user = { ...apiUser, role: mappedRole };
      localStorage.setItem('ndipaano_user', JSON.stringify(user));
      set({ user });
    } catch {
      get().logout();
    }
  },
}));
