import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';

export default function SettingsScreen() {
    const [notifications, setNotifications] = useState(true);
    const [locationServices, setLocationServices] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    // Load location services preference when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            loadLocationPreference();
        }, [])
    );

    const loadLocationPreference = async () => {
        const locationPref = await Commons.getFromAS(Constants.USE_LOCATION);
        if (locationPref !== null) {
            setLocationServices(locationPref === 'true');
        }
    };

    const handleLocationServicesToggle = async (value) => {
        setLocationServices(value);
        await Commons.saveToAS(Constants.USE_LOCATION, value ? 'true' : 'false');
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Notifications</Text>
                                <Text style={styles.settingDescription}>
                                    Receive updates about new gyms and offers
                                </Text>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                thumbColor={notifications ? theme.colors.primary : theme.colors.textLight}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Location Services</Text>
                                <Text style={styles.settingDescription}>
                                    Find gyms near your location
                                </Text>
                            </View>
                            <Switch
                                value={locationServices}
                                onValueChange={handleLocationServicesToggle}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                thumbColor={locationServices ? theme.colors.primary : theme.colors.textLight}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Dark Mode</Text>
                                <Text style={styles.settingDescription}>
                                    Use dark theme (Coming soon)
                                </Text>
                            </View>
                            <Switch
                                value={darkMode}
                                onValueChange={setDarkMode}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                thumbColor={darkMode ? theme.colors.primary : theme.colors.textLight}
                                disabled={true}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>

                    <View style={styles.settingCard}>
                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>Privacy Policy</Text>
                            <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>Terms of Service</Text>
                            <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>Help & Support</Text>
                            <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>Fitmap v1.0.0</Text>
                        <Text style={styles.versionSubtext}>© 2024 Ahmad Blan</Text>
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
    section: {
        padding: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    settingCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    settingInfo: {
        flex: 1,
        marginRight: theme.spacing.md,
    },
    settingLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    settingDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: theme.spacing.md,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    linkText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: '500',
    },
    arrow: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textLight,
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
    },
    versionText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xs,
    },
    versionSubtext: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textLight,
    },
});
