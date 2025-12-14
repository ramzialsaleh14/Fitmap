import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';
import { useTranslation } from '../utils/Strings';

export default function UserInfoScreen() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: '',
        memberSince: '',
        profileImage: null,
        type: null,
        freeVisits: null,
    });

    const refreshUserData = async () => {
        // Load data from storage immediately (except free visits)
        await loadUserDataFromStorage(false);

        // Show loading for free visits
        setIsRefreshing(true);

        try {
            const email = await Commons.getFromAS(Constants.USER_EMAIL);
            const password = await Commons.getFromAS(Constants.USER_PASSWORD);

            if (email && password) {
                const response = await ServerOperations.checkLogin(email, password);

                if (response && response.res) {
                    // Update AsyncStorage with fresh data
                    if (response.name) {
                        await Commons.saveToAS(Constants.USER_NAME, response.name);
                    }
                    if (response.phone) {
                        await Commons.saveToAS(Constants.USER_PHONE, response.phone);
                    }
                    if (response.date) {
                        await Commons.saveToAS(Constants.USER_MEMBER_SINCE, response.date);
                    }
                    if (response.photo) {
                        await Commons.saveToAS(Constants.USER_PROFILE_IMAGE, response.photo);
                    }
                    if (response.type) {
                        await Commons.saveToAS(Constants.USER_TYPE, response.type);
                    }
                    if (response.freeVisits) {
                        await Commons.saveToAS(Constants.USER_FREE_VISITS, JSON.stringify(response.freeVisits));
                    }

                    // Reload user data with free visits
                    await loadUserDataFromStorage(true);
                }
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const loadUserDataFromStorage = async (includeFreeVisits = true) => {
        const name = await Commons.getFromAS(Constants.USER_NAME);
        const email = await Commons.getFromAS(Constants.USER_EMAIL);
        const type = await Commons.getFromAS(Constants.USER_TYPE);
        const phone = await Commons.getFromAS(Constants.USER_PHONE);
        const memberSince = await Commons.getFromAS(Constants.USER_MEMBER_SINCE);
        const profileImage = await Commons.getFromAS(Constants.USER_PROFILE_IMAGE);

        let freeVisits = null;
        if (includeFreeVisits) {
            const freeVisitsStr = await Commons.getFromAS(Constants.USER_FREE_VISITS);
            if (freeVisitsStr) {
                try {
                    freeVisits = JSON.parse(freeVisitsStr);
                } catch (e) {
                    console.error('Error parsing freeVisits:', e);
                }
            }
        }

        setUser({
            name: name || 'User',
            email: email || 'No email',
            phone: phone || 'No phone',
            memberSince: memberSince || 'N/A',
            profileImage: profileImage || null,
            type: type || null,
            freeVisits: freeVisits,
        });
    };

    useFocusEffect(
        React.useCallback(() => {
            refreshUserData();
        }, [])
    );

    const handleLogout = () => {
        Alert.alert(
            t('confirm_logout_title') || 'Confirm Logout',
            t('confirm_logout_message') || 'Are you sure you want to logout?',
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                    text: t('logout'),
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
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {user.profileImage ? (
                            <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.memberSince}>{t('member_since')} {user.memberSince}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('user_info')}</Text>

                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            {((user.type || '').toLowerCase() === 'gym') ? (
                                <>
                                    <Text style={styles.infoLabel}>{t('username')}</Text>
                                    <Text style={styles.infoValue}>{user.name}</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.infoLabel}>{t('email')}</Text>
                                    <Text style={styles.infoValue}>{user.email}</Text>
                                </>
                            )}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('phone')}</Text>
                            <Text style={styles.infoValue}>{user.phone}</Text>
                        </View>
                    </View>
                </View>

                {user.type !== 'Gym' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('free_entries')}</Text>
                        <View style={styles.infoCard}>
                            {isRefreshing && !user.freeVisits ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                    <Text style={styles.loadingText}>{t('loading')}...</Text>
                                </View>
                            ) : user.freeVisits ? (
                                <>
                                    {user.freeVisits.platinum && user.freeVisits.platinum !== '0' && (
                                        <>
                                            <View style={styles.freeEntriesRow}>
                                                <Text style={styles.categoryLabel}>{t('category_platinum')}</Text>
                                                <View style={styles.starsContainer}>
                                                    {[...Array(parseInt(user.freeVisits.platinum))].map((_, i) => (
                                                        <MaterialIcons key={i} name="star" size={20} color={theme.colors.platinum} style={styles.starIcon} />
                                                    ))}
                                                </View>
                                            </View>
                                            <View style={styles.divider} />
                                        </>
                                    )}
                                    {user.freeVisits.gold && user.freeVisits.gold !== '0' && (
                                        <>
                                            <View style={styles.freeEntriesRow}>
                                                <Text style={styles.categoryLabel}>{t('category_gold')}</Text>
                                                <View style={styles.starsContainer}>
                                                    {[...Array(parseInt(user.freeVisits.gold))].map((_, i) => (
                                                        <MaterialIcons key={i} name="star" size={20} color={theme.colors.gold} style={styles.starIcon} />
                                                    ))}
                                                </View>
                                            </View>
                                            <View style={styles.divider} />
                                        </>
                                    )}
                                    {user.freeVisits.silver && user.freeVisits.silver !== '0' && (
                                        <>
                                            <View style={styles.freeEntriesRow}>
                                                <Text style={styles.categoryLabel}>{t('category_silver')}</Text>
                                                <View style={styles.starsContainer}>
                                                    {[...Array(parseInt(user.freeVisits.silver))].map((_, i) => (
                                                        <MaterialIcons key={i} name="star" size={20} color={theme.colors.silver} style={styles.starIcon} />
                                                    ))}
                                                </View>
                                            </View>
                                            <View style={styles.divider} />
                                        </>
                                    )}
                                    {user.freeVisits.bronze && user.freeVisits.bronze !== '0' && (
                                        <View style={styles.freeEntriesRow}>
                                            <Text style={styles.categoryLabel}>{t('category_bronze')}</Text>
                                            <View style={styles.starsContainer}>
                                                {[...Array(parseInt(user.freeVisits.bronze))].map((_, i) => (
                                                    <MaterialIcons key={i} name="star" size={20} color={theme.colors.bronze} style={styles.starIcon} />
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </>
                            ) : null}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            // If this is a gym user, open gym general info screen for editing the gym
                            if ((user.type || '').toLowerCase() === 'gym') {
                                // pass the user's email so GymGeneralInfoScreen can load gym data
                                navigation.navigate('GymGeneralInfo', { userEmail: user.email });
                            } else {
                                navigation.navigate('EditProfile');
                            }
                        }}
                    >
                        <Text style={styles.actionButtonText}>{t('edit_profile')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleLogout}>
                        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>{t('logout')}</Text>
                    </TouchableOpacity>
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
    header: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    avatarContainer: {
        marginBottom: theme.spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: theme.colors.card,
    },
    avatarText: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    name: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginBottom: theme.spacing.xs,
    },
    memberSince: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.white,
        opacity: 0.9,
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
    infoCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    infoRow: {
        paddingVertical: theme.spacing.md,
    },
    infoLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xs,
    },
    infoValue: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
    },
    actionButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    actionButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    dangerButton: {
        backgroundColor: theme.colors.error,
    },
    dangerButtonText: {
        color: theme.colors.white,
    },
    freeEntriesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
    },
    categoryLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: '600',
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starIcon: {
        marginLeft: 2,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.xl,
    },
    loadingText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        marginLeft: theme.spacing.sm,
    },
});
