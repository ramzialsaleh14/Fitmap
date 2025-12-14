import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Image,
    ActivityIndicator,

    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
// Commons imported later to avoid duplicate identifier
import ScreenBackground from '../components/ScreenBackground';
import GymSlider from '../components/GymSlider';
import CategoryCard from '../components/CategoryCard';
import LoadingOverlay from '../components/LoadingOverlay';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';
import { useTranslation } from '../utils/Strings';

export default function MainScreen() {
    const navigation = useNavigation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: '',
        memberSince: '',
        profileImage: null,
    });
    const { t } = useTranslation();
    const [gyms, setGyms] = useState([]);
    const [nearbyGyms, setNearbyGyms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Loading...');
    const [userLocation, setUserLocation] = useState(null);
    const [useLocation, setUseLocation] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationDisabled, setLocationDisabled] = useState(false);

    const loadUserData = async () => {
        const loggedIn = await Commons.getFromAS(Constants.IS_LOGGED_IN);
        if (loggedIn === 'true') {
            const email = await Commons.getFromAS(Constants.USER_EMAIL);
            const password = await Commons.getFromAS(Constants.USER_PASSWORD);

            // Re-validate login with server to get fresh data including free visits
            if (email && password) {
                try {
                    const resp = await ServerOperations.checkLogin(email, password);
                    if (resp && resp.res) {
                        // Update stored data with fresh info from server
                        await Commons.saveToAS(Constants.USER_NAME, resp.name || 'User');
                        await Commons.saveToAS(Constants.USER_PHONE, resp.phone || '');
                        await Commons.saveToAS(Constants.USER_PROFILE_IMAGE, resp.photo || '');
                        await Commons.saveToAS(Constants.USER_MEMBER_SINCE, resp.date);
                        await Commons.saveToAS(Constants.USER_TYPE, resp.type);

                        // Update free visits if available
                        if (resp.freeVisits) {
                            await Commons.saveToAS(Constants.USER_FREE_VISITS, JSON.stringify(resp.freeVisits));
                        }

                        const userType = resp.type;

                        // If user is a gym, redirect to gym management screen
                        if (userType === 'Gym') {
                            navigation.replace('GymMain');
                            return;
                        }

                        setIsLoggedIn(true);
                        setUser({
                            name: resp.name || 'User',
                            email: email || '',
                            phone: resp.phone || '',
                            memberSince: resp.date || '',
                            profileImage: resp.photo || null,
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Error re-validating login:', error);
                }
            }

            // Fallback to stored data if server check fails
            const name = await Commons.getFromAS(Constants.USER_NAME);
            const phone = await Commons.getFromAS(Constants.USER_PHONE);
            const memberSince = await Commons.getFromAS(Constants.USER_MEMBER_SINCE);
            const profileImage = await Commons.getFromAS(Constants.USER_PROFILE_IMAGE);
            const userType = await Commons.getFromAS(Constants.USER_TYPE);

            // If user is a gym, redirect to gym management screen
            if (userType === 'Gym') {
                navigation.replace('GymMain');
                return;
            }

            setIsLoggedIn(true);
            setUser({
                name: name || 'User',
                email: email || '',
                phone: phone || '',
                memberSince: memberSince || '',
                profileImage: profileImage || null,
            });
        } else {
            setIsLoggedIn(false);
        }
    };

    const loadGymsData = async () => {
        setIsLoading(true);
        setLoadingMessage('Loading gyms...');
        try {
            const response = await ServerOperations.getCustomers();
            if (response) {
                // Filter out incomplete/test gyms
                const validGyms = response.filter(gym =>
                    gym.NAME &&
                    gym.BRANCHES &&
                    gym.BRANCHES.length > 0 &&
                    gym.CATEGORY
                );
                setGyms(validGyms);

                // End loading for gyms
                setIsLoading(false);

                // Request location permission and load nearby gyms in background
                requestLocationAndLoadNearby(validGyms);
            } else {
                Alert.alert(t('error'), t('failed_load_gyms_try_again'));
            }
        } catch (error) {
            console.error('Error loading gyms:', error);
            Alert.alert(t('error'), t('failed_load_gyms_check_connection'));
        } finally {
            setIsLoading(false);
        }
    };

    const requestLocationAndLoadNearby = async (gymsList) => {
        // Check if user has enabled location services in settings
        const locationPref = await Commons.getFromAS(Constants.USE_LOCATION);
        if (locationPref === 'false') {
            // User turned off location services from the app settings
            setUseLocation(false);
            setNearbyGyms([]);
            setLocationDisabled(true);
            return;
        }

        // Get location in background and indicate locating state
        setIsLocating(true);
        setLocationDisabled(false);
        const location = await Commons.getCurrentLocation();
        if (location.success) {
            // Permission granted and location obtained
            setUseLocation(true);
            setLocationDisabled(false);
            setUserLocation(location);
            await Commons.saveToAS(Constants.USE_LOCATION, 'true');

            // Find gyms within 2km
            const nearby = [];
            gymsList.forEach(gym => {
                gym.BRANCHES.forEach(branch => {
                    if (branch.LOCATION) {
                        const [lat, lon] = branch.LOCATION.split(',').map(Number);
                        if (lat && lon) {
                            const distance = Commons.calculateDistance(
                                location.latitude,
                                location.longitude,
                                lat,
                                lon
                            );
                            if (distance <= 2) {
                                nearby.push({
                                    ...gym,
                                    distance: distance.toFixed(2),
                                    nearbyBranch: branch
                                });
                            }
                        }
                    }
                });
            });
            setNearbyGyms(nearby);
        } else {
            // Permission denied or location unavailable
            setUseLocation(false);
            setLocationDisabled(false);
            await Commons.saveToAS(Constants.USE_LOCATION, 'false');
        }
        setIsLocating(false);
    };

    const loadNearbyGyms = async (gymsList) => {
        const location = await Commons.getCurrentLocation();
        if (location.success) {
            setUserLocation(location);

            // Find gyms within 1km
            const nearby = [];
            gymsList.forEach(gym => {
                gym.BRANCHES.forEach(branch => {
                    if (branch.LOCATION) {
                        const [lat, lon] = branch.LOCATION.split(',').map(Number);
                        if (lat && lon) {
                            const distance = Commons.calculateDistance(
                                location.latitude,
                                location.longitude,
                                lat,
                                lon
                            );
                            if (distance <= 1) {
                                nearby.push({
                                    ...gym,
                                    distance: distance.toFixed(2),
                                    nearbyBranch: branch
                                });
                            }
                        }
                    }
                });
            });
            setNearbyGyms(nearby);
        }
    };

    const getGymsByCategory = (category) => {
        return gyms.filter(gym => gym.CATEGORY === category);
    };

    const pickFirstImageForGym = (gym) => {
        if (!gym) return null;
        let candidate = null;
        if (Array.isArray(gym.PHOTOS) && gym.PHOTOS.length > 0) candidate = gym.PHOTOS[0];
        else if (Array.isArray(gym.IMAGES) && gym.IMAGES.length > 0) candidate = gym.IMAGES[0];
        else if (Array.isArray(gym.MEDIA) && gym.MEDIA.length > 0) candidate = gym.MEDIA[0];
        else if (gym.image) candidate = gym.image;
        if (!candidate) return null;
        if (candidate.startsWith && (candidate.startsWith('http') || candidate.startsWith('data:'))) return candidate;
        return Constants.attachmentPath.replace(/\/$/, '') + '/' + String(candidate).replace(/^\//, '');
    };

    // Load user data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadUserData();
            loadGymsData();
        }, [])
    );

    const handleCategoryPress = (category) => {
        navigation.navigate('CategoryDetail', { category });
    };

    const handleMenuPress = () => {
        navigation.navigate('Menu');
    };

    const handleLogin = () => {
        navigation.navigate('Login');
    };

    const handleLogout = async () => {
        await Commons.removeFromAS(Constants.IS_LOGGED_IN);
        await Commons.removeFromAS(Constants.USER_NAME);
        await Commons.removeFromAS(Constants.USER_EMAIL);
        await Commons.removeFromAS(Constants.USER_PHONE);
        await Commons.removeFromAS(Constants.USER_MEMBER_SINCE);
        await Commons.removeFromAS(Constants.USER_PROFILE_IMAGE);
        setIsLoggedIn(false);
        setUser({ name: '', email: '', phone: '', memberSince: '', profileImage: null });
    };

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                {/* Top Bar with Logo and Auth Buttons */}
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
                            {/* <Text style={styles.logoSmallText}>Fitmap</Text> */}
                        </View>
                    </View>

                    {!isLoggedIn ? (
                        <View style={styles.authButtonsTop}>
                            <TouchableOpacity
                                style={styles.loginButtonTop}
                                onPress={handleLogin}
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

                <LoadingOverlay visible={isLoading} message={loadingMessage} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Search Bar */}
                    <TouchableOpacity
                        style={styles.searchBar}
                        onPress={() => navigation.navigate('Search')}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="search" size={20} color={theme.colors.textLight} />
                        <Text style={styles.searchPlaceholder}>{t('search_gyms_or_amenities')}</Text>
                        <MaterialIcons name="tune" size={20} color={theme.colors.textLight} />
                    </TouchableOpacity>

                    {/* Featured Gyms */}
                    {gyms.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('featured_gyms')}</Text>
                            <GymSlider
                                gyms={gyms.slice(0, 5)}
                                onGymPress={(gym) => navigation.navigate('GymDetails', {
                                    gymId: gym.ID
                                })}
                            />
                        </View>
                    )}

                    {/* Categories */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('browse_by_category')}</Text>
                        <View style={styles.categoriesGrid}>
                            <CategoryCard
                                category="Platinum"
                                onPress={() => handleCategoryPress('Platinum')}
                                count={getGymsByCategory('Platinum').length}
                                thumbs={getGymsByCategory('Platinum').map(g => pickFirstImageForGym(g)).filter(Boolean)}
                            />
                            <CategoryCard
                                category="Gold"
                                onPress={() => handleCategoryPress('Gold')}
                                count={getGymsByCategory('Gold').length}
                                thumbs={getGymsByCategory('Gold').map(g => pickFirstImageForGym(g)).filter(Boolean)}
                            />
                            <CategoryCard
                                category="Silver"
                                onPress={() => handleCategoryPress('Silver')}
                                count={getGymsByCategory('Silver').length}
                                thumbs={getGymsByCategory('Silver').map(g => pickFirstImageForGym(g)).filter(Boolean)}
                            />
                            <CategoryCard
                                category="Bronze"
                                onPress={() => handleCategoryPress('Bronze')}
                                count={getGymsByCategory('Bronze').length}
                                thumbs={getGymsByCategory('Bronze').map(g => pickFirstImageForGym(g)).filter(Boolean)}
                            />
                        </View>
                    </View>
                    {/* Nearby Gyms Section (show spinner while locating; show results when available) */}
                    {(useLocation || isLocating || nearbyGyms.length > 0 || locationDisabled) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('nearby_gyms')}</Text>

                            {isLocating ? (
                                <View style={styles.locatingContainer}>
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                    <Text style={styles.locatingText}>{t('finding_nearest')}</Text>
                                </View>
                            ) : nearbyGyms.length > 0 ? (
                                <GymSlider
                                    gyms={nearbyGyms}
                                    showDistance={true}
                                    onGymPress={(gym) => navigation.navigate('GymDetails', {
                                        gymId: gym.ID
                                    })}
                                />
                            ) : (
                                // If user saved preference to not use location, show a helper message
                                locationDisabled ? (
                                    <View style={styles.locationPromptContainer}>
                                        <MaterialIcons name="location-off" size={34} color={theme.colors.textLight} />
                                        <View style={{ marginLeft: theme.spacing.xs, flex: 1 }}>
                                            <Text style={styles.noNearbyText}>{t('turn_on_location_services')}</Text>
                                            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.openSettingsButton}>
                                                <Text style={styles.openSettingsText}>{t('open_settings')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <Text style={styles.noNearbyText}>{t('no_nearby')}</Text>
                                )
                            )}
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
        backgroundColor: 'transparent',
    },
    // backgroundImage & overlay moved to ScreenBackground component
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
    logoSmall: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.sm,
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
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
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
    userInfoSection: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    userInfoAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    userInfoAvatarText: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    userInfoDetails: {
        flex: 1,
    },
    userName: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.white,
        marginBottom: theme.spacing.xs,
    },
    userEmail: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.white,
        opacity: 0.9,
        marginBottom: theme.spacing.xs,
    },
    userMemberSince: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.white,
        opacity: 0.8,
    },
    logoutButton: {
        backgroundColor: theme.colors.card,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignSelf: 'flex-start',
    },
    logoutButtonText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: theme.fontSize.sm,
    },
    section: {
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.15),
    },
    searchPlaceholder: {
        flex: 1,
        color: theme.colors.textLight,
        fontSize: theme.fontSize.md,
    },
    sectionTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
    },
    categoriesGrid: {
        flexDirection: 'column',
        // each category is its own row now
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    locatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    locatingText: {
        color: theme.colors.textLight,
        marginLeft: theme.spacing.sm,
        fontSize: theme.fontSize.sm,
    },
    noNearbyText: {
        color: theme.colors.textLight,
        paddingHorizontal: theme.spacing.lg,
        fontSize: theme.fontSize.sm,
    }
    ,
    locationPromptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    openSettingsButton: {
        marginTop: theme.spacing.xs,
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        marginLeft: theme.spacing.lg,
        alignSelf: 'flex-start',
    },
    openSettingsText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: theme.fontSize.sm,
    },
});
