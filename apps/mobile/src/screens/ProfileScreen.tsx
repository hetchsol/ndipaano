import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { usersApi, practitionersApi } from '../services/api';
import { COLORS } from '../utils/constants';
import { getInitials, formatPhone, formatCurrency } from '../utils/helpers';

export default function ProfileScreen() {
  const { user, logout, updateUser, isLoading: authLoading } = useAuthStore();

  const isPractitioner = user?.role === 'PRACTITIONER';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Patient-specific
  const [bloodType, setBloodType] = useState(user?.patientProfile?.bloodType || '');
  const [allergies, setAllergies] = useState(
    user?.patientProfile?.allergies?.join(', ') || '',
  );

  // Practitioner-specific
  const [consultationFee, setConsultationFee] = useState(
    user?.practitionerProfile?.consultationFee?.toString() || '',
  );
  const [serviceRadiusKm, setServiceRadiusKm] = useState(
    user?.practitionerProfile?.serviceRadiusKm?.toString() || '',
  );

  // Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedUser = await usersApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });

      if (!isPractitioner && user?.patientProfile) {
        await usersApi.updatePatientProfile({
          bloodType: bloodType.trim() || undefined,
          allergies: allergies
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
        });
      }

      if (isPractitioner) {
        await practitionersApi.updateProfile({
          consultationFee: parseFloat(consultationFee) || undefined,
          serviceRadiusKm: parseInt(serviceRadiusKm, 10) || undefined,
        });
      }

      updateUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const cancelEdit = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone(user?.phone || '');
    setBloodType(user?.patientProfile?.bloodType || '');
    setAllergies(user?.patientProfile?.allergies?.join(', ') || '');
    setConsultationFee(user?.practitionerProfile?.consultationFee?.toString() || '');
    setServiceRadiusKm(user?.practitionerProfile?.serviceRadiusKm?.toString() || '');
    setIsEditing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
        </View>
        <Text style={styles.fullName}>{fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {isPractitioner ? 'Practitioner' : 'Patient'}
          </Text>
        </View>
      </View>

      {/* Edit/Save Controls */}
      <View style={styles.editControls}>
        {isEditing ? (
          <View style={styles.editButtonRow}>
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={cancelEdit}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.sectionCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>First Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={firstName}
                onChangeText={setFirstName}
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.firstName}</Text>
            )}
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={lastName}
                onChangeText={setLastName}
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.lastName}</Text>
            )}
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{user?.email}</Text>
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{formatPhone(user?.phone || '')}</Text>
            )}
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <Text style={styles.fieldValue}>
              {user?.gender
                ? user.gender.charAt(0) + user.gender.slice(1).toLowerCase()
                : 'Not set'}
            </Text>
          </View>
        </View>
      </View>

      {/* Patient Medical Info */}
      {!isPractitioner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Information</Text>
          <View style={styles.sectionCard}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Blood Type</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={bloodType}
                  onChangeText={setBloodType}
                  placeholder="e.g., A+"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {user?.patientProfile?.bloodType || 'Not set'}
                </Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Allergies</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="Comma-separated"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {user?.patientProfile?.allergies?.join(', ') || 'None recorded'}
                </Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Emergency Contacts</Text>
              <Text style={styles.fieldValue}>
                {user?.patientProfile?.emergencyContacts?.length || 0} contact(s)
              </Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Chronic Conditions</Text>
              <Text style={styles.fieldValue}>
                {user?.patientProfile?.chronicConditions?.join(', ') || 'None recorded'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Practitioner Professional Info */}
      {isPractitioner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>
          <View style={styles.sectionCard}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Type</Text>
              <Text style={styles.fieldValue}>
                {user?.practitionerProfile?.practitionerType
                  ?.replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Not set'}
              </Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>HPCZ Number</Text>
              <Text style={styles.fieldValue}>
                {user?.practitionerProfile?.hpczNumber || 'Not set'}
              </Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Consultation Fee</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  keyboardType="decimal-pad"
                  placeholder="ZMW"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {formatCurrency(user?.practitionerProfile?.consultationFee || 0)}
                </Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Service Radius</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={serviceRadiusKm}
                  onChangeText={setServiceRadiusKm}
                  keyboardType="numeric"
                  placeholder="km"
                  placeholderTextColor={COLORS.textMuted}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {user?.practitionerProfile?.serviceRadiusKm || 0}km
                </Text>
              )}
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Rating</Text>
              <Text style={styles.fieldValue}>
                {'\u2605'} {user?.practitionerProfile?.rating?.toFixed(1) || '0.0'} (
                {user?.practitionerProfile?.totalReviews || 0} reviews)
              </Text>
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Specializations</Text>
              <Text style={styles.fieldValue}>
                {user?.practitionerProfile?.specializations?.join(', ') || 'None set'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.sectionCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
              thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray400}
            />
          </View>
          <View style={styles.fieldDivider} />
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Language</Text>
            <Text style={styles.settingsValue}>English</Text>
          </View>
          <View style={styles.fieldDivider} />
          <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Consent Management</Text>
            <Text style={styles.settingsArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={styles.fieldDivider} />
          <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Privacy Policy</Text>
            <Text style={styles.settingsArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
          <View style={styles.fieldDivider} />
          <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Terms of Service</Text>
            <Text style={styles.settingsArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Ndipaano v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 24,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fullName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  editControls: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  editButton: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelEditText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1.5,
    textAlign: 'right',
  },
  fieldInput: {
    flex: 1.5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.gray50,
    textAlign: 'right',
  },
  fieldDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginHorizontal: 14,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  settingsLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  settingsValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  settingsArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 16,
    marginBottom: 20,
  },
});
