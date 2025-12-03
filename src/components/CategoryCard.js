import React from 'react';
import { Pressable, Text, StyleSheet, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../utils/Strings';

const categoryColors = {
    // Increase opacity so category cards are less transparent and more visible
    Platinum: [Commons.hexToRgba(theme.colors.platinum, 0.36), Commons.hexToRgba(theme.colors.platinum, 0.18)],
    Gold: [Commons.hexToRgba(theme.colors.gold, 0.34), Commons.hexToRgba(theme.colors.gold, 0.16)],
    Silver: [Commons.hexToRgba(theme.colors.silver, 0.30), Commons.hexToRgba(theme.colors.silver, 0.14)],
    Bronze: [Commons.hexToRgba(theme.colors.bronze, 0.34), Commons.hexToRgba(theme.colors.bronze, 0.16)],
};

// Map category -> icon name & color. We only store strings here to avoid referencing
// `styles` before it's declared (styles is created after this map at module load time).
const categoryIcons = {
    Platinum: 'diamond-stone',
    Gold: 'crown',
    Silver: 'shield-star',
    Bronze: 'medal',
};

const categoryIconColors = {
    Platinum: theme.colors.platinum,
    Gold: theme.colors.gold,
    Silver: theme.colors.silver,
    Bronze: theme.colors.bronze,
};

const categoryBorderColors = {
    // softer borders — lower alpha for less visual weight
    Platinum: Commons.hexToRgba(theme.colors.platinum, 0.28),
    Gold: Commons.hexToRgba(theme.colors.gold, 0.28),
    Silver: Commons.hexToRgba(theme.colors.silver, 0.24),
    Bronze: Commons.hexToRgba(theme.colors.bronze, 0.26),
};

const categoryShadowColors = {
    Platinum: Commons.hexToRgba(theme.colors.platinum, 0),
    Gold: Commons.hexToRgba(theme.colors.gold, 0),
    Silver: Commons.hexToRgba(theme.colors.silver, 0),
    Bronze: Commons.hexToRgba(theme.colors.bronze, 0),
};

export default function CategoryCard({ category, onPress, count = 0, thumbs = [] }) {
    const { t } = useTranslation();
    const categoryKey = `category_${category.toLowerCase()}`;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessible={true}
            accessibilityLabel={`${t(categoryKey)}. ${count} ${count === 1 ? t('gym') : t('gyms')}`}
            accessibilityHint={t('browse_by_category')}
            style={({ pressed }) => [
                styles.container,
                {
                    borderWidth: 2,
                    borderColor: categoryBorderColors[category],
                    elevation: 8,
                    shadowColor: categoryShadowColors[category],
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                },
                pressed && styles.pressed,
            ]}
            android_ripple={{ color: Commons.hexToRgba(theme.colors.primary, 0.06) }}
        >
            <LinearGradient
                // subtle gradient to hint category color only
                colors={categoryColors[category]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 1]}
            >
                {/* highlight badge for all categories: color-specific background + border */}
                <View style={[
                    styles.iconWrapper,
                    {
                        // slightly stronger badge background for clearer contrast
                        backgroundColor: Commons.hexToRgba(categoryIconColors[category] || theme.colors.primary, 0.30),
                        borderWidth: 1,
                        borderColor: Commons.hexToRgba(categoryIconColors[category] || theme.colors.primary, 0.22),
                        shadowColor: categoryIconColors[category] || theme.colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.12,
                        shadowRadius: 6,
                        elevation: 3,
                    }
                ]}>
                    {categoryIcons[category] ? (
                        <MaterialCommunityIcons
                            name={categoryIcons[category]}
                            size={36}
                            color={categoryIconColors[category] || theme.colors.primary}
                            style={styles.icon}
                        />
                    ) : (
                        <MaterialCommunityIcons name="star" size={36} color={theme.colors.primary} style={styles.icon} />
                    )}
                </View>
                <Text style={styles.title}>{t(categoryKey)}</Text>
                {/* Thumbnails row (show up to 5 thumbnails using first photo of gyms) */}
                {thumbs && thumbs.length > 0 && (
                    <View style={styles.thumbsRow}>
                        {thumbs.slice(0, 5).map((uri, idx) => (
                            <Image
                                key={`thumb-${idx}`}
                                source={{ uri }}
                                style={[styles.thumb, idx === 0 && styles.thumbPrimary]}
                                resizeMode="cover"
                            />
                        ))}
                    </View>
                )}
                <Text style={styles.subtitle}>
                    {count} {count === 1 ? t('gym') : t('gyms')}
                </Text>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
    },
    gradient: {
        padding: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 64 / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.04),
    },
    premiumIconWrapper: {
        // Kept for backward compatibility - rarely used now
        backgroundColor: Commons.hexToRgba(theme.colors.platinum, 0.12),
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.platinum, 0.22),
        shadowColor: theme.colors.platinum,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 1,
    },
    icon: {
        fontSize: 40,
        marginBottom: theme.spacing.sm,
    },
    title: {
        // Larger and bolder to make the categories visually dominant on the home screen
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    thumbsRow: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
        gap: theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thumb: {
        width: 36,
        height: 36,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.white, 0.10),
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.14),
        opacity: 0.98,
    },
    thumbPrimary: {
        width: 46,
        height: 46,
        borderRadius: 8,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
    pressed: {
        transform: [{ scale: 0.975 }],
        opacity: 0.98,
    },
});
