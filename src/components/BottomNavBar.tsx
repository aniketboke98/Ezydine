import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ScreenType } from '../types';

interface BottomNavBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
}) => {
  const tabs = [
    {
      id: 'dashboard' as ScreenType,
      label: 'Home',
      icon: (active: boolean) => (
        <Ionicons
          name={active ? 'grid' : 'grid-outline'}
          size={20}
          color={active ? Colors.primaryRed : Colors.secondaryText}
        />
      ),
    },
    {
      id: 'new_bill' as ScreenType,
      label: 'Billing',
      icon: (active: boolean) => (
        <Ionicons
          name={active ? 'receipt' : 'receipt-outline'}
          size={20}
          color={active ? Colors.primaryRed : Colors.secondaryText}
        />
      ),
    },
    {
      id: 'menu_management' as ScreenType,
      label: 'Menu',
      icon: (active: boolean) => (
        <Ionicons
          name={active ? 'restaurant' : 'restaurant-outline'}
          size={20}
          color={active ? Colors.primaryRed : Colors.secondaryText}
        />
      ),
    },
    {
      id: 'kitchen' as ScreenType,
      label: 'Kitchen',
      icon: (active: boolean) => (
        <MaterialCommunityIcons
          name="chef-hat"
          size={22}
          color={active ? Colors.primaryRed : Colors.secondaryText}
        />
      ),
    },
    {
      id: 'my_subscription' as ScreenType,
      label: 'Plans',
      icon: (active: boolean) => (
        <Ionicons
          name={active ? 'sparkles' : 'sparkles-outline'}
          size={20}
          color={active ? Colors.primaryRed : Colors.secondaryText}
        />
      ),
    },
    {
      id: 'profile' as ScreenType,
      label: 'Profile',
      icon: (active: boolean) => (
        <Ionicons
          name={active ? 'person' : 'person-outline'}
          size={20}
          color={active ? Colors.primaryRed : Colors.secondaryText}
        />
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive =
          currentScreen === tab.id ||
          (tab.id === 'my_subscription' &&
            (currentScreen === 'subscription' ||
              currentScreen === 'plan_details' ||
              currentScreen === 'upgrade_renewal' ||
              currentScreen === 'subscription_history'));

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onNavigate(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              {tab.icon(isActive)}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    padding: 2,
  },
  iconWrapActive: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.secondaryText,
  },
  labelActive: {
    color: Colors.primaryRed,
    fontWeight: '700',
  },
});
