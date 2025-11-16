import React from 'react';
import { TouchableOpacity, Text, View, Image, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

export default function GymCard({ gym, onPress, showDistance }) {
    // Extract data from server format
    const gymName = gym.NAME || 'Unnamed Gym';
    const category = gym.CATEGORY || 'Standard';
    const photos = gym.PHOTOS || [];
    const image = photos.length > 0 ? photos[0] : 'https://via.placeholder.com/300x180?text=No+Image';
    const branches = gym.BRANCHES || [];
    const services = gym.SERVICES || [];
    const subscriptions = gym.SUBSCRIPTIONS || [];

    // Get price range from subscriptions
    const getPriceRange = () => {
        if (subscriptions.length === 0) return 'Contact for pricing';
        const fees = subscriptions
            .map(sub => parseFloat(sub.FEE))
            .filter(fee => !isNaN(fee) && fee > 0);
        if (fees.length === 0) return 'Contact for pricing';
        const min = Math.min(...fees);
        const max = Math.max(...fees);
        return min === max ? `${min} JOD` : `${min} - ${max} JOD`;
    };

    // Get branch IDs
    const branchIds = branches.map(branch => branch.BRANCH_ID).filter(id => id);
    const branchIdsDisplay = branchIds.length > 0 ? branchIds.join(' - ') : 'No branches';

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Image source={{ uri: image }} style={styles.image} />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>{gymName}</Text>
                    <View style={[styles.categoryBadge, styles[`category${category}`]]}>
                        <Text style={styles.categoryText}>{category}</Text>
                    </View>
                </View>

                {showDistance && gym.distance && (
                    <Text style={styles.distance}>📍 {gym.distance} km away</Text>
                )}

                <Text style={styles.branches} numberOfLines={1}>
                    {branchIdsDisplay}
                </Text>

                {services.length > 0 && (
                    <Text style={styles.services}>
                        {services.join(' • ')}
                    </Text>
                )}

                <View style={styles.footer}>
                    <Text style={styles.priceRange}>{getPriceRange()}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    image: {
        width: '100%',
        height: 180,
    },
    content: {
        padding: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    name: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    distance: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    branches: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xs,
    },
    services: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.sm,
    },
    footer: {
        marginTop: theme.spacing.sm,
    },
    priceRange: {
        fontSize: theme.fontSize.md,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    categoryBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    categoryPlatinum: {
        backgroundColor: theme.colors.platinum,
    },
    categoryGold: {
        backgroundColor: theme.colors.gold,
    },
    categorySilver: {
        backgroundColor: theme.colors.silver,
    },
    categoryBronze: {
        backgroundColor: theme.colors.bronze,
    },
    categoryText: {
        fontSize: theme.fontSize.xs,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
});
