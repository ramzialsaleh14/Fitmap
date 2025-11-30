import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import { useTranslation } from '../utils/Strings';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';

export default function MySubscriptionsScreen({ navigation }) {
    const { t, locale } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);

    useEffect(() => {
        loadMySubscriptions();
    }, []);

    const loadMySubscriptions = async () => {
        setLoading(true);
        try {
            const email = await Commons.getFromAS(Constants.USER_EMAIL);

            // Fetch user's subscriptions via the new helper
            const resp = await ServerOperations.getMySubscriptions(email);

            // Defensive: server might return different shapes. Look for subscriptions in several places
            let list = [];
            if (!resp) list = [];
            else if (Array.isArray(resp)) list = resp;
            else if (resp.data && Array.isArray(resp.data)) list = resp.data;
            else if (resp.SUBSCRIPTIONS && Array.isArray(resp.SUBSCRIPTIONS)) list = resp.SUBSCRIPTIONS;
            else if (resp.MY_SUBSCRIPTIONS && Array.isArray(resp.MY_SUBSCRIPTIONS)) list = resp.MY_SUBSCRIPTIONS;

            // Normalize each subscription object to consistent shape
            const normalized = (list || []).map(s => {
                const sub = s || {};
                // try detect server-provided ACTIVE flag in common variants
                const activeRaw = sub.ACTIVE ?? sub.active ?? sub.IS_ACTIVE ?? sub.ISACTIVE ?? '';
                const ACTIVE = (activeRaw === true) || String(activeRaw).toLowerCase() === '1' || String(activeRaw).toLowerCase() === 'true' || String(activeRaw).toLowerCase() === 'y';

                return {
                    GYM_ID: sub.GYM_ID || sub.GYMID || sub.CUSTOMER_ID || sub.CUSTOMER || sub.ID || '',
                    GYM_NAME: sub.GYM_NAME || sub.GYM || sub.NAME || sub.EST_NAME || sub.GYMNAME || sub.CUSTOMER || '',
                    GYM_IMAGE: sub.GYM_IMAGE || sub.IMAGE || sub.PHOTO || sub.PHOTO_URL || sub.IMAGE_URL || sub.GYM_PHOTO || sub.LOGO || sub.LOGO_URL || '',
                    PERIOD: sub.PERIOD || sub.PERIOD_MONTHS || sub.PERIODS || '',
                    PRICE: sub.PRICE || sub.FEE || sub.FEE_JOD || sub.PRICE_JOD || sub.AMOUNT || '',
                    START_DATE: sub.START_DATE || sub.START || sub.SDATE || sub.FROM || sub.FROM_DATE || sub.start || '',
                    END_DATE: sub.END_DATE || sub.END || sub.EDATE || sub.TO || sub.TO_DATE || sub.till || sub.end || '',
                    ACTIVE,
                    RAW: sub,
                };
            });

            // sort so active subscriptions appear first
            const checkActive = (s) => {
                // If server explicitly provided ACTIVE use it
                if (typeof s.ACTIVE === 'boolean') return s.ACTIVE;

                const now = new Date();
                const start = s.START_DATE ? new Date(s.START_DATE) : null;
                const end = s.END_DATE ? new Date(s.END_DATE) : null;
                if (!start && !end) return false;
                if (start && !isNaN(start) && end && !isNaN(end)) return start <= now && now <= end;
                if (start && !isNaN(start) && !end) return start <= now;
                if (!start && end && !isNaN(end)) return now <= end;
                return false;
            };

            normalized.sort((a, b) => {
                const aActive = checkActive(a) ? 1 : 0;
                const bActive = checkActive(b) ? 1 : 0;
                if (aActive !== bActive) return bActive - aActive; // active first
                // tie-breaker: most recent start_date first
                const aStart = a.START_DATE ? new Date(a.START_DATE) : null;
                const bStart = b.START_DATE ? new Date(b.START_DATE) : null;
                if (aStart && bStart) return bStart - aStart;
                if (aStart) return -1;
                if (bStart) return 1;
                return 0;
            });

            setSubscriptions(normalized);
        } catch (err) {
            console.warn('Error loading subscriptions', err);
            setSubscriptions([]);
        } finally {
            setLoading(false);
        }
    };

    const isActive = (s) => {
        // If server explicitly provided ACTIVE use it
        if (typeof s.ACTIVE === 'boolean') return s.ACTIVE;
        const now = new Date();
        const start = s.START_DATE ? new Date(s.START_DATE) : null;
        const end = s.END_DATE ? new Date(s.END_DATE) : null;

        if (!start && !end) return false;
        if (start && !isNaN(start) && end && !isNaN(end)) return start <= now && now <= end;
        if (start && !isNaN(start) && !end) return start <= now;
        if (!start && end && !isNaN(end)) return now <= end;
        return false;
    };

    const formatPeriodLabel = (period) => {
        if (period === undefined || period === null) return '';
        const s = String(period).trim();
        if (/month|شهر|أشهر|شهور/i.test(s)) return s; // defensive if already localized

        if (/^\d+$/.test(s)) {
            const n = parseInt(s, 10);
            if (locale === 'ar' && n > 10) return `${n} ${t('month')}`;
            return `${n} ${(n === 1) ? t('month') : t('months')}`;
        }

        return s;
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => {
                if (item.GYM_ID) navigation.navigate('GymDetails', { gymId: item.GYM_ID });
            }}
            accessibilityLabel={`${t('subscription_for')} ${item.GYM_NAME || ''}`}
        >
            <View style={styles.rowTop}>
                {item.GYM_IMAGE ? (
                    <Image source={{ uri: item.GYM_IMAGE }} style={styles.gymImage} />
                ) : (
                    <View style={styles.gymImagePlaceholder}>
                        <Text style={styles.gymImageText}>{(item.GYM_NAME || '').split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
                    </View>
                )}

                <Text style={styles.gymName} numberOfLines={2}>{item.GYM_NAME || '-'}</Text>
                <View style={[styles.badge, isActive(item) ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={[styles.badgeText, isActive(item) ? styles.badgeTextActive : styles.badgeTextInactive]}>{isActive(item) ? t('subscription_active') : t('subscription_inactive')}</Text>
                </View>
            </View>

            <View style={styles.rowInfo}>
                <Text style={styles.infoText}>{item.PRICE ? `${item.PRICE} ${t('jod')}` : '-'}</Text>
                <Text style={styles.infoText}>{item.PERIOD ? formatPeriodLabel(item.PERIOD) : '-'}</Text>
            </View>

            <View style={styles.datesRow}>
                <Text style={[styles.memberDate, styles.dateRight]}>{item.END_DATE ? `${t('member_end_date')}: ${item.END_DATE}` : '-'}</Text>
                <Text style={[styles.memberDate, styles.dateLeft]}>{t('member_start_date')}: {item.START_DATE || '-'}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <Text style={styles.title}>{t('my_subscriptions')}</Text>

                <LoadingOverlay visible={loading} />

                {!loading && subscriptions.length === 0 && (
                    <Text style={styles.empty}>{t('no_subs_found') || 'No subscriptions found'}</Text>
                )}

                <FlatList
                    data={subscriptions}
                    keyExtractor={(it, i) => `${it.GYM_ID || it.GYM_NAME || i}-${i}`}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: theme.spacing.lg }}
                />
            </View>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: theme.spacing.lg },
    title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.text, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
    card: { backgroundColor: Commons.hexToRgba(theme.colors.card, 0.7), borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    gymImage: { width: 48, height: 48, borderRadius: 8, marginRight: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
    gymImagePlaceholder: { width: 48, height: 48, borderRadius: 8, marginRight: theme.spacing.md, backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.06), justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    gymImageText: { color: theme.colors.primary, fontWeight: '700' },
    gymName: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: theme.spacing.md },
    badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
    badgeActive: { backgroundColor: theme.colors.success, paddingVertical: 6, paddingHorizontal: 10 },
    badgeInactive: { backgroundColor: Commons.hexToRgba(theme.colors.error, 0.12) },
    badgeText: { fontSize: theme.fontSize.sm, fontWeight: '700' },
    badgeTextActive: { color: theme.colors.white },
    badgeTextInactive: { color: theme.colors.primary },
    rowInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md },
    infoText: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
    datesRow: {
        marginTop: theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.md,
        width: Constants.width - 128,
    },
    dateLeft: {
        flex: 1,
        textAlign: 'right',
    },
    dateRight: {
        flex: 1,
        textAlign: 'right',
    },
    memberDate: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
        marginTop: theme.spacing.xs / 2,
        textAlign: 'right',
    },
    empty: { color: theme.colors.textLight, textAlign: 'center', marginTop: theme.spacing.xl },
});
