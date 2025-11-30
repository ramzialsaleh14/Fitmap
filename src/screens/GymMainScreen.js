import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Image,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import ScreenBackground from '../components/ScreenBackground';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingOverlay from '../components/LoadingOverlay';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';

export default function GymMainScreen() {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [gymData, setGymData] = useState(null);
    const { t } = useTranslation();
    const [user, setUser] = useState({
        name: '',
        email: '',
        profileImage: null,
    });
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const loadUserData = async () => {
        const name = await Commons.getFromAS(Constants.USER_NAME);
        const email = await Commons.getFromAS(Constants.USER_EMAIL);
        const profileImage = await Commons.getFromAS(Constants.USER_PROFILE_IMAGE);
        const loggedIn = await Commons.getFromAS(Constants.IS_LOGGED_IN);

        setUser({
            name: name || 'Gym Owner',
            email: email || '',
            profileImage: profileImage || null,
        });
        setIsLoggedIn(loggedIn === 'true');

        // Load gym data
        if (email) {
            await loadGymData(email);
        }
    };

    const loadGymData = async (email) => {
        setIsLoading(true);
        try {
            const response = await ServerOperations.getCustomerInfo(email, '');
            if (response) {
                setGymData(response);
            } else {
                Alert.alert(t('error'), t('failed_load_gym_data'));
                try {
                    await Commons.removeFromAS(Constants.IS_LOGGED_IN);
                    await Commons.removeFromAS(Constants.USER_NAME);
                    await Commons.removeFromAS(Constants.USER_EMAIL);
                    await Commons.removeFromAS(Constants.USER_PHONE);
                    await Commons.removeFromAS(Constants.USER_MEMBER_SINCE);
                    await Commons.removeFromAS(Constants.USER_PROFILE_IMAGE);
                    navigation.navigate('Login');
                } catch (err) {
                    console.warn('Error clearing session:', err);
                }
                return;
            }
        } catch (error) {
            console.error('Error loading gym data:', error);
            Alert.alert(t('error'), t('failed_load_gym_data'));
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadUserData();
        }, [])
    );

    const handleMenuPress = () => {
        navigation.navigate('Menu');
    };

    const managementOptions = [
        { id: 'general', title: t('general_information'), icon: <MaterialIcons name="info" size={22} color={theme.colors.primary} />, screen: 'GymGeneralInfo', color: theme.colors.primary },
        { id: 'services', title: t('services_text'), icon: <MaterialCommunityIcons name="dumbbell" size={22} color={theme.colors.gold} />, screen: 'GymServices', color: theme.colors.gold },
        { id: 'branches', title: t('branches'), icon: <MaterialIcons name="location-on" size={22} color={theme.colors.platinum} />, screen: 'GymBranches', color: theme.colors.platinum },
        { id: 'subscriptions', title: t('subscriptions'), icon: <MaterialIcons name="credit-card" size={22} color={theme.colors.silver} />, screen: 'GymSubscriptions', color: theme.colors.silver },
        { id: 'trainers', title: t('trainers'), icon: <MaterialIcons name="person" size={22} color={theme.colors.bronze} />, screen: 'GymTrainers', color: theme.colors.bronze },
        { id: 'promos', title: t('promos'), icon: <MaterialIcons name="local-offer" size={22} color={theme.colors.success} />, screen: 'GymPromos', color: theme.colors.success },
        { id: 'members', title: t('members'), icon: <MaterialCommunityIcons name="account-multiple" size={22} color={theme.colors.primaryDark} />, screen: 'GymMembers', color: theme.colors.primaryDark },
    ];

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Top Bar */}
                <View style={styles.topBar}>
                    <View style={styles.leftSection}>
                        <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                            <Text style={styles.menuIcon}>☰</Text>
                        </TouchableOpacity>

                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.logoSmallText}>Fitmap</Text>
                        </View>
                    </View>

                    {!isLoggedIn ? (
                        <View style={styles.authButtonsTop}>
                            <TouchableOpacity
                                style={styles.loginButtonTop}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <Text style={styles.loginButtonTopText}>{t('login')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.registerButtonTop}
                                onPress={() => navigation.navigate('Register')}
                            >
                                <Text style={styles.registerButtonTopText}>{t('register')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.userAvatarButton} onPress={() => navigation.navigate('UserInfo')}>
                            <Text style={styles.userNameText}>{user.name}</Text>
                            {user.profileImage ? (
                                <Image source={{ uri: user.profileImage }} style={styles.userAvatarImage} />
                            ) : (
                                <View style={styles.userAvatar}>
                                    <Text style={styles.userAvatarText}>
                                        {user.name.split(' ').map(n => n[0]).join('')}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <LoadingOverlay visible={isLoading} message={t('loading_gym_data')} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Welcome Section */}
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeTitle}>{t('welcome_back')}, {user.name}!</Text>
                        <Text style={styles.welcomeSubtitle}>{t('manage_gym_basic')}</Text>
                    </View>

                    {/* Management Grid */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('gym_management')}</Text>
                        <View style={styles.managementGrid}>
                            {managementOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.managementCard, { borderLeftColor: option.color }]}
                                    onPress={() => navigation.navigate(option.screen, { gymData, userEmail: user.email })}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: Commons.hexToRgba(option.color, 0.15) }]}>
                                        {option.icon}
                                    </View>
                                    <View style={styles.cardContent}>
                                        <Text style={styles.cardTitle}>{option.title}</Text>
                                        <MaterialIcons name="keyboard-arrow-right" size={30} color={theme.colors.primary} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Quick Stats */}
                    {gymData && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('quick_overview')}</Text>
                            <View style={styles.statsContainer}>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{gymData.BRANCHES?.length || 0}</Text>
                                    <Text style={styles.statLabel}>{t('branches')}</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{gymData.SERVICES?.length || 0}</Text>
                                    <Text style={styles.statLabel}>{t('services_text')}</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{gymData.SUBSCRIPTIONS?.length || 0}</Text>
                                    <Text style={styles.statLabel}>{t('plans')}</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{gymData.MEMBERS?.length || gymData.MEMBERS_LIST?.length || gymData.MEMBERS_ARR?.length || 0}</Text>
                                    <Text style={styles.statLabel}>{t('members')}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollView: {
        flex: 1,
    },
    topBar: {
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        elevation: 6,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    menuButton: {
        padding: theme.spacing.xs,
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
        backgroundColor: theme.colors.primaryDark,
    },
    menuIcon: {
        fontSize: 24,
        color: theme.colors.white,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 140,
        paddingLeft: theme.spacing.xs,
    },
    logoImage: {
        height: 65,
        width: 50,
    },
    logoSmallText: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginTop: theme.spacing.xs,
        position: 'absolute',
        left: 50,
    },
    userAvatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.xs,
        gap: theme.spacing.sm,
    },
    userNameText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    userAvatar: {
        width: 45,
        height: 45,
        borderRadius: 23,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    userAvatarText: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    userAvatarImage: {
        width: 45,
        height: 45,
        borderRadius: 23,
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    authButtonsTop: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
        alignItems: 'center',
    },
    loginButtonTop: {
        backgroundColor: theme.colors.card,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    registerButtonTop: {
        backgroundColor: theme.colors.darkRed,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    loginButtonTopText: {
        color: theme.colors.text,
        fontWeight: '700',
        fontSize: 13,
    },
    registerButtonTopText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: 13,
    },
    welcomeSection: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
    },
    welcomeTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    welcomeSubtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
    },
    section: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    managementGrid: {
        gap: theme.spacing.md,
    },
    managementCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.7),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
    },
    cardArrow: {
        fontSize: 30,
        color: theme.colors.primary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
        alignItems: 'stretch',
    },
    statCard: {
        flex: 1,
        flexBasis: '23%', /* give ~4 items room across the screen */
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.65),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
        alignItems: 'center',
        elevation: 1,
        minWidth: 140,
        maxWidth: 240,
        marginBottom: theme.spacing.md,
    },
    statValue: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    statLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
});
