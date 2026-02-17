import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { setOnUnauthorized } from '../services/api';
import { COLORS } from '../utils/constants';
import LoadingScreen from '../components/LoadingScreen';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import BookingScreen from '../screens/BookingScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import BookingsListScreen from '../screens/BookingsListScreen';
import MedicalRecordsScreen from '../screens/MedicalRecordsScreen';
import PrescriptionsScreen from '../screens/PrescriptionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import EmergencyScreen from '../screens/EmergencyScreen';

// Navigation types
import {
  AuthStackParamList,
  MainStackParamList,
  PatientTabParamList,
  PractitionerTabParamList,
} from './types';

// ─── Stack & Tab Navigators ──────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const PatientTab = createBottomTabNavigator<PatientTabParamList>();
const PractitionerTab = createBottomTabNavigator<PractitionerTabParamList>();

// ─── Tab Icon Component ─────────────────────────────────────────────────────

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const iconMap: Record<string, string> = {
    Home: '\u2302',
    Search: '\u2315',
    Bookings: '\u2637',
    Records: '\u2630',
    Profile: '\u263A',
    Earnings: '\u2696',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[
          styles.tabIcon,
          { color: focused ? COLORS.primary : COLORS.gray400 },
        ]}
      >
        {iconMap[label] || '\u25CF'}
      </Text>
    </View>
  );
}

// ─── Auth Navigator ──────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Patient Tab Navigator ───────────────────────────────────────────────────

function PatientTabNavigator() {
  return (
    <PatientTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <PatientTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <PatientTab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: 'Search' }}
      />
      <PatientTab.Screen
        name="Bookings"
        component={BookingsListScreen}
        options={{ tabBarLabel: 'Bookings' }}
      />
      <PatientTab.Screen
        name="Records"
        component={MedicalRecordsScreen}
        options={{ tabBarLabel: 'Records' }}
      />
      <PatientTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </PatientTab.Navigator>
  );
}

// ─── Practitioner Tab Navigator ──────────────────────────────────────────────

function PractitionerTabNavigator() {
  return (
    <PractitionerTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <PractitionerTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <PractitionerTab.Screen
        name="Bookings"
        component={BookingsListScreen}
        options={{ tabBarLabel: 'Bookings' }}
      />
      <PractitionerTab.Screen
        name="Earnings"
        component={BookingsListScreen}
        options={{ tabBarLabel: 'Earnings' }}
      />
      <PractitionerTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </PractitionerTab.Navigator>
  );
}

// ─── Main Navigator (Tabs + Detail Screens) ─────────────────────────────────

function MainNavigator() {
  const user = useAuthStore((s) => s.user);
  const isPractitioner = user?.role === 'PRACTITIONER';

  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      {isPractitioner ? (
        <MainStack.Screen
          name="PractitionerTabs"
          component={PractitionerTabNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <MainStack.Screen
          name="PatientTabs"
          component={PatientTabNavigator}
          options={{ headerShown: false }}
        />
      )}
      <MainStack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: 'Booking Details' }}
      />
      <MainStack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: 'Book Appointment' }}
      />
      <MainStack.Screen
        name="Prescriptions"
        component={PrescriptionsScreen}
        options={{ title: 'Prescriptions' }}
      />
      <MainStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <MainStack.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          title: 'Emergency',
          headerStyle: { backgroundColor: COLORS.danger },
        }}
      />
    </MainStack.Navigator>
  );
}

// ─── Root App Navigator ──────────────────────────────────────────────────────

export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadStoredAuth, logout } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  if (isLoading) {
    return <LoadingScreen message="Loading your account..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingBottom: 4,
    paddingTop: 4,
    height: 60,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 22,
  },
});
