import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';

export default function MenuScreen({ navigation }) {
    const menuItems = [
        { id: '1', title: 'User Info', icon: '👤', screen: 'EditProfile' },
        { id: '2', title: 'Settings', icon: '⚙️', screen: 'Settings' },
    ];

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Menu</Text>
                </View>

                <ScrollView style={styles.scrollView}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={async () => {
                                // If the user taps User Info but is not logged in, redirect to Login
                                if (item.screen === 'UserInfo' || item.screen === 'EditProfile') {
                                    const loggedIn = await Commons.getFromAS(Constants.IS_LOGGED_IN);
                                    if (loggedIn !== 'true') {
                                        return navigation.navigate('Login');
                                    }
                                }

                                navigation.navigate(item.screen);
                            }}
                        >
                            <View style={styles.iconWrapper}>
                                <Text style={styles.menuIcon}>{item.icon}</Text>
                            </View>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.menuItem, styles.logoutItem]}
                        onPress={() => {
                            Alert.alert(
                                'Confirm Logout',
                                'Are you sure you want to logout?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Logout',
                                        style: 'destructive',
                                        onPress: async () => {
                                            await Commons.removeFromAS(Constants.IS_LOGGED_IN);
                                            await Commons.removeFromAS(Constants.USER_NAME);
                                            await Commons.removeFromAS(Constants.USER_EMAIL);
                                            await Commons.removeFromAS(Constants.USER_PHONE);
                                            await Commons.removeFromAS(Constants.USER_MEMBER_SINCE);
                                            await Commons.removeFromAS(Constants.USER_PROFILE_IMAGE);
                                            navigation.navigate('Main');
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <View style={[styles.iconWrapper, styles.logoutIconWrapper]}>
                            <Text style={styles.menuIcon}>⎋</Text>
                        </View>
                        <Text style={[styles.menuTitle, styles.logoutText]}>Logout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.menuItem, styles.backItem]}
                        onPress={() => navigation.goBack()}
                    >
                        <View style={styles.iconWrapper}>
                            <Text style={styles.menuIcon}>←</Text>
                        </View>
                        <Text style={styles.menuTitle}>Back to Home</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.88),
        padding: theme.spacing.xl,
        paddingTop: theme.spacing.xxl,
    },
    headerTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    scrollView: {
        flex: 1,
        padding: theme.spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.64),
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        elevation: 2,
        shadowColor: Commons.hexToRgba(theme.colors.secondary, 0.35),
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    menuIcon: {
        fontSize: 24,
        color: theme.colors.primary,
    },
    iconWrapper: {
        width: 46,
        height: 46,
        borderRadius: 46 / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.12),
    },
    menuTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
    },
    menuArrow: {
        fontSize: 30,
        color: theme.colors.primary,
    },
    backItem: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.5),
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.55),
    },
    logoutItem: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.5),
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.5),
    },
    logoutIconWrapper: {
        backgroundColor: Commons.hexToRgba(theme.colors.error, 0.14),
    },
    logoutText: {
        color: theme.colors.error,
    }
});
