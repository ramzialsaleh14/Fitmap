import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as ServerOperations from '../utils/ServerOperations';

export default function RegisterScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

    const handleSendOtp = async () => {
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setIsSendingOtp(true);
        const response = await ServerOperations.sendEmailOtp(email);
        setIsSendingOtp(false);

        if (response && response.res) {
            setOtpSent(true);
            Alert.alert('OTP Sent', `A verification code has been sent to ${email}`);
        } else {
            Alert.alert('Error', response?.msg || 'Failed to send OTP. Please try again.');
        }
    };

    const handleVerifyAndRegister = async () => {
        if (!otp || otp.trim().length === 0) {
            Alert.alert('Error', 'Please enter the OTP');
            return;
        }

        setIsVerifying(true);
        const verifyResponse = await ServerOperations.verifyOtp(email, otp);

        if (verifyResponse && verifyResponse.res) {
            // OTP verified, proceed with registration
            const registerResponse = await ServerOperations.registerUser(fullName, email, phone, password);
            setIsVerifying(false);

            if (registerResponse && registerResponse.res) {
                Alert.alert('Success', 'Registration successful. Please log in.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', registerResponse?.msg || 'Registration failed. Please try again.');
            }
        } else {
            setIsVerifying(false);
            Alert.alert('Error', verifyResponse?.msg || 'Invalid OTP. Please try again.');
        }
    };

    const handleResendOtp = async () => {
        setIsSendingOtp(true);
        const response = await ServerOperations.sendEmailOtp(email);
        setIsSendingOtp(false);

        if (response && response.res) {
            setOtp('');
            Alert.alert('OTP Resent', 'A new verification code has been sent to your email');
        } else {
            Alert.alert('Error', response?.msg || 'Failed to resend OTP. Please try again.');
        }
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join Fitmap to find your perfect gym</Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Enter your full name"
                            placeholderTextColor={theme.colors.textLight}
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter your phone number"
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Create a password"
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry={true}
                        />

                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm your password"
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry={true}
                            editable={!otpSent}
                        />

                        {otpSent && (
                            <>
                                <Text style={styles.label}>Verification Code</Text>
                                <TextInput
                                    style={styles.input}
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholder="Enter 6-digit OTP"
                                    placeholderTextColor={theme.colors.textLight}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />

                                <TouchableOpacity style={styles.resendLink} onPress={handleResendOtp} disabled={isSendingOtp}>
                                    <Text style={styles.resendLinkText}>
                                        {isSendingOtp ? 'Sending...' : 'Didn\'t receive code? Resend OTP'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {!otpSent ? (
                            <TouchableOpacity
                                style={[styles.registerButton, isSendingOtp && styles.registerButtonDisabled]}
                                onPress={handleSendOtp}
                                disabled={isSendingOtp}
                            >
                                <Text style={styles.registerButtonText}>
                                    {isSendingOtp ? 'Sending OTP...' : 'Send Verification Code'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.registerButton, isVerifying && styles.registerButtonDisabled]}
                                onPress={handleVerifyAndRegister}
                                disabled={isVerifying}
                            >
                                <Text style={styles.registerButtonText}>
                                    {isVerifying ? 'Verifying...' : 'Verify & Register'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
                            <Text style={styles.loginLinkText}>
                                Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xl,
    },
    form: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
    },
    registerButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    registerButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
    },
    registerButtonDisabled: {
        opacity: 0.6,
    },
    resendLink: {
        marginTop: theme.spacing.sm,
        alignItems: 'flex-end',
    },
    resendLinkText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    loginLink: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
    },
    loginLinkText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
    },
    loginLinkBold: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});
