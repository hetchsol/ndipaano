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
import { prescriptionsApi, Prescription } from '../services/api';
import { COLORS } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import type { MainStackScreenProps } from '../navigation/types';

export default function PrescriptionsScreen({
  route,
}: MainStackScreenProps<'Prescriptions'>) {
  const recordId = route.params?.recordId;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    try {
      const response = await prescriptionsApi.list();
      setPrescriptions(response.data);
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  };

  const handlePrescriptionPress = async (prescription: Prescription) => {
    try {
      const fullPrescription = await prescriptionsApi.getById(prescription.id);
      setSelectedPrescription(fullPrescription);
    } catch {
      setSelectedPrescription(prescription);
    }
    setShowDetail(true);
  };

  const renderPrescription = ({ item }: { item: Prescription }) => (
    <TouchableOpacity
      style={styles.prescriptionCard}
      onPress={() => handlePrescriptionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.medicationInfo}>
          <View
            style={[
              styles.pillIcon,
              {
                backgroundColor: item.isDispensed ? COLORS.greenLight : COLORS.yellowLight,
              },
            ]}
          >
            <Text
              style={[
                styles.pillIconText,
                { color: item.isDispensed ? COLORS.success : COLORS.yellow },
              ]}
            >
              {'\u2740'}
            </Text>
          </View>
          <View style={styles.medicationText}>
            <Text style={styles.medicationName} numberOfLines={1}>
              {item.medicationName}
            </Text>
            <Text style={styles.dosage} numberOfLines={1}>
              {item.dosage} - {item.frequency}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.isDispensed ? COLORS.greenLight : COLORS.yellowLight,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.isDispensed ? COLORS.success : COLORS.yellow },
            ]}
          >
            {item.isDispensed ? 'Dispensed' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{item.duration}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formatDate(item.createdAt, 'MMM d, yyyy')}</Text>
        </View>
      </View>

      {item.instructions && (
        <View style={styles.instructions}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText} numberOfLines={2}>
            {item.instructions}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedPrescription) return null;

    return (
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Prescription Detail</Text>
            <TouchableOpacity
              onPress={() => setShowDetail(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalMedicationHeader}>
              <View
                style={[
                  styles.modalPillIcon,
                  {
                    backgroundColor: selectedPrescription.isDispensed
                      ? COLORS.greenLight
                      : COLORS.yellowLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalPillIconText,
                    {
                      color: selectedPrescription.isDispensed
                        ? COLORS.success
                        : COLORS.yellow,
                    },
                  ]}
                >
                  {'\u2740'}
                </Text>
              </View>
              <Text style={styles.modalMedicationName}>
                {selectedPrescription.medicationName}
              </Text>
              <View
                style={[
                  styles.modalStatusBadge,
                  {
                    backgroundColor: selectedPrescription.isDispensed
                      ? COLORS.greenLight
                      : COLORS.yellowLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalStatusText,
                    {
                      color: selectedPrescription.isDispensed
                        ? COLORS.success
                        : COLORS.yellow,
                    },
                  ]}
                >
                  {selectedPrescription.isDispensed ? 'Dispensed' : 'Pending Dispensing'}
                </Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Dosage</Text>
              <Text style={styles.modalSectionText}>
                {selectedPrescription.dosage}
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Frequency</Text>
              <Text style={styles.modalSectionText}>
                {selectedPrescription.frequency}
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Duration</Text>
              <Text style={styles.modalSectionText}>
                {selectedPrescription.duration}
              </Text>
            </View>
            {selectedPrescription.instructions && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Instructions</Text>
                <Text style={styles.modalSectionText}>
                  {selectedPrescription.instructions}
                </Text>
              </View>
            )}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Prescribed On</Text>
              <Text style={styles.modalSectionText}>
                {formatDate(selectedPrescription.createdAt)}
              </Text>
            </View>
            {selectedPrescription.isDispensed && selectedPrescription.dispensedAt && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Dispensed On</Text>
                <Text style={styles.modalSectionText}>
                  {formatDate(selectedPrescription.dispensedAt)}
                </Text>
              </View>
            )}
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
      <FlatList
        data={prescriptions}
        renderItem={renderPrescription}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={'\u2740'}
            title="No Prescriptions"
            subtitle="Your prescriptions from medical consultations will appear here."
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 20,
    paddingBottom: 20,
  },
  prescriptionCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  pillIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pillIconText: {
    fontSize: 18,
  },
  medicationText: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dosage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  instructions: {
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  instructionsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  // Modal
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
  modalMedicationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalPillIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPillIconText: {
    fontSize: 28,
  },
  modalMedicationName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '600',
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
});
