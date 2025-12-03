import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Platform,
    Keyboard,
} from 'react-native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import * as Commons from '../utils/Commons';
import ScreenBackground from '../components/ScreenBackground';
import GymCard from '../components/GymCard';
import LoadingOverlay from '../components/LoadingOverlay';
import * as ServerOperations from '../utils/ServerOperations';

const categoryDescriptions = {
    Platinum: 'category_platinum_desc',
    Gold: 'category_gold_desc',
    Silver: 'category_silver_desc',
    Bronze: 'category_bronze_desc',
};

export default function CategoryDetailScreen({ route, navigation }) {
    const { category } = route.params;
    const [gyms, setGyms] = useState([]);
    const [filteredGyms, setFilteredGyms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState('');
    const { t, locale } = useTranslation();

    useEffect(() => {
        loadCategoryGyms();
    }, [category]);

    // debounce search for better UX
    useEffect(() => {
        const timer = setTimeout(() => {
            applySearchFilter(query);
        }, 250);
        return () => clearTimeout(timer);
    }, [query, gyms]);

    const loadCategoryGyms = async () => {
        setIsLoading(true);
        try {
            const response = await ServerOperations.getCustomers(category);

            // Server may return either a raw array of gyms or an object { res, data }
            let list = [];
            if (Array.isArray(response)) {
                list = response;
            } else if (response && Array.isArray(response.data)) {
                list = response.data;
            }

            // Defensive: ensure we always have an array
            if (!Array.isArray(list)) list = [];

            // Filter gyms by category (some responses may include mixed results)
            const filteredGyms = list.filter(gym =>
                (gym.NAME || gym.name) &&
                (gym.BRANCHES && gym.BRANCHES.length > 0) &&
                ((gym.CATEGORY || gym.category) === category)
            );

            setGyms(filteredGyms);
            setFilteredGyms(filteredGyms);
        } catch (error) {
            console.error('Error loading category gyms:', error);
            setGyms([]);
            setFilteredGyms([]);
        } finally {
            setIsLoading(false);
        }
    };

    const applySearchFilter = (text) => {
        if (!text || text.trim().length === 0) {
            setFilteredGyms(gyms);
            return;
        }

        const q = text.toLowerCase();
        const results = gyms.filter(gym => {
            const parts = [];
            // server props could be uppercase or lowercase — check both
            parts.push((gym.NAME || gym.name || '').toString());
            parts.push((gym.CATEGORY || gym.category || '').toString());
            parts.push((gym.DESCRIPTION || gym.description || '').toString());
            // branches and services may be arrays
            if (gym.BRANCHES && Array.isArray(gym.BRANCHES)) {
                parts.push(gym.BRANCHES.map(b => JSON.stringify(b)).join(' '));
            }
            if (gym.SERVICES && Array.isArray(gym.SERVICES)) {
                // gym.SERVICES can be array of strings or objects {ID, DESC}
                const servicesText = gym.SERVICES.map(s => Commons.getServiceLabel(s, locale)).join(' ');
                parts.push(servicesText);
            }

            const hay = parts.join(' ').toLowerCase();
            return hay.indexOf(q) !== -1;
        });

        setFilteredGyms(results);
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isLoading} message="Loading gyms..." />

                <View style={styles.header}>
                    <Text style={styles.title}>{t(`category_${category.toLowerCase()}`)}</Text>
                    <Text style={styles.description}>
                        {t(categoryDescriptions[category])}
                    </Text>
                    <Text style={styles.count}>{filteredGyms.length} {t('gyms')}</Text>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('search_gyms_or_amenities')}
                            placeholderTextColor={theme.colors.textLight}
                            value={query}
                            onChangeText={setQuery}
                            returnKeyType="search"
                            onSubmitEditing={() => {
                                Keyboard.dismiss();
                                applySearchFilter(query);
                            }}
                        />

                        {query.length > 0 && (
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={() => setQuery('')}
                            >
                                <Text style={styles.clearText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <FlatList
                    data={filteredGyms}
                    keyExtractor={(item) => item.ID ? item.ID.toString() : Math.random().toString()}
                    renderItem={({ item }) => (
                        <GymCard
                            gym={item}
                            transparent
                            onPress={() => navigation.navigate('GymDetails', {
                                gymId: item.ID
                            })}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>{t('no_gyms_found')}</Text>
                                <Text style={styles.emptySub}>
                                    {query ? t('try_different_keyword') : t('no_gyms_in_category')}
                                </Text>
                            </View>
                        </View>
                    )}
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
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.7),
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
    searchContainer: {
        marginTop: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: 44,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.45),
        color: theme.colors.text,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        fontSize: theme.fontSize.md,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
        ...Platform.select({
            ios: { shadowColor: theme.colors.secondary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 4 },
            android: { elevation: 2 },
        }),
    },
    clearButton: {
        marginLeft: theme.spacing.sm,
        backgroundColor: theme.colors.card,
        height: 40,
        width: 40,
        borderRadius: theme.borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearText: {
        color: theme.colors.textLight,
        fontSize: 18,
    },
    emptyState: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.6),
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
    },
    emptyTitle: {
        color: theme.colors.text,
        fontSize: theme.fontSize.lg,
        fontWeight: '700',
        marginBottom: theme.spacing.sm,
    },
    emptySub: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
    }
});
