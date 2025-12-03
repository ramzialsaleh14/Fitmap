import React from 'react';
import { TouchableOpacity, Text, View, Image, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../utils/Strings';

export default function CompactGymCard({ gym, onPress }) {
    const { t } = useTranslation();

    // Extract data from server format
    const gymName = gym.NAME || 'Unnamed Gym';
    const category = gym.CATEGORY || 'Standard';
    const categoryKey = `category_${String(category).toLowerCase().replace(/\s+/g, '_')}`;

    // Get first photo
    const photos = gym.PHOTOS || gym.IMAGES || [];
    const image = photos.length > 0
        ? photos[0]
        : 'https://via.placeholder.com/120x120?text=No+Image';

    // Get branch info - collect all branch locations
    const branches = gym.BRANCHES || [];
    const branchLocations = branches
        .map(b => b.BRANCH_ID || b.AREA || b.area || '')
        .filter(Boolean)
        .join(', ');

    // Get services
    const services = gym.SERVICES || [];
    const serviceCount = services.length;

    // Get price range from subscriptions
    const subscriptions = gym.SUBSCRIPTIONS || [];
    const getPriceRange = () => {
        if (subscriptions.length === 0) return null;
        const fees = subscriptions
            .map(sub => parseFloat(sub.FEE || sub.PRICE))
            .filter(fee => !isNaN(fee) && fee > 0);
        if (fees.length === 0) return null;
        const min = Math.min(...fees);
        const max = Math.max(...fees);
        return min === max ? `${min} ${t('jod')}` : `${min}-${max} ${t('jod')}`;
    };

    const priceRange = getPriceRange();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Image source={{ uri: image }} style={styles.image} />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>{gymName}</Text>
                    <View style={[styles.categoryBadge, getCategoryStyle(category)]}>
                        <Text style={styles.categoryText}>{t(categoryKey) || category}</Text>
                    </View>
                </View>

                {branchLocations && (
                    <View style={styles.infoRow}>
                        <MaterialIcons name="location-on" size={14} color={theme.colors.textLight} />
                        <Text style={styles.infoText} numberOfLines={2}>
                            {branchLocations}
                        </Text>
                    </View>
                )}

                <View style={styles.footer}>
                    {serviceCount > 0 && (
                        <View style={styles.servicesBadge}>
                            <MaterialIcons name="fitness-center" size={12} color={theme.colors.primary} />
                            <Text style={styles.servicesText}>{serviceCount} {t('services')}</Text>
                        </View>
                    )}
                    {priceRange && (
                        <Text style={styles.price}>{priceRange}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const getCategoryStyle = (category) => {
    const styles = {
        Platinum: { backgroundColor: Commons.hexToRgba(theme.colors.platinum, 0.25), borderColor: Commons.hexToRgba(theme.colors.platinum, 0.5) },
        Gold: { backgroundColor: Commons.hexToRgba(theme.colors.gold, 0.25), borderColor: Commons.hexToRgba(theme.colors.gold, 0.5) },
        Silver: { backgroundColor: Commons.hexToRgba(theme.colors.silver, 0.25), borderColor: Commons.hexToRgba(theme.colors.silver, 0.5) },
        Bronze: { backgroundColor: Commons.hexToRgba(theme.colors.bronze, 0.25), borderColor: Commons.hexToRgba(theme.colors.bronze, 0.5) },
    };
    return styles[category] || styles.Silver;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.15),
    },
    image: {
        width: 100,
        height: 100,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.5),
    },
    content: {
        flex: 1,
        padding: theme.spacing.sm,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
    },
    name: {
        fontSize: theme.fontSize.md,
        fontWeight: '700',
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    categoryBadge: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: theme.fontSize.xs,
        fontWeight: '600',
        color: theme.colors.text,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: theme.spacing.xs,
    },
    infoText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    servicesBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.1),
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    servicesText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    price: {
        fontSize: theme.fontSize.sm,
        fontWeight: '700',
        color: theme.colors.primary,
    },
});
