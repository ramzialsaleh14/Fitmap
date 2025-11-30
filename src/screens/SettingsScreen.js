import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import { MaterialIcons } from '@expo/vector-icons';
import * as Commons from '../utils/Commons';
import { useTranslation } from '../utils/Strings';
import * as Constants from '../utils/Constants';

export default function SettingsScreen() {
    const [notifications, setNotifications] = useState(true);
    const [locationServices, setLocationServices] = useState(true);
    // Dark mode removed in favor of language selection
    const { t, locale, setLanguage } = useTranslation();

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
        // If the user is turning location services OFF, just save preference
        if (!value) {
            setLocationServices(false);
            await Commons.saveToAS(Constants.USE_LOCATION, 'false');
            return;
        }

        // Request permission when turning ON
        try {
            const Location = require('expo-location');

            // First check device-level location services
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
                Alert.alert(
                    t('open_settings'),
                    t('turn_on_location_services'),
                    [
                        { text: t('open_settings'), onPress: () => Linking.openSettings() },
                        { text: 'Cancel', style: 'cancel' },
                    ],
                    { cancelable: true }
                );
                setLocationServices(false);
                await Commons.saveToAS(Constants.USE_LOCATION, 'false');
                return;
            }

            // Check existing permission state first
            const existingPerm = await Location.getForegroundPermissionsAsync();
            if (existingPerm.status === 'granted') {
                // Already granted
                setLocationServices(true);
                await Commons.saveToAS(Constants.USE_LOCATION, 'true');
                return;
            }

            // If the permission status is undetermined, then request it (the OS will prompt)
            if (!existingPerm.granted && existingPerm.status !== 'denied') {
                const result = await Location.requestForegroundPermissionsAsync();
                if (result.status === 'granted') {
                    setLocationServices(true);
                    await Commons.saveToAS(Constants.USE_LOCATION, 'true');
                    return;
                }
            }

            // If we get here the permission is denied or blocked — prompt user to open app settings
            Alert.alert(
                t('error'),
                t('location_permission_denied'),
                [
                    { text: t('open_settings'), onPress: () => Linking.openSettings() },
                    { text: 'Cancel', style: 'cancel' },
                ],
                { cancelable: true }
            );
            setLocationServices(false);
            await Commons.saveToAS(Constants.USE_LOCATION, 'false');
        } catch (err) {
            console.error('Error requesting location permission', err);
            setLocationServices(false);
            await Commons.saveToAS(Constants.USE_LOCATION, 'false');
        }
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('preferences')}</Text>

                    <View style={styles.settingCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>{t('notifications')}</Text>
                                <Text style={styles.settingDescription}>{t('receive_updates')}</Text>
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
                                <Text style={styles.settingLabel}>{t('location_services')}</Text>
                                <Text style={styles.settingDescription}>{t('find_gyms_near')}</Text>
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
                                <Text style={styles.settingLabel}>{t('language')}</Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity
                                    style={[styles.langButton, locale === 'en' ? styles.langSelected : null]}
                                    onPress={() => setLanguage('en')}
                                >
                                    <Text style={styles.langText}>{t('english')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.langButton, locale === 'ar' ? styles.langSelected : null]}
                                    onPress={() => setLanguage('ar')}
                                >
                                    <Text style={styles.langText}>{t('arabic')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('about')}</Text>

                    <View style={styles.settingCard}>
                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>{t('privacy_policy')}</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={22} color={theme.colors.textLight} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>{t('terms_of_service')}</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={22} color={theme.colors.textLight} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.linkRow}>
                            <Text style={styles.linkText}>{t('help_support')}</Text>
                            <MaterialIcons name="keyboard-arrow-right" size={22} color={theme.colors.textLight} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>{t('fitmap_version')}</Text>
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
    langButton: {
        marginLeft: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    langSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    langText: {
        color: theme.colors.text,
        fontWeight: '600',
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
