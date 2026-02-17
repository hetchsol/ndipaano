import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor, getStatusBackgroundColor, getStatusLabel } from '../utils/helpers';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const backgroundColor = getStatusBackgroundColor(status);
  const label = getStatusLabel(status);

  return (
    <View style={[styles.badge, { backgroundColor }, size === 'small' && styles.badgeSmall]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[styles.text, { color }, size === 'small' && styles.textSmall]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
});
