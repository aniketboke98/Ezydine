import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { EzyDineLogo } from '../components/EzyDineLogo';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onGetStarted: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onGetStarted }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-advance to login / dashboard after 1.8 seconds
    const autoTimer = setTimeout(() => {
      onGetStarted();
    }, 1800);

    return () => clearTimeout(autoTimer);
  }, [fadeAnim, slideAnim, onGetStarted]);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onGetStarted}
      style={styles.container}
    >
      {/* Background Decorative Rings */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Circle
            cx={width * 0.7}
            cy={height * 0.25}
            r={width * 0.7}
            stroke="rgba(255, 255, 255, 0.03)"
            strokeWidth="1.5"
            fill="none"
          />
          <Circle
            cx={width * 0.7}
            cy={height * 0.25}
            r={width * 1.1}
            stroke="rgba(255, 255, 255, 0.02)"
            strokeWidth="1.5"
            fill="none"
          />
          <Circle
            cx={width * 0.2}
            cy={height * 0.85}
            r={width * 0.65}
            stroke="rgba(217, 47, 67, 0.06)"
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>
      </View>

      {/* Main Center Content */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoRow}>
          <EzyDineLogo width={250} onDark={true} />
        </View>

        {/* Red accent bar */}
        <View style={styles.accentBar} />
      </Animated.View>

      {/* Bottom Footer Info */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.cutleryBadge}>
          <Ionicons name="restaurant-outline" size={18} color="#CBD5E1" />
        </View>
        <Text style={styles.footerText}>
          Made for the rhythm of your restaurant
        </Text>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={onGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>Tap anywhere to enter</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primaryRed} />
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoRow: {
    marginBottom: 20,
    alignItems: 'center',
  },
  tagline: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 20,
    textAlign: 'center',
  },
  accentBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primaryRed,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  cutleryBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.1,
    marginBottom: 16,
    textAlign: 'center',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
});
