import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
} from 'react-native';
import { theme } from '../utils/theme';
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

    return (
        <ScreenBackground>
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
});
