import React, { useRef, useState } from 'react';
import {
    View,
    ScrollView,
    Image,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // More padding on sides
const CARD_SPACING = 16;

// Category colors are controlled via theme tokens; the slider will show a small badge instead

export default function GymSlider({ gyms, showDistance = false, onGymPress }) {
    const { t } = useTranslation();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef(null);

    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (CARD_WIDTH + CARD_SPACING));
        setActiveIndex(index);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                decelerationRate="fast"
                contentContainerStyle={styles.scrollContent}
            >
                {gyms.map((gym, index) => {
                    const gymName = gym.NAME || gym.name || 'Unnamed Gym';
                    const category = gym.CATEGORY || 'Bronze';
                    const categoryBgColor = {
                        Platinum: theme.colors.platinum,
                        Gold: theme.colors.gold,
                        Silver: theme.colors.silver,
                        Bronze: theme.colors.bronze,
                    }[category] || theme.colors.bronze;
                    const photos = gym.PHOTOS || [];
                    const image = photos.length > 0 ? photos[0] : (gym.image || 'https://via.placeholder.com/300x180?text=No+Image');

                    return (
                        <TouchableOpacity
                            key={gym.ID || gym.id || index}
                            style={[
                                styles.slide,
                                {
                                    width: CARD_WIDTH,
                                    // No border color by category; we show the category badge beside the gym name
                                },
                                index === 0 && styles.firstSlide,
                                index === gyms.length - 1 && styles.lastSlide
                            ]}
                            onPress={() => onGymPress && onGymPress(gym)}
                            activeOpacity={0.9}
                        >
                            <Image
                                source={{ uri: image }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                            <View style={styles.overlay}>
                                <View style={styles.textContainer}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.nameText} numberOfLines={1}>{gymName}</Text>
                                        <View style={[styles.categoryBadge, { backgroundColor: categoryBgColor }]}>
                                            <Text style={styles.categoryBadgeText}>{t(`category_${String(category).toLowerCase()}`) || category}</Text>
                                        </View>
                                    </View>
                                    {showDistance && gym.distance && (
                                        <Text style={styles.distanceText}>
                                            <MaterialIcons name="location-on" size={16} color={theme.colors.primary} /> {gym.distance} km away
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            <View style={styles.pagination}>
                {gyms.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.paginationDot,
                            index === activeIndex && styles.paginationDotActive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    scrollContent: {
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.xs,
    },
    slide: {
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: CARD_SPACING,
        backgroundColor: theme.colors.card,
        // no category border on slides; use badge beside name instead
        elevation: 4,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    firstSlide: {
        marginLeft: 0,
    },
    lastSlide: {
        marginRight: theme.spacing.lg,
    },
    image: {
        width: '100%',
        height: 220,
        backgroundColor: theme.colors.border,
        borderTopLeftRadius: 13,
        borderTopRightRadius: 13,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        padding: theme.spacing.lg,
    },
    textContainer: {
        backgroundColor: theme.colors.card,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    nameText: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    categoryBadge: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
    },
    categoryBadgeText: {
        fontSize: theme.fontSize.xs,
        fontWeight: 'bold',
        color: theme.colors.secondary,
    },
    distanceText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.primary,
        fontWeight: '600',
        marginTop: theme.spacing.xs,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xs,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
        marginHorizontal: 5,
        transition: 'all 0.3s',
    },
    paginationDotActive: {
        backgroundColor: theme.colors.primary,
        width: 28,
        height: 8,
        borderRadius: 4,
    },
});
