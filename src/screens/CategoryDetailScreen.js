import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
} from 'react-native';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Constants from '../utils/Constants';
import ScreenBackground from '../components/ScreenBackground';
import GymCard from '../components/GymCard';
import LoadingOverlay from '../components/LoadingOverlay';
import * as ServerOperations from '../utils/ServerOperations';

const categoryDescriptions = {
    Platinum: 'Premium facilities with world-class amenities and services',
    Gold: 'High-quality gyms with excellent equipment and training programs',
    Silver: 'Great gyms with essential amenities at affordable prices',
    Bronze: 'Budget-friendly gyms perfect for basic fitness needs',
};

export default function CategoryDetailScreen({ route }) {
    const navigation = useNavigation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState({ name: '', profileImage: null });

    const loadUserData = async () => {
        const loggedIn = await Commons.getFromAS(Constants.IS_LOGGED_IN);
        if (loggedIn === 'true') {
            const name = await Commons.getFromAS(Constants.USER_NAME);
            const profileImage = await Commons.getFromAS(Constants.USER_PROFILE_IMAGE);
            setIsLoggedIn(true);
            setUser({
                name: name || 'User',
                profileImage: profileImage || null,
            });
        } else {
            setIsLoggedIn(false);
            setUser({ name: '', profileImage: null });
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadUserData();
        }, [])
    );
    const { category } = route.params;
    const [gyms, setGyms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCategoryGyms();
    }, [category]);

    const loadCategoryGyms = async () => {
        setIsLoading(true);
        try {
            const response = await ServerOperations.getCustomers(category);

            if (response.res && response.data) {
                // Filter gyms by category
                const filteredGyms = response.data.filter(gym =>
                    gym.NAME &&
                    gym.BRANCHES &&
                    gym.BRANCHES.length > 0 &&
                    gym.CATEGORY === category
                );
                setGyms(filteredGyms);
            }
        } catch (error) {
            console.error('Error loading category gyms:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMenuPress = () => navigation.navigate('Menu');

    const handleLogin = () => navigation.navigate('Login');

    const handleLogout = async () => {
        await Commons.removeFromAS(Constants.IS_LOGGED_IN);
        await Commons.removeFromAS(Constants.USER_NAME);
        await Commons.removeFromAS(Constants.USER_EMAIL);
        await Commons.removeFromAS(Constants.USER_PHONE);
        await Commons.removeFromAS(Constants.USER_MEMBER_SINCE);
        await Commons.removeFromAS(Constants.USER_PROFILE_IMAGE);
        setIsLoggedIn(false);
        setUser({ name: '', profileImage: null });
    };

    return (
        <ScreenBackground>
            <View style={styles.topBar}>
                <View style={styles.leftSection}>
                    <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
                    </View>
                </View>

                {!isLoggedIn ? (
                    <View style={styles.authButtonsTop}>
                        <TouchableOpacity style={styles.loginButtonTop} onPress={handleLogin}>
                            <Text style={styles.loginButtonTopText}>Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.registerButtonTop} onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerButtonTopText}>Register</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.userAvatarButton} onPress={() => navigation.navigate('UserInfo')}>
                        <Text style={styles.userNameText}>{user.name}</Text>
                        {user.profileImage ? (
                            <Image source={{ uri: user.profileImage }} style={styles.userAvatarImage} />
                        ) : (
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>{user.name.split(' ').map(n => n[0]).join('')}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.container}>
                <LoadingOverlay visible={isLoading} message="Loading gyms..." />

                <View style={styles.header}>
                    <Text style={styles.title}>{category} Gyms</Text>
                    <Text style={styles.description}>
                        {categoryDescriptions[category]}
                    </Text>
                    <Text style={styles.count}>{gyms.length} gyms available</Text>
                </View>

                <FlatList
                    data={gyms}
                    keyExtractor={(item) => item.ID ? item.ID.toString() : Math.random().toString()}
                    renderItem={({ item }) => (
                        <GymCard gym={item} />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
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
        backgroundColor: theme.colors.card,
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    description: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.sm,
    },
    count: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    list: {
        padding: theme.spacing.md,
    },
    topBar: {
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.9),
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImage: {
        height: 65,
        width: 100,
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
});
