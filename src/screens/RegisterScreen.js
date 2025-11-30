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
import { useTranslation } from '../utils/Strings';
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

    const { t } = useTranslation();

    const handleSendOtp = async () => {
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            Alert.alert(t('error'), t('please_fill_all_fields'));
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert(t('error'), t('passwords_mismatch'));
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert(t('error'), t('invalid_email'));
            return;
        }

        setIsSendingOtp(true);
        const response = await ServerOperations.sendEmailOtp(email);
        setIsSendingOtp(false);

        if (response && response.res) {
            setOtpSent(true);
            Alert.alert(t('success'), t('otp_sent'));
        } else {
            Alert.alert(t('error'), response?.msg || t('registration_failed'));
        }
    };

    const handleVerifyAndRegister = async () => {
        if (!otp || otp.trim().length === 0) {
            Alert.alert(t('error'), t('please_fill_all_fields'));
            return;
        }

        setIsVerifying(true);
        const verifyResponse = await ServerOperations.verifyOtp(email, otp);

        if (verifyResponse && verifyResponse.res) {
            // OTP verified, proceed with registration
            const registerResponse = await ServerOperations.registerUser(fullName, email, phone, password);
            setIsVerifying(false);

            if (registerResponse && registerResponse.res) {
                Alert.alert(t('success'), t('registration_success'), [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert(t('error'), registerResponse?.msg || t('registration_failed'));
            }
        } else {
            setIsVerifying(false);
            Alert.alert(t('error'), verifyResponse?.msg || t('invalid_otp'));
        }
    };

    const handleResendOtp = async () => {
        setIsSendingOtp(true);
        const response = await ServerOperations.sendEmailOtp(email);
        setIsSendingOtp(false);

        if (response && response.res) {
            setOtp('');
            Alert.alert(t('success'), t('otp_resent'));
        } else {
            Alert.alert(t('error'), response?.msg || t('registration_failed'));
        }
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>{t('create_account')}</Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>{t('full_name')}</Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder={t('enter_full_name')}
                            placeholderTextColor={theme.colors.textLight}
                        />

                        <Text style={styles.label}>{t('email')}</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t('enter_email')}
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>{t('phone')}</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder={t('enter_phone')}
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.label}>{t('password')}</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder={t('create_password')}
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry={true}
                        />

                        <Text style={styles.label}>{t('confirm_password')}</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t('confirm_password')}
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry={true}
                            editable={!otpSent}
                        />

                        {otpSent && (
                            <>
                                <Text style={styles.label}>{t('verification_code')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={otp}
                                    onChangeText={setOtp}
                                    placeholder={t('enter_otp')}
                                    placeholderTextColor={theme.colors.textLight}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                />

                                <TouchableOpacity style={styles.resendLink} onPress={handleResendOtp} disabled={isSendingOtp}>
                                    <Text style={styles.resendLinkText}>
                                        {isSendingOtp ? t('sending') : t('resend_otp')}
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
                                    {isSendingOtp ? t('sending_otp') : t('send_verification_code')}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.registerButton, isVerifying && styles.registerButtonDisabled]}
                                onPress={handleVerifyAndRegister}
                                disabled={isVerifying}
                            >
                                <Text style={styles.registerButtonText}>
                                    {isVerifying ? t('verifying') : t('verify_register')}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
                            <Text style={styles.loginLinkText}>
                                {t('already_have_account')} <Text style={styles.loginLinkBold}>{t('login')}</Text>
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
