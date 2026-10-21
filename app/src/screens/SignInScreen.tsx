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

export interface RegistrationPayload {
  fullName: string;
  phone: string;
  email?: string;
  restaurantName: string;
  location?: string;
}

interface SignInScreenProps {
  onProceedToOtp: (identifier: string, demoOtp?: string, registrationData?: RegistrationPayload) => void;
  onBackToSplash?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onProceedToOtp,
  onBackToSplash,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login state
  const [identifier, setIdentifier] = useState('');
  
  // Register state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [location, setLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendLoginOtp = async () => {
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
        setErrorMsg(response?.error || 'Account not registered.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No registered account found with this number.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!fullName.trim() || !phone.trim() || !restaurantName.trim()) {
      setErrorMsg('Full Name, Mobile Number, and Restaurant Name are required.');
      return;
    }

    if (phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    const payload: RegistrationPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      restaurantName: restaurantName.trim(),
      location: location.trim() || 'Main Branch',
    };

    try {
      const response = await api.auth.register(payload);
      if (response && response.success) {
        onProceedToOtp(phone.trim(), response.otp, payload);
      } else {
        setErrorMsg(response?.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
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

            {/* Mode Switcher: Sign In vs Register */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                onPress={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
              >
                <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
                onPress={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
              >
                <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>
                  Register Restaurant
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title & Subtitle */}
            <View style={styles.heroSection}>
              <View style={styles.badgeTwoStep}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.primaryRed} />
                <Text style={styles.badgeTwoStepText}>
                  {mode === 'login' ? '2-STEP AUTHENTICATION' : 'INSTANT ONBOARDING'}
                </Text>
              </View>
              <Text style={styles.heroTitle}>
                {mode === 'login' ? 'Welcome Back.' : 'Launch Your POS.'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {mode === 'login'
                  ? 'Enter your registered mobile number to receive a secure OTP code.'
                  : 'Set up your restaurant account and manage orders in minutes.'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {mode === 'login' ? (
                // LOGIN FIELDS
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Registered Mobile or Email</Text>
                  <View style={styles.inputContainer}>
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
                      placeholder="e.g. 9876543210"
                      placeholderTextColor={Colors.secondaryText}
                      autoCapitalize="none"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              ) : (
                // REGISTRATION FIELDS
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Your Full Name *</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={20} color={Colors.secondaryText} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="e.g. Rahul Sharma"
                        placeholderTextColor={Colors.secondaryText}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mobile Number *</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="call-outline" size={20} color={Colors.secondaryText} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={Colors.secondaryText}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Restaurant / Café Name *</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="restaurant-outline" size={20} color={Colors.secondaryText} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        value={restaurantName}
                        onChangeText={setRestaurantName}
                        placeholder="e.g. The Grand Bistro"
                        placeholderTextColor={Colors.secondaryText}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location / Branch (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="location-outline" size={20} color={Colors.secondaryText} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="e.g. Indiranagar, Bengaluru"
                        placeholderTextColor={Colors.secondaryText}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address (Optional)</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={20} color={Colors.secondaryText} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="e.g. owner@bistro.in"
                        placeholderTextColor={Colors.secondaryText}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>
                </>
              )}

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.primaryRed} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                  {mode === 'login' && errorMsg.includes('not registered') && (
                    <TouchableOpacity
                      onPress={() => {
                        setMode('register');
                        if (identifier.match(/^\d+$/)) setPhone(identifier);
                        setErrorMsg('');
                      }}
                      style={styles.switchModeInline}
                    >
                      <Text style={styles.switchModeInlineText}>Click here to Register →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
                onPress={mode === 'login' ? handleSendLoginOtp : handleRegister}
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
                    <Text style={styles.signInBtnText}>
                      {mode === 'login' ? 'Send Verification Code' : 'Register & Send OTP'}
                    </Text>
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
                Protected by PostgreSQL encryption & multi-tenant isolation
              </Text>
            </View>

            {/* Footer Support */}
            <View style={styles.footer}>
              <Text style={styles.footerSupportText}>
                Need assistance?{' '}
                <Text
                  style={styles.contactSupportText}
                  onPress={() => Alert.alert('Support', '24/7 EzyDine Support line: +91 800-EZY-DINE')}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondaryText,
  },
  modeTabTextActive: {
    color: Colors.navy,
    fontWeight: '700',
  },
  heroSection: {
    marginBottom: 24,
  },
  badgeTwoStep: {
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
  badgeTwoStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryRed,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginTop: 8,
    lineHeight: 20,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.navy,
  },
  errorBox: {
    flexDirection: 'column',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  errorText: {
    color: Colors.primaryRed,
    fontSize: 13,
    fontWeight: '500',
  },
  switchModeInline: {
    marginTop: 4,
  },
  switchModeInlineText: {
    color: Colors.primaryRed,
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  signInBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryRed,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primaryRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signInBtnDisabled: {
    opacity: 0.7,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
  securityText: {
    fontSize: 11,
    color: Colors.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
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
