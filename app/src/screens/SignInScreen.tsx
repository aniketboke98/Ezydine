import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
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
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { EzyDineLogo } from '../components/EzyDineLogo';
import { api } from '../services/api';

interface SignInScreenProps {
  onProceedToOtp: (identifier: string, demoOtp?: string) => void;
  onBackToSplash?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onProceedToOtp,
  onBackToSplash,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = async () => {
    Keyboard.dismiss();
    if (!identifier || identifier.trim().length < 5) {
      setErrorMsg('Please enter a valid mobile number or email');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const response = await api.auth.sendOtp(identifier.trim());
      if (response && response.success) {
        onProceedToOtp(identifier.trim(), response.otp);
      } else {
        setErrorMsg(response?.error || 'This mobile number is not registered. Please contact Master Admin.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'This mobile number is not registered. Please contact Master Admin to create your account.');
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header with Back and Official Logo */}
            <View style={styles.header}>
              {onBackToSplash && (
                <TouchableOpacity
                  onPress={onBackToSplash}
                  activeOpacity={0.7}
                  style={styles.backBtn}
                >
                  <Ionicons name="arrow-back" size={22} color={Colors.navy} />
                </TouchableOpacity>
              )}
              <EzyDineLogo width={165} />
            </View>

            {/* Title & Subtitle */}
            <View style={styles.heroSection}>
              <View style={styles.badgeTwoStep}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.primaryRed} />
                <Text style={styles.badgeTwoStepText}>2-STEP AUTHENTICATION</Text>
              </View>
              <Text style={styles.heroTitle}>A fresh start.</Text>
              <Text style={styles.heroTitle}>A smoother service.</Text>
              <Text style={styles.heroSubtitle}>
                Enter your registered mobile or email to receive your secure 6-digit OTP code.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile number or email</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focused && styles.inputContainerFocused,
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color={Colors.secondaryText}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.input}
                    value={identifier}
                    onChangeText={(val) => {
                      setIdentifier(val);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter 10-digit mobile or email"
                    placeholderTextColor={Colors.secondaryText}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                </View>
              </View>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.primaryRed} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Continue to OTP Button */}
              <TouchableOpacity
                style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.signInBtnText}>Send Verification Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Security Assurance */}
            <View style={styles.securityRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={Colors.secondaryText}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.securityText}>
                Protected by end-to-end encryption & device limit authorization
              </Text>
            </View>

            {/* Footer Support */}
            <View style={styles.footer}>
              <Text style={styles.footerSupportText}>
                Need a hand?{' '}
                <Text
                  style={styles.contactSupportText}
                  onPress={() => Alert.alert('Support', '24/7 Support line: +91 800-EZY-DINE')}
                >
                  Contact support
                </Text>
              </Text>
            </View>
          </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
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
    marginBottom: 28,
  },
  badgeTwoStep: {
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
  badgeTwoStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryRed,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.secondaryText,
    marginTop: 12,
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },
  inputContainerFocused: {
    borderColor: Colors.primaryRed,
    backgroundColor: '#FFFDFD',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.navy,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.primaryRed,
    fontWeight: '500',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  presetLabel: {
    fontSize: 12,
    color: Colors.secondaryText,
    fontWeight: '500',
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
  signInBtn: {
    backgroundColor: Colors.primaryRed,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: Colors.secondaryText,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  footerSupportText: {
    fontSize: 13,
    color: Colors.secondaryText,
  },
  contactSupportText: {
    color: Colors.primaryRed,
    fontWeight: '600',
  },
});
