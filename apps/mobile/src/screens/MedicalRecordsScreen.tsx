import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { medicalRecordsApi, MedicalRecord } from '../services/api';
import { COLORS } from '../utils/constants';
import { formatDate, getInitials, truncateText } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import type { MainStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function MedicalRecordsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const response = await medicalRecordsApi.list();
      setRecords(response.data);
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const handleRecordPress = async (record: MedicalRecord) => {
    try {
      const fullRecord = await medicalRecordsApi.getById(record.id);
      setSelectedRecord(fullRecord);
      setShowDetail(true);
    } catch {
      setSelectedRecord(record);
      setShowDetail(true);
    }
  };

  const renderRecord = ({ item }: { item: MedicalRecord }) => {
    const practitionerName = item.practitioner
      ? `${item.practitioner.firstName} ${item.practitioner.lastName}`
      : 'Unknown Practitioner';

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onPress={() => handleRecordPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.recordHeader}>
          <View style={styles.recordAvatar}>
            <Text style={styles.recordAvatarText}>{getInitials(practitionerName)}</Text>
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordPractitioner} numberOfLines={1}>
              {practitionerName}
            </Text>
            <Text style={styles.recordDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.recordBody}>
          <Text style={styles.recordDiagnosisLabel}>Diagnosis</Text>
          <Text style={styles.recordDiagnosis} numberOfLines={2}>
            {truncateText(item.diagnosis, 120)}
          </Text>
        </View>
        {item.vitals && Object.keys(item.vitals).length > 0 && (
          <View style={styles.vitalsRow}>
            {Object.entries(item.vitals)
              .slice(0, 3)
              .map(([key, value]) => (
                <View key={key} style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>{key}</Text>
                  <Text style={styles.vitalValue}>{value}</Text>
                </View>
              ))}
          </View>
        )}
        <View style={styles.recordFooter}>
          <Text style={styles.viewDetailsText}>View Full Record {'\u203A'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Detail Modal
  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    const practitionerName = selectedRecord.practitioner
      ? `${selectedRecord.practitioner.firstName} ${selectedRecord.practitioner.lastName}`
      : 'Unknown Practitioner';

    return (
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Medical Record</Text>
            <TouchableOpacity
              onPress={() => setShowDetail(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContent}
          >
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Practitioner</Text>
              <Text style={styles.modalSectionText}>{practitionerName}</Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Date</Text>
              <Text style={styles.modalSectionText}>
                {formatDate(selectedRecord.createdAt)}
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Diagnosis</Text>
              <Text style={styles.modalSectionText}>{selectedRecord.diagnosis}</Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Notes</Text>
              <Text style={styles.modalSectionText}>
                {selectedRecord.notes || 'No additional notes'}
              </Text>
            </View>
            {selectedRecord.vitals && Object.keys(selectedRecord.vitals).length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Vitals</Text>
                {Object.entries(selectedRecord.vitals).map(([key, value]) => (
                  <View key={key} style={styles.modalVitalRow}>
                    <Text style={styles.modalVitalLabel}>{key}</Text>
                    <Text style={styles.modalVitalValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* Link to prescriptions */}
            <TouchableOpacity
              style={styles.prescriptionsLink}
              onPress={() => {
                setShowDetail(false);
                navigation.navigate('Prescriptions', {
                  recordId: selectedRecord.id,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.prescriptionsLinkText}>
                View Prescriptions {'\u203A'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <Text style={styles.headerSubtitle}>
          Your consultation history and diagnoses
        </Text>
      </View>

      <FlatList
        data={records}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={'\u2630'}
            title="No Medical Records"
            subtitle="Your medical records from consultations will appear here."
          />
        }
      />

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordAvatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  recordInfo: {
    flex: 1,
  },
  recordPractitioner: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordBody: {
    marginBottom: 10,
  },
  recordDiagnosisLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  recordDiagnosis: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  vitalItem: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  vitalLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  vitalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Modal styles
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
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontWeight: '600',
  },
  modalSectionText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  modalVitalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  modalVitalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  modalVitalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  prescriptionsLink: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  prescriptionsLinkText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
