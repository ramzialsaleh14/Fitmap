import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as ServerOperations from '../utils/ServerOperations';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import { useTranslation } from '../utils/Strings';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [isRetrieving, setIsRetrieving] = useState(false);
    const { t } = useTranslation();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('error'), t('please_fill_all_fields'));
            return;
        }
        // TODO: Add actual login authentication
        const resp = await ServerOperations.checkLogin(email, password);
        if (resp && resp.res) {
            // Save user info to AsyncStorage
            await Commons.saveToAS(Constants.IS_LOGGED_IN, 'true');
            await Commons.saveToAS(Constants.USER_EMAIL, email);
            await Commons.saveToAS(Constants.USER_PASSWORD, password);
            await Commons.saveToAS(Constants.USER_NAME, resp.name || 'User');
            await Commons.saveToAS(Constants.USER_PHONE, resp.phone || '');
            await Commons.saveToAS(Constants.USER_PROFILE_IMAGE, resp.photo || '');
            await Commons.saveToAS(Constants.USER_MEMBER_SINCE, resp.date);
            await Commons.saveToAS(Constants.USER_TYPE, resp.type);

            // Save free visits if available
            if (resp.freeVisits) {
                await Commons.saveToAS(Constants.USER_FREE_VISITS, JSON.stringify(resp.freeVisits));
            }

            // Navigate based on user type
            if (resp.type === 'Gym') {
                navigation.navigate('GymMain');
            } else {
                navigation.navigate('Main');
            }
        } else {
            Alert.alert(t('error'), resp.msg || t('login_failed'));
        }
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>{t('welcome_back')}</Text>
                    <Text style={styles.subtitle}>{t('login_to_account')}</Text>

                    <View style={styles.form}>
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

                        <Text style={styles.label}>{t('password')}</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder={t('enter_password')}
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry={true}
                        />

                        <TouchableOpacity style={styles.forgotPassword} onPress={() => { setForgotEmail(email || ''); setShowForgotModal(true); }}>
                            <Text style={styles.forgotPasswordText}>{t('forgot_password')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginButtonText}>{t('login')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerLink}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.registerLinkText}>
                                {t('dont_have_account')} <Text style={styles.registerLinkBold}>{t('register')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Forgot Password Modal */}
            <Modal
                visible={showForgotModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowForgotModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>{t('restore_password')}</Text>

                        <Text style={styles.label}>{t('email_username')}</Text>
                        <TextInput
                            style={styles.input}
                            value={forgotEmail}
                            onChangeText={setForgotEmail}
                            placeholder={t('confirm_email')}
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowForgotModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={async () => {
                                    if (!forgotEmail) return Alert.alert(t('error'), t('please_enter_email'));
                                    setIsRetrieving(true);
                                    try {
                                        const resp = await ServerOperations.restorePassword(forgotEmail);
                                        if (resp && resp.res) {
                                            Alert.alert(t('success'), t('password_sent'), [{ text: 'OK', onPress: () => setShowForgotModal(false) }]);
                                        } else {
                                            Alert.alert(t('error'), resp.msg || t('failed_restore'));
                                        }
                                    } catch (error) {
                                        console.error('Error retrieving password:', error);
                                        Alert.alert(t('error'), t('failed_restore'));
                                    } finally {
                                        setIsRetrieving(false);
                                    }
                                }}
                            >
                                {isRetrieving ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.saveButtonText}>{t('restore_password')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingTop: theme.spacing.xxl,
    },
    logoContainer: {
        alignItems: 'center',
        marginVertical: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    logoBackground: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        elevation: 3,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
    },
    logoImage: {
        width: 180,
        height: 130,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    logoText: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.white,
        letterSpacing: 1,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: theme.spacing.sm,
    },
    forgotPasswordText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    loginButton: {
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
    loginButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
    },
    registerLink: {
        marginTop: theme.spacing.lg,
        alignItems: 'center',
    },
    registerLinkText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
    },
    registerLinkBold: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        elevation: 5,
    },
    modalTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    modalSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.md,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: theme.spacing.md,
    },
    button: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: theme.spacing.sm,
    },
    cancelButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        minWidth: 140,
    },
    saveButtonText: {
        color: theme.colors.white,
        fontWeight: '700',
    },
});
