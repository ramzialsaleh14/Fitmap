import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Image, TextInput, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTranslation } from '../utils/Strings';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';
import { width } from '../utils/Constants';

export default function GymMembersScreen({ route }) {
    const { gymData } = route.params || {};
    const { t, locale } = useTranslation();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [filteredMembers, setFilteredMembers] = useState([]);
    const searchTimer = useRef(null);

    useEffect(() => {
        // normalize members from gymData
        const m = gymData && (gymData.MEMBERS || gymData.MEMBERS_LIST || gymData.MEMBERS_ARR) ? (gymData.MEMBERS || gymData.MEMBERS_LIST || gymData.MEMBERS_ARR) : [];
        const normalized = Array.isArray(m) ? m.map((it) => {
            if (!it) return { NAME: '' };
            if (typeof it === 'string') return { NAME: it };
            // support multiple possible shapes
            return {
                NAME: it.NAME || it.name || it.full_name || it.FULLNAME || '',
                IMAGE: it.IMAGE || it.IMAGE_URL || it.PHOTO || it.PHOTO_URL || it.AVATAR || it.image || it.profileImage || '',
                EMAIL: it.EMAIL || it.email || it.EADDR || it.MAIL || '',
                PHONE: it.PHONE || it.phone || it.PHONE_NUMBER || it.MOB || it.MOBILE || '',
                PERIOD: it.PERIOD || it.PERIOD_MONTHS || it.PERIODS || it.PERIOD || '',
                PRICE: it.PRICE || it.FEE || it.FEE_JOD || it.PRICE_JOD || '',
                START_DATE: it.START_DATE || it.START || it.SDATE || it.FROM || it.FROM_DATE || '',
                END_DATE: it.END_DATE || it.END || it.EDATE || it.TO || it.TO_DATE || it.TDT || it.FDT || '',
            };
        }) : [];
        setMembers(normalized);
        setFilteredMembers(normalized);
    }, [gymData]);

    const formatPeriodLabel = (period) => {
        if (period === undefined || period === null) return '';
        const s = String(period).trim();
        // If already contains month-like text (defensive), return it
        if (/month|شهر|أشهر|شهور/i.test(s)) return s;

        if (/^\d+$/.test(s)) {
            const n = parseInt(s, 10);
            if (locale === 'ar' && n > 10) return `${n} ${t('month')}`;
            return `${n} ${(n === 1) ? t('month') : t('months')}`;
        }

        return s;
    };

    // debounce search for better UX
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            applySearchFilter(query);
        }, 250);

        return () => clearTimeout(searchTimer.current);
    }, [query, members]);

    const applySearchFilter = (text) => {
        if (!text || text.trim().length === 0) {
            setFilteredMembers(members);
            return;
        }

        const q = text.toLowerCase();
        const results = members.filter(m => {
            const parts = [];
            parts.push((m.NAME || '').toString());
            parts.push((m.EMAIL || '').toString());
            parts.push((m.PHONE || '').toString());
            parts.push((m.PERIOD || '').toString());
            parts.push((m.PRICE || '').toString());
            const hay = parts.join(' ').toLowerCase();
            return hay.indexOf(q) !== -1;
        });

        setFilteredMembers(results);
    };

    const renderItem = ({ item }) => {
        return (
            <View style={styles.memberCard}>
                <View style={styles.topRow}>
                    {item.IMAGE ? (
                        <Image source={{ uri: item.IMAGE }} style={styles.memberAvatar} />
                    ) : (
                        <View style={styles.memberAvatarPlaceholder}>
                            <Text style={styles.memberAvatarText}>{(item.NAME || '').split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
                        </View>
                    )}

                    <View style={styles.topTextWrap}>
                        <Text style={styles.memberName} numberOfLines={2} ellipsizeMode="tail">{item.NAME}</Text>
                    </View>
                </View>

                <View style={styles.rightInfo}>
                    {item.PHONE ? (
                        <TouchableOpacity
                            style={styles.emailRow}
                            onPress={() => {
                                const url = `tel:${item.PHONE}`;
                                Linking.canOpenURL(url).then((ok) => {
                                    if (ok) Linking.openURL(url);
                                }).catch(err => console.warn('Could not open dialer', err));
                            }}
                            accessibilityLabel={`${t('member_phone')}: ${item.PHONE}`}
                        >
                            <MaterialIcons name="call" size={16} color={theme.colors.primary} />
                            <Text style={styles.emailText}>{item.PHONE}</Text>
                        </TouchableOpacity>
                    ) : null}

                    {item.EMAIL ? (
                        <TouchableOpacity
                            style={styles.emailRow}
                            onPress={() => {
                                const mailto = `mailto:${item.EMAIL}`;
                                Linking.canOpenURL(mailto).then((ok) => {
                                    if (ok) Linking.openURL(mailto);
                                }).catch(err => console.warn('Could not open mail client', err));
                            }}
                            accessibilityLabel={`${t('member_email')}: ${item.EMAIL}`}
                        >
                            <MaterialIcons name="email" size={16} color={theme.colors.primary} />
                            <Text style={styles.emailText}>{item.EMAIL}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                <View style={styles.bottomRow}>
                    <View style={styles.leftInfo}>
                        <View style={styles.priceRow}>
                            <Text style={styles.memberPrice}>{item.PRICE ? `${item.PRICE} ${t('jod')}` : '-'}</Text>
                            {item.PERIOD ? (
                                <>
                                    <Text style={styles.separator}> - </Text>
                                    <Text style={styles.periodText}>{formatPeriodLabel(item.PERIOD)}</Text>
                                </>
                            ) : null}
                        </View>
                        <View style={styles.datesRow}>
                            <Text style={[styles.memberDate, styles.dateRight]}>{item.END_DATE ? `${t('member_end_date')}: ${item.END_DATE}` : '-'}</Text>
                            <Text style={[styles.memberDate, styles.dateLeft]}>{t('member_start_date')}: {item.START_DATE || '-'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) return (
        <ScreenBackground>
            <LoadingOverlay visible message={t('loading_gym_data')} />
        </ScreenBackground>
    );

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <Text style={styles.title}>{t('members')}</Text>

                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('search_members')}
                        placeholderTextColor={theme.colors.textLight}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        onSubmitEditing={() => { Keyboard.dismiss(); applySearchFilter(query); }}
                    />

                    {query.length > 0 && (
                        <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
                            <Text style={styles.clearText}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {filteredMembers.length === 0 ? (
                    <Text style={styles.empty}>{t('no_members_added')}</Text>
                ) : (
                    <FlatList
                        data={filteredMembers}
                        keyExtractor={(item, idx) => `${item.NAME || idx}-${idx}`}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: theme.spacing.lg }}
                    />
                )}
            </View>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: '700',
        color: theme.colors.text,
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    empty: {
        color: theme.colors.textLight,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
    },
    memberCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.6),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    memberAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    memberAvatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.08),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    memberAvatarText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    topTextWrap: {
        flex: 1.2,
    },

    searchContainer: {
        marginTop: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    searchInput: {
        flex: 1,
        height: 44,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.45),
        color: theme.colors.text,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        fontSize: theme.fontSize.md,
    },
    clearButton: {
        marginLeft: theme.spacing.sm,
        padding: theme.spacing.xs,
    },
    clearText: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.md,
    },
    memberLeft: {
        flex: 1.6,
        paddingRight: theme.spacing.sm,
    },
    memberName: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
    memberMeta: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
    },
    bottomRow: {
        marginTop: theme.spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
    },
    leftInfo: {
        flex: 1,
    },
    rightInfo: {
        flex: 0.9,
        alignItems: 'flex-end',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        justifyContent: 'center',
        marginTop: theme.spacing.sm,
    },
    periodText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.sm,
    },
    separator: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.sm,
        marginHorizontal: theme.spacing.xs / 2,
    },
    memberPrice: {
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    memberStart: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
    },
    memberDate: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
        marginTop: theme.spacing.xs / 2,
        textAlign: 'right',
    },
    emailRow: {
        marginVertical: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    emailText: {
        color: theme.colors.primary,
        marginLeft: theme.spacing.xs / 2,
        fontSize: theme.fontSize.sm,
        textDecorationLine: 'underline',
    },
    datesRow: {
        marginTop: theme.spacing.xs,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        width: width - 128,
    },
    dateLeft: {
        flex: 1,
        textAlign: 'right',
    },
    dateRight: {
        flex: 1,
        textAlign: 'right',
    },
});
