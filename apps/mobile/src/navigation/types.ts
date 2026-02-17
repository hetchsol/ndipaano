import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// ─── Auth Stack ──────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ─── Patient Tab Navigator ───────────────────────────────────────────────────

export type PatientTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Records: undefined;
  Profile: undefined;
};

// ─── Practitioner Tab Navigator ──────────────────────────────────────────────

export type PractitionerTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Earnings: undefined;
  Profile: undefined;
};

// ─── Main Stack (wraps tabs + detail screens) ────────────────────────────────

export type MainStackParamList = {
  PatientTabs: NavigatorScreenParams<PatientTabParamList>;
  PractitionerTabs: NavigatorScreenParams<PractitionerTabParamList>;
  BookingDetail: { bookingId: string };
  Booking: { practitionerId: string; practitionerName: string };
  Prescriptions: { recordId?: string };
  Notifications: undefined;
  Emergency: undefined;
};

// ─── Root Stack ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

// ─── Screen Props Helper Types ───────────────────────────────────────────────

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainStackScreenProps<T extends keyof MainStackParamList> = NativeStackScreenProps<
  MainStackParamList,
  T
>;

export type PatientTabScreenProps<T extends keyof PatientTabParamList> = BottomTabScreenProps<
  PatientTabParamList,
  T
>;

export type PractitionerTabScreenProps<T extends keyof PractitionerTabParamList> =
  BottomTabScreenProps<PractitionerTabParamList, T>;

// ─── Declare global navigation types ─────────────────────────────────────────

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
