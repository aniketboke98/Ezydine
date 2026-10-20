import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
    KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { EzyDineLogo } from '../components/EzyDineLogo';
import { api } from '../services/api';

interface OTPVerificationScreenProps {
  identifier: string;
  demoOtp?: string;
  onVerificationSuccess: (userData: any) => void;
  onBackToSignIn: () => void;
}

export const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  identifier,
  demoOtp,
  onVerificationSuccess,
  onBackToSignIn,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const [errorMessage, setErrorMessage] = useState('');

  // Notify user of incoming OTP code via simulated push/SMS
  useEffect(() => {
    if (demoOtp) {
      const timerId = setTimeout(() => {
        Alert.alert(
          'SMS: EzyDine Security',
          `Your one-time verification code is ${demoOtp}. Valid for 10 minutes.`,
          [{ text: 'OK' }]
        );
      }, 500);
      return () => clearTimeout(timerId);
    }
  }, [demoOtp]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await api.auth.verifyOtp(identifier, otp);
      if (response.success) {
        onVerificationSuccess(response);
      } else {
        setErrorMessage(response.error || 'Invalid OTP code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check network.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const res = await api.auth.sendOtp(identifier);
      if (res.success) {
        setTimer(45);
        if (res.otp) {
          Alert.alert(
            'New Code Sent',
            `A new verification code has been dispatched: ${res.otp}`
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onBackToSignIn}
                activeOpacity={0.7}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color={Colors.navy} />
              </TouchableOpacity>
              <EzyDineLogo width={150} />
            </View>

            {/* Hero / Instruction */}
            <View style={styles.heroSection}>
              <View style={styles.badgeStep}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.primaryRed} />
                <Text style={styles.badgeStepText}>STEP 2 OF 2 • TWO-FACTOR SECURITY</Text>
              </View>
              <Text style={styles.title}>Enter verification code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit OTP code to{' '}
                <Text style={styles.boldText}>{identifier || 'your device'}</Text>
              </Text>
            </View>

            {/* OTP Input Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/[^0-9]/g, '').slice(0, 6));
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor="#CBD5E1"
                autoFocus
              />
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.primaryRed} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Resend Link */}
            <View style={styles.resendRow}>
              {timer > 0 ? (
                <Text style={styles.timerText}>
                  Resend code in <Text style={{ fontWeight: '700' }}>{timer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resendBtnText}>Didn't get code? Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Verify CTA Button */}
            <TouchableOpacity
              style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.verifyBtnText}>Verify & Launch POS</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Device Info Footer */}
            <View style={styles.footerInfo}>
              <Ionicons name="hardware-chip-outline" size={14} color={Colors.secondaryText} />
              <Text style={styles.footerInfoText}>
                Active session will count toward your device limit (3 max for Standard, 6 max for Pro).
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    marginBottom: 20,
  },
  badgeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  badgeStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryRed,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginTop: 8,
    lineHeight: 20,
  },
  boldText: {
    color: Colors.navy,
    fontWeight: '600',
  },
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 24,
    gap: 12,
  },
  demoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  demoCode: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 8,
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.primaryRed,
    borderRadius: 16,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    color: Colors.navy,
    height: 64,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.primaryRed,
    fontWeight: '500',
    flex: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginVertical: 14,
  },
  timerText: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryRed,
  },
  verifyBtn: {
    backgroundColor: Colors.primaryRed,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
  },
  footerInfoText: {
    fontSize: 11,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
  },
});
