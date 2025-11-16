import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';

export default function MenuScreen({ navigation }) {
    const menuItems = [
        { id: '1', title: 'User Info', icon: '👤', screen: 'UserInfo' },
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
                                if (item.screen === 'UserInfo') {
                                    const loggedIn = await Commons.getFromAS(Constants.IS_LOGGED_IN);
                                    if (loggedIn !== 'true') {
                                        return navigation.navigate('Login');
                                    }
                                }

                                navigation.navigate(item.screen);
                            }}
                        >
                            <Text style={styles.menuIcon}>{item.icon}</Text>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuArrow}>›</Text>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={[styles.menuItem, styles.backItem]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.menuIcon}>←</Text>
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
        backgroundColor: theme.colors.primary,
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
        backgroundColor: theme.colors.card,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    menuIcon: {
        fontSize: 24,
        marginRight: theme.spacing.md,
        color: theme.colors.primary,
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
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
});
