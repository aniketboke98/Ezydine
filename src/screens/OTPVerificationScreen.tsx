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
import { RegistrationPayload } from './SignInScreen';

interface OTPVerificationScreenProps {
  identifier: string;
  demoOtp?: string;
  registrationData?: RegistrationPayload;
  onVerificationSuccess: (userData: any) => void;
  onBackToSignIn: () => void;
}

export const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  identifier,
  demoOtp,
  registrationData,
  onVerificationSuccess,
  onBackToSignIn,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);
  const [errorMessage, setErrorMessage] = useState('');

  // Show incoming OTP notification if provided
  useEffect(() => {
    if (demoOtp) {
      const timerId = setTimeout(() => {
        Alert.alert(
          'Security Verification',
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
      let response;
      if (registrationData) {
        // Registration verification
        response = await api.auth.verifyRegister({
          fullName: registrationData.fullName,
          phone: registrationData.phone,
          email: registrationData.email,
          restaurantName: registrationData.restaurantName,
          location: registrationData.location,
          otp: otp.trim(),
        });
      } else {
        // Standard Login verification
        response = await api.auth.verifyOtp(identifier, otp.trim());
      }

      if (response && response.success) {
        onVerificationSuccess(response);
      } else {
        setErrorMessage(response?.error || 'Invalid OTP code. Please try again.');
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
      let res;
      if (registrationData) {
        res = await api.auth.register(registrationData);
      } else {
        res = await api.auth.sendOtp(identifier);
      }

      if (res && res.success) {
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
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onBackToSignIn}
                activeOpacity={0.7}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color={Colors.navy} />
              </TouchableOpacity>
              <EzyDineLogo width={140} />
            </View>

            {/* Instruction Badge & Title */}
            <View style={styles.instructionSection}>
              <View style={styles.badgeShield}>
                <Ionicons name="lock-closed" size={14} color={Colors.primaryRed} />
                <Text style={styles.badgeShieldText}>
                  {registrationData ? 'NEW RESTAURANT VERIFICATION' : 'SECURE 2-STEP LOGIN'}
                </Text>
              </View>
              <Text style={styles.title}>Enter 6-digit code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit verification code to{' '}
                <Text style={styles.highlightText}>{identifier}</Text>.
              </Text>
            </View>

            {/* OTP Input Field */}
            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val.replace(/[^0-9]/g, '').slice(0, 6));
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="------"
                placeholderTextColor={Colors.border}
                autoFocus
              />
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.primaryRed} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Verify CTA */}
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
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.verifyBtnText}>
                    {registrationData ? 'Complete Registration' : 'Verify & Continue'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resend Timer */}
            <View style={styles.resendRow}>
              <Text style={styles.resendQuestion}>Didn&apos;t receive the code? </Text>
              {timer > 0 ? (
                <Text style={styles.timerText}>Resend in {timer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendAction}>Resend Code</Text>
                </TouchableOpacity>
              )}
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  instructionSection: {
    marginBottom: 28,
  },
  badgeShield: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEFEF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  badgeShieldText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryRed,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginTop: 8,
    lineHeight: 20,
  },
  highlightText: {
    fontWeight: '700',
    color: Colors.navy,
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  otpInput: {
    width: '100%',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 12,
    color: Colors.navy,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: Colors.primaryRed,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  verifyBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryRed,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnDisabled: {
    opacity: 0.7,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  resendQuestion: {
    fontSize: 14,
    color: Colors.secondaryText,
  },
  timerText: {
    fontSize: 14,
    color: Colors.secondaryText,
    fontWeight: '600',
  },
  resendAction: {
    fontSize: 14,
    color: Colors.primaryRed,
    fontWeight: '700',
  },
});
