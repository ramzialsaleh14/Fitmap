import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import { useTranslation } from '../utils/Strings';

export default function UserInfoScreen() {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: '',
        memberSince: '',
        profileImage: null,
        type: null,
    });

    const loadUserData = async () => {
        const name = await Commons.getFromAS(Constants.USER_NAME);
        const email = await Commons.getFromAS(Constants.USER_EMAIL);
        const type = await Commons.getFromAS(Constants.USER_TYPE);
        const phone = await Commons.getFromAS(Constants.USER_PHONE);
        const memberSince = await Commons.getFromAS(Constants.USER_MEMBER_SINCE);
        const profileImage = await Commons.getFromAS(Constants.USER_PROFILE_IMAGE);

        setUser({
            name: name || 'User',
            email: email || 'No email',
            phone: phone || 'No phone',
            memberSince: memberSince || 'N/A',
            profileImage: profileImage || null,
            type: type || null,
        });
    };

    useFocusEffect(
        React.useCallback(() => {
            loadUserData();
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
});
