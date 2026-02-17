import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { practitionersApi, User, PractitionerSearchParams } from '../services/api';
import { COLORS, PRACTITIONER_TYPES } from '../utils/constants';
import PractitionerCard from '../components/PractitionerCard';
import EmptyState from '../components/EmptyState';
import type { MainStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const DISTANCE_OPTIONS = [5, 10, 25, 50];
const RATING_OPTIONS = [3, 4, 4.5];

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [practitioners, setPractitioners] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch {
        // Location access denied or unavailable
      }
    })();
  }, []);

  const searchPractitioners = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: PractitionerSearchParams = {
        page: 1,
        limit: 20,
      };

      if (query.trim()) params.query = query.trim();
      if (selectedType) params.type = selectedType;
      if (selectedDistance && userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radiusKm = selectedDistance;
      }
      if (selectedRating) params.minRating = selectedRating;

      const result = await practitionersApi.search(params);
      setPractitioners(result.data);
    } catch {
      setPractitioners([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedType, selectedDistance, selectedRating, userLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPractitioners();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchPractitioners]);

  const onRefresh = async () => {
    setRefreshing(true);
    await searchPractitioners();
    setRefreshing(false);
  };

  const handleBook = (practitioner: User) => {
    navigation.navigate('Booking', {
      practitionerId: practitioner.id,
      practitionerName: `${practitioner.firstName} ${practitioner.lastName}`,
    });
  };

  const handlePractitionerPress = (practitioner: User) => {
    navigation.navigate('Booking', {
      practitionerId: practitioner.id,
      practitionerName: `${practitioner.firstName} ${practitioner.lastName}`,
    });
  };

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedDistance(null);
    setSelectedRating(null);
  };

  const hasActiveFilters = selectedType || selectedDistance || selectedRating;

  const renderPractitioner = ({ item }: { item: User }) => (
    <PractitionerCard
      practitioner={item}
      distance={selectedDistance ?? undefined}
      onBook={handleBook}
      onPress={handlePractitionerPress}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Practitioner</Text>
        <Text style={styles.headerSubtitle}>Search for healthcare providers near you</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'\u2315'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or specialty..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearIcon}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterToggleText,
              showFilters && styles.filterToggleTextActive,
            ]}
          >
            {'\u2630'}
          </Text>
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Type Filter */}
          <Text style={styles.filterLabel}>Type</Text>
          <View style={styles.filterChips}>
            {PRACTITIONER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.chip,
                  selectedType === type.value && styles.chipActive,
                ]}
                onPress={() =>
                  setSelectedType(selectedType === type.value ? null : type.value)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedType === type.value && styles.chipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Distance Filter */}
          <Text style={styles.filterLabel}>Distance</Text>
          <View style={styles.filterChips}>
            {DISTANCE_OPTIONS.map((dist) => (
              <TouchableOpacity
                key={dist}
                style={[
                  styles.chip,
                  selectedDistance === dist && styles.chipActive,
                ]}
                onPress={() =>
                  setSelectedDistance(selectedDistance === dist ? null : dist)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedDistance === dist && styles.chipTextActive,
                  ]}
                >
                  {dist}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Filter */}
          <Text style={styles.filterLabel}>Min Rating</Text>
          <View style={styles.filterChips}>
            {RATING_OPTIONS.map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.chip,
                  selectedRating === rating && styles.chipActive,
                ]}
                onPress={() =>
                  setSelectedRating(selectedRating === rating ? null : rating)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedRating === rating && styles.chipTextActive,
                  ]}
                >
                  {rating}+ {'\u2605'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Searching practitioners...</Text>
        </View>
      ) : (
        <FlatList
          data={practitioners}
          renderItem={renderPractitioner}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={'\u2315'}
              title="No Practitioners Found"
              subtitle="Try adjusting your search or filters to find healthcare providers."
            />
          }
          ListHeaderComponent={
            practitioners.length > 0 ? (
              <Text style={styles.resultCount}>
                {practitioners.length} practitioner{practitioners.length !== 1 ? 's' : ''}{' '}
                found
              </Text>
            ) : null
          }
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
    padding: 4,
  },
  filterToggle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  filterToggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterToggleText: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  filterToggleTextActive: {
    color: COLORS.white,
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  clearFiltersButton: {
    alignSelf: 'center',
    marginTop: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
});
