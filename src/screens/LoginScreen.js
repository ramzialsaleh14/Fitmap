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
} from 'react-native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as ServerOperations from '../utils/ServerOperations';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
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
            await Commons.saveToAS(Constants.USER_MEMBER_SINCE, resp.memberSince || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

            // Navigate to the main app screen or dashboard
            navigation.navigate('Main');
        } else {
            Alert.alert('Error', resp.msg || 'Login failed. Please try again.');
        }
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Login to your account</Text>

                    <View style={styles.form}>
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

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry={true}
                        />

                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginButtonText}>Login</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerLink}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.registerLinkText}>
                                Don't have an account? <Text style={styles.registerLinkBold}>Register</Text>
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
});
