import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { emergencyApi, EmergencyContact } from '../services/api';
import { COLORS, EMERGENCY_NUMBERS } from '../utils/constants';
import { formatPhone, getInitials } from '../utils/helpers';

export default function EmergencyScreen() {
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [isSendingPanic, setIsSendingPanic] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Add contact modal state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelationship, setNewContactRelationship] = useState('');
  const [addingContact, setAddingContact] = useState(false);

  useEffect(() => {
    loadContacts();
    getCurrentLocation();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await emergencyApi.getContacts();
      setContacts(data);
    } catch {
      // Silently handle - will show empty contacts
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      setLocationError('Unable to get current location');
    }
  };

  const handlePanicPress = () => {
    Alert.alert(
      'EMERGENCY PANIC',
      'This will alert your emergency contacts and nearby practitioners with your current location. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND ALERT',
          style: 'destructive',
          onPress: triggerPanic,
        },
      ],
    );
  };

  const triggerPanic = async () => {
    setIsSendingPanic(true);

    if (!currentLocation) {
      await getCurrentLocation();
    }

    try {
      const lat = currentLocation?.latitude || 0;
      const lng = currentLocation?.longitude || 0;
      await emergencyApi.triggerPanic(lat, lng);
      setIsPanicActive(true);
      Alert.alert(
        'Alert Sent',
        'Emergency alert has been sent to your contacts and nearby practitioners. Help is on the way.',
      );
    } catch {
      Alert.alert(
        'Error',
        'Failed to send emergency alert. Please call emergency services directly.',
      );
    } finally {
      setIsSendingPanic(false);
    }
  };

  const callNumber = (number: string) => {
    const phoneUrl =
      Platform.OS === 'android' ? `tel:${number}` : `telprompt:${number}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device.');
      }
    });
  };

  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim() || !newContactRelationship.trim()) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }

    setAddingContact(true);
    try {
      const contact: EmergencyContact = {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRelationship.trim(),
      };
      await emergencyApi.addContact(contact);
      setContacts((prev) => [...prev, contact]);
      setShowAddContact(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactRelationship('');
      Alert.alert('Success', 'Emergency contact added successfully.');
    } catch {
      Alert.alert('Error', 'Failed to add emergency contact. Please try again.');
    } finally {
      setAddingContact(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Panic Button */}
      <View style={styles.panicSection}>
        <TouchableOpacity
          style={[
            styles.panicButton,
            isPanicActive && styles.panicButtonActive,
            isSendingPanic && styles.panicButtonSending,
          ]}
          onPress={handlePanicPress}
          disabled={isSendingPanic}
          activeOpacity={0.8}
        >
          {isSendingPanic ? (
            <ActivityIndicator size="large" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.panicIcon}>!</Text>
              <Text style={styles.panicText}>
                {isPanicActive ? 'ALERT SENT' : 'PANIC'}
              </Text>
              <Text style={styles.panicSubtext}>
                {isPanicActive ? 'Help is on the way' : 'Tap for emergency alert'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.panicDescription}>
          Press the button above to send an emergency alert to your contacts and nearby
          practitioners with your current location.
        </Text>
      </View>

      {/* Current Location */}
      <View style={styles.locationCard}>
        <Text style={styles.sectionTitle}>Current Location</Text>
        {currentLocation ? (
          <View style={styles.locationInfo}>
            <View style={styles.locationDot} />
            <View>
              <Text style={styles.locationCoords}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationStatus}>Location acquired</Text>
            </View>
          </View>
        ) : locationError ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationError}>{locationError}</Text>
            <TouchableOpacity
              style={styles.retryLocationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.retryLocationText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.locationInfo}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.locationLoading}>Getting location...</Text>
          </View>
        )}
      </View>

      {/* Zambian Emergency Numbers */}
      <View style={styles.emergencyNumbersCard}>
        <Text style={styles.sectionTitle}>Emergency Numbers (Zambia)</Text>
        <TouchableOpacity
          style={styles.emergencyNumberRow}
          onPress={() => callNumber(EMERGENCY_NUMBERS.POLICE)}
          activeOpacity={0.7}
        >
          <View style={[styles.emergencyIcon, { backgroundColor: COLORS.blueLight }]}>
            <Text style={[styles.emergencyIconText, { color: COLORS.blue }]}>
              {'\u2706'}
            </Text>
          </View>
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyLabel}>Police</Text>
            <Text style={styles.emergencyNumber}>{EMERGENCY_NUMBERS.POLICE}</Text>
          </View>
          <Text style={styles.callArrow}>Call {'\u203A'}</Text>
        </TouchableOpacity>

        <View style={styles.numberDivider} />

        <TouchableOpacity
          style={styles.emergencyNumberRow}
          onPress={() => callNumber(EMERGENCY_NUMBERS.AMBULANCE)}
          activeOpacity={0.7}
        >
          <View style={[styles.emergencyIcon, { backgroundColor: COLORS.redLight }]}>
            <Text style={[styles.emergencyIconText, { color: COLORS.danger }]}>
              {'\u2695'}
            </Text>
          </View>
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyLabel}>Ambulance</Text>
            <Text style={styles.emergencyNumber}>{EMERGENCY_NUMBERS.AMBULANCE}</Text>
          </View>
          <Text style={styles.callArrow}>Call {'\u203A'}</Text>
        </TouchableOpacity>

        <View style={styles.numberDivider} />

        <TouchableOpacity
          style={styles.emergencyNumberRow}
          onPress={() => callNumber(EMERGENCY_NUMBERS.FIRE)}
          activeOpacity={0.7}
        >
          <View style={[styles.emergencyIcon, { backgroundColor: COLORS.orangeLight }]}>
            <Text style={[styles.emergencyIconText, { color: COLORS.orange }]}>
              {'\u2668'}
            </Text>
          </View>
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyLabel}>Fire Brigade</Text>
            <Text style={styles.emergencyNumber}>{EMERGENCY_NUMBERS.FIRE}</Text>
          </View>
          <Text style={styles.callArrow}>Call {'\u203A'}</Text>
        </TouchableOpacity>
      </View>

      {/* Emergency Contacts */}
      <View style={styles.contactsCard}>
        <View style={styles.contactsHeader}>
          <Text style={styles.sectionTitle}>Your Emergency Contacts</Text>
          <TouchableOpacity
            style={styles.addContactButton}
            onPress={() => setShowAddContact(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addContactButtonText}>+ Add Contact</Text>
          </TouchableOpacity>
        </View>
        {isLoadingContacts ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : contacts.length > 0 ? (
          contacts.map((contact, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={styles.numberDivider} />}
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => callNumber(contact.phone)}
                activeOpacity={0.7}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {getInitials(contact.name)}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  <Text style={styles.contactPhone}>{formatPhone(contact.phone)}</Text>
                </View>
                <Text style={styles.callArrow}>Call {'\u203A'}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))
        ) : (
          <View style={styles.noContacts}>
            <Text style={styles.noContactsText}>
              No emergency contacts added yet.
            </Text>
          </View>
        )}
      </View>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContact}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddContact(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <TouchableOpacity
              onPress={() => setShowAddContact(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Contact's full name"
                placeholderTextColor={COLORS.textMuted}
                value={newContactName}
                onChangeText={setNewContactName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., 0971234567"
                placeholderTextColor={COLORS.textMuted}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Spouse, Parent, Sibling"
                placeholderTextColor={COLORS.textMuted}
                value={newContactRelationship}
                onChangeText={setNewContactRelationship}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveContactButton, addingContact && styles.saveContactButtonDisabled]}
              onPress={handleAddContact}
              disabled={addingContact}
              activeOpacity={0.7}
            >
              {addingContact ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveContactButtonText}>Save Contact</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  panicSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  panicButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
  },
  panicButtonActive: {
    backgroundColor: COLORS.orange,
  },
  panicButtonSending: {
    opacity: 0.8,
  },
  panicIcon: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 4,
  },
  panicText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
  },
  panicSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  panicDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  locationCoords: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  locationStatus: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 2,
  },
  locationError: {
    fontSize: 13,
    color: COLORS.danger,
  },
  locationLoading: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  retryLocationButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  retryLocationText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emergencyNumbersCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emergencyNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emergencyIconText: {
    fontSize: 20,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emergencyNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.danger,
    marginTop: 2,
  },
  callArrow: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  numberDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
  },
  contactsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactAvatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  contactRelationship: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  contactPhone: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addContactButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 14,
  },
  addContactButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  noContacts: {
    paddingVertical: 10,
  },
  noContactsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ─── Add Contact Modal ────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  modalBody: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.gray50,
  },
  saveContactButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveContactButtonDisabled: {
    opacity: 0.7,
  },
  saveContactButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
