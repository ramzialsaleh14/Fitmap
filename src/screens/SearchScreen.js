import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import CompactGymCard from '../components/CompactGymCard';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTranslation } from '../utils/Strings';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';

export default function SearchScreen({ navigation }) {
    const { t, locale } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [gyms, setGyms] = useState([]);
    const [filteredGyms, setFilteredGyms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const searchTimer = useRef(null);

    // Filter states (arrays for multi-select)
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);

    // Available options (derived from gyms so the filter shows every category)
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableLocations, setAvailableLocations] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);

    useEffect(() => {
        loadGyms();
    }, []);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            applyFilters();
        }, 300);
        return () => clearTimeout(searchTimer.current);
    }, [searchQuery, selectedCategories, selectedLocations, selectedServices, gyms]);

    const loadGyms = async () => {
        setIsLoading(true);
        try {
            const response = await ServerOperations.getCustomers();
            if (response) {
                const validGyms = response.filter(gym =>
                    gym.NAME &&
                    gym.BRANCHES &&
                    gym.BRANCHES.length > 0 &&
                    gym.CATEGORY
                );
                setGyms(validGyms);
                extractFilterOptions(validGyms);
            }
        } catch (error) {
            console.warn('Error loading gyms', error);
        } finally {
            setIsLoading(false);
        }
    };

    const extractFilterOptions = (gymsList) => {
        // Extract unique locations from all branches (lowercase, no duplicates)
        const locations = new Set();
        const services = new Set();
        const categoriesSet = new Set();

        gymsList.forEach(gym => {
            // Extract branch locations (BRANCH_ID or AREA) - convert to lowercase for uniqueness
            if (gym.BRANCHES) {
                gym.BRANCHES.forEach(branch => {
                    const location = branch.BRANCH_ID || branch.AREA || branch.area;
                    if (location) locations.add(location.toLowerCase());
                });
            }

            // Extract services
            if (gym.SERVICES) {
                gym.SERVICES.forEach(service => {
                    const serviceName = Commons.getServiceLabel(service, locale);
                    if (serviceName) services.add(serviceName);
                });
            }
            // collect categories
            if (gym.CATEGORY) categoriesSet.add(String(gym.CATEGORY).trim());
        });

        setAvailableLocations(Array.from(locations).sort());
        setAvailableServices(Array.from(services).sort());
        setAvailableCategories(Array.from(categoriesSet).sort());
    };

    const applyFilters = () => {
        let results = [...gyms];

        // Apply text search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            results = results.filter(gym => {
                const name = (gym.NAME || '').toLowerCase();
                const category = (gym.CATEGORY || '').toLowerCase();
                const branches = (gym.BRANCHES || []).map(b =>
                    `${b.BRANCH_ID || ''} ${b.AREA || ''}`.toLowerCase()
                ).join(' ');
                const services = (gym.SERVICES || []).map(s => {
                    if (typeof s === 'string') return s.toLowerCase();
                    const label = Commons.getServiceLabel(s, locale);
                    return label.toLowerCase();
                }).join(' ');

                return name.includes(query) ||
                    category.includes(query) ||
                    branches.includes(query) ||
                    services.includes(query);
            });
        }

        // Apply category filter (multi-select)
        if (selectedCategories.length > 0) {
            results = results.filter(gym => selectedCategories.includes(gym.CATEGORY));
        }

        // Apply location filter (multi-select)
        if (selectedLocations.length > 0) {
            results = results.filter(gym => {
                return (gym.BRANCHES || []).some(branch => {
                    const branchLoc = (branch.BRANCH_ID || branch.AREA || branch.area || '').toLowerCase();
                    return selectedLocations.some(loc => loc.toLowerCase() === branchLoc);
                });
            });
        }

        // Apply service filter (multi-select - gym must have ALL selected services)
        if (selectedServices.length > 0) {
            results = results.filter(gym => {
                const gymServices = (gym.SERVICES || []).map(service => {
                    const serviceName = typeof service === 'string'
                        ? service
                        : (
                            (locale && locale.toLowerCase().startsWith('ar'))
                                ? (service.DESC_AR || service.DESC || service.desc || service.DESC_EN || service.NAME || service.name || '')
                                : (service.DESC_EN || service.DESC || service.desc || service.DESC_AR || service.NAME || service.name || '')
                        );
                    return serviceName.toLowerCase();
                });

                // Check if gym has ALL selected services
                return selectedServices.every(selectedSrv =>
                    gymServices.some(gymSrv => gymSrv.includes(selectedSrv.toLowerCase()))
                );
            });
        }

        setFilteredGyms(results);
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setSelectedLocations([]);
        setSelectedServices([]);
        setSearchQuery('');
    };

    const hasActiveFilters = () => {
        return selectedCategories.length > 0 || selectedLocations.length > 0 || selectedServices.length > 0;
    };

    const renderFilterModal = () => (
        <Modal
            visible={showFilters}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowFilters(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('filters')}</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <MaterialIcons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.filterScroll}
                        contentContainerStyle={styles.filterScrollContent}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                    >
                        {/* Category Filter */}
                        <Text style={styles.filterLabel}>{t('category')}</Text>
                        <View style={styles.filterOptions}>
                            {(availableCategories.length ? availableCategories : ['Platinum', 'Gold', 'Silver', 'Bronze']).map(cat => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.filterChip,
                                            isSelected && styles.filterChipActive
                                        ]}
                                        onPress={() => {
                                            if (isSelected) {
                                                setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                            } else {
                                                setSelectedCategories([...selectedCategories, cat]);
                                            }
                                        }}
                                    >
                                        <Text style={[
                                            styles.filterChipText,
                                            isSelected && styles.filterChipTextActive
                                        ]}>
                                            {t(`category_${cat.toLowerCase()}`)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Location Filter */}
                        {availableLocations.length > 0 && (
                            <>
                                <Text style={styles.filterLabel}>{t('gym_location')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
                                    {availableLocations.map(loc => {
                                        const isSelected = selectedLocations.includes(loc);
                                        return (
                                            <TouchableOpacity
                                                key={loc}
                                                style={[
                                                    styles.filterChip,
                                                    isSelected && styles.filterChipActive
                                                ]}
                                                onPress={() => {
                                                    if (isSelected) {
                                                        setSelectedLocations(selectedLocations.filter(l => l !== loc));
                                                    } else {
                                                        setSelectedLocations([...selectedLocations, loc]);
                                                    }
                                                }}
                                            >
                                                <Text style={[
                                                    styles.filterChipText,
                                                    isSelected && styles.filterChipTextActive
                                                ]}>
                                                    {loc}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </>
                        )}

                        {/* Service Filter */}
                        {availableServices.length > 0 && (
                            <>
                                <Text style={styles.filterLabel}>{t('service')}</Text>
                                <View style={styles.filterOptions}>
                                    {availableServices.map(srv => {
                                        const isSelected = selectedServices.includes(srv);
                                        return (
                                            <TouchableOpacity
                                                key={srv}
                                                style={[
                                                    styles.filterChip,
                                                    isSelected && styles.filterChipActive
                                                ]}
                                                onPress={() => {
                                                    if (isSelected) {
                                                        setSelectedServices(selectedServices.filter(s => s !== srv));
                                                    } else {
                                                        setSelectedServices([...selectedServices, srv]);
                                                    }
                                                }}
                                            >
                                                <Text style={[
                                                    styles.filterChipText,
                                                    isSelected && styles.filterChipTextActive
                                                ]}>
                                                    {srv}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonSecondary]}
                            onPress={clearFilters}
                        >
                            <Text style={styles.modalButtonTextSecondary}>{t('clear_filters')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalButtonPrimary]}
                            onPress={() => setShowFilters(false)}
                        >
                            <Text style={styles.modalButtonTextPrimary}>{t('apply')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderGymItem = ({ item }) => (
        <CompactGymCard
            gym={item}
            onPress={() => navigation.navigate('GymDetails', { gymId: item.ID || item.EMAIL })}
        />
    );

    const renderEmptyState = () => {
        if (isLoading) return null;
        return (
            <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={64} color={theme.colors.textLight} />
                <Text style={styles.emptyText}>
                    {searchQuery || hasActiveFilters()
                        ? t('no_gyms_found')
                        : t('search_gyms_hint')}
                </Text>
            </View>
        );
    };

    return (
        <ScreenBackground>
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('search_gyms')}</Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <MaterialIcons name="search" size={20} color={theme.colors.textLight} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('search_gyms_or_amenities')}
                            placeholderTextColor={theme.colors.textLight}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <MaterialIcons name="clear" size={20} color={theme.colors.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
                        onPress={() => setShowFilters(true)}
                    >
                        <MaterialIcons
                            name="tune"
                            size={20}
                            color={hasActiveFilters() ? theme.colors.white : theme.colors.text}
                        />
                        {hasActiveFilters() && <View style={styles.filterBadge} />}
                    </TouchableOpacity>
                </View>

                {/* Active Filters Display */}
                {hasActiveFilters() && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.activeFilters}
                        contentContainerStyle={styles.activeFiltersContent}
                    >
                        {selectedCategories.map(cat => (
                            <View key={cat} style={styles.activeFilterChip}>
                                <Text style={styles.activeFilterText}>
                                    {t(`category_${cat.toLowerCase()}`)}
                                </Text>
                                <TouchableOpacity onPress={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}>
                                    <MaterialIcons name="close" size={16} color={theme.colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {selectedLocations.map(loc => (
                            <View key={loc} style={styles.activeFilterChip}>
                                <Text style={styles.activeFilterText}>{loc}</Text>
                                <TouchableOpacity onPress={() => setSelectedLocations(selectedLocations.filter(l => l !== loc))}>
                                    <MaterialIcons name="close" size={16} color={theme.colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {selectedServices.map(srv => (
                            <View key={srv} style={styles.activeFilterChip}>
                                <Text style={styles.activeFilterText}>{srv}</Text>
                                <TouchableOpacity onPress={() => setSelectedServices(selectedServices.filter(s => s !== srv))}>
                                    <MaterialIcons name="close" size={16} color={theme.colors.white} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Results Count */}
                {!isLoading && filteredGyms.length > 0 && (
                    <Text style={styles.resultsCount}>
                        {t('gyms_found').replace('{count}', filteredGyms.length)}
                    </Text>
                )}

                {/* Results List */}
                <FlatList
                    data={filteredGyms}
                    keyExtractor={(item, idx) => `${item.ID || item.EMAIL || idx}-${idx}`}
                    renderItem={renderGymItem}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />

                <LoadingOverlay visible={isLoading} />
                {renderFilterModal()}
            </SafeAreaView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: '700',
        color: theme.colors.text,
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: 44,
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    filterBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.success,
    },
    activeFilters: {
        maxHeight: 50,
        marginBottom: theme.spacing.sm,
    },
    activeFiltersContent: {
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.sm,
    },
    activeFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        gap: theme.spacing.xs,
    },
    activeFilterText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    resultsCount: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.xl * 2,
    },
    emptyText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textLight,
        fontSize: theme.fontSize.md,
        textAlign: 'center',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.lg,
        borderTopRightRadius: theme.borderRadius.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Commons.hexToRgba(theme.colors.border, 0.2),
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: '700',
        color: theme.colors.text,
    },
    filterScroll: {
        padding: theme.spacing.lg,
        maxHeight: '72%',
    },
    filterScrollContent: {
        paddingBottom: theme.spacing.lg * 1.5,
    },
    filterLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    filterChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.6),
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.2),
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterChipText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
    },
    filterChipTextActive: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    filterInput: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.6),
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.2),
        marginBottom: theme.spacing.sm,
    },
    modalActions: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: Commons.hexToRgba(theme.colors.border, 0.2),
    },
    modalButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    modalButtonSecondary: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.6),
    },
    modalButtonPrimary: {
        backgroundColor: theme.colors.primary,
    },
    modalButtonTextSecondary: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    modalButtonTextPrimary: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
});
