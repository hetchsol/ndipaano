import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  authApi,
  usersApi,
  User,
  LoginDto,
  RegisterPatientDto,
  RegisterPractitionerDto,
} from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    dto: RegisterPatientDto | RegisterPractitionerDto,
    role: 'PATIENT' | 'PRACTITIONER',
  ) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  requires2FA: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });

      if (response.requires2FA) {
        set({ requires2FA: true, isLoading: false });
        return;
      }

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        requires2FA: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Login failed. Please check your credentials.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  register: async (
    dto: RegisterPatientDto | RegisterPractitionerDto,
    role: 'PATIENT' | 'PRACTITIONER',
  ) => {
    set({ isLoading: true, error: null });
    try {
      const response =
        role === 'PATIENT'
          ? await authApi.registerPatient(dto as RegisterPatientDto)
          : await authApi.registerPractitioner(dto as RegisterPractitionerDto);

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Registration failed. Please try again.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  verify2FA: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.verify2FA(code);

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        requires2FA: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Invalid 2FA code.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch {
      // Ignore SecureStore errors during logout
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      requires2FA: false,
      error: null,
    });
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (token && storedRefreshToken && userData) {
        const user = JSON.parse(userData) as User;

        // Attempt to refresh the user profile from the server
        try {
          const freshUser = await usersApi.getProfile();
          await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(freshUser));
          set({
            user: freshUser,
            token,
            refreshToken: storedRefreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Use cached user data if server is unreachable
          set({
            user,
            token,
            refreshToken: storedRefreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  refreshTokens: async () => {
    const { refreshToken: currentRefreshToken } = get();
    if (!currentRefreshToken) return;

    try {
      const response = await authApi.refresh(currentRefreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);

      set({
        token: response.accessToken,
        refreshToken: response.refreshToken,
      });
    } catch {
      // If refresh fails, force logout
      await get().logout();
    }
  },

  updateUser: (userData: Partial<User>) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...userData };
      set({ user: updatedUser });
      SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser)).catch(
        () => {},
      );
    }
  },

  clearError: () => set({ error: null }),
}));
