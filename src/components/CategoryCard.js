import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../utils/theme';

const categoryColors = {
    Platinum: [theme.colors.platinum, '#7BA5CC', theme.colors.platinum],
    Gold: [theme.colors.gold, '#FFC700', theme.colors.gold],
    Silver: [theme.colors.silver, '#A8A9AD', theme.colors.silver],
    Bronze: [theme.colors.bronze, '#A0522D', theme.colors.bronze],
};

const categoryIcons = {
    Platinum: '💎',
    Gold: '🥇',
    Silver: '🥈',
    Bronze: '🥉',
};

const categoryBorderColors = {
    Platinum: '#C2D9ED',
    Gold: '#FFE55C',
    Silver: '#E8E8E8',
    Bronze: '#D4A574',
};

const categoryShadowColors = {
    Platinum: theme.colors.platinum,
    Gold: theme.colors.gold,
    Silver: theme.colors.silver,
    Bronze: theme.colors.bronze,
};

export default function CategoryCard({ category, onPress, count = 0 }) {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    borderWidth: 2,
                    borderColor: categoryBorderColors[category],
                    elevation: 8,
                    shadowColor: categoryShadowColors[category],
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                }
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={categoryColors[category]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[0, 0.5, 1]}
            >
                <Text style={styles.icon}>{categoryIcons[category]}</Text>
                <Text style={styles.title}>{category}</Text>
                <Text style={styles.subtitle}>
                    {count} {count === 1 ? 'Gym' : 'Gyms'}
                </Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '48%',
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
    },
    gradient: {
        padding: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 140,
    },
    icon: {
        fontSize: 40,
        marginBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
});
