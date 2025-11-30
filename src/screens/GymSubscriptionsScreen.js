import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';

export default function GymSubscriptionsScreen({ route, navigation }) {
    const { gymData, userEmail } = route.params;
    const [isSaving, setIsSaving] = useState(false);
    const { t, locale } = useTranslation();
    const [subscriptions, setSubscriptions] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);

    useEffect(() => {
        if (gymData && gymData.SUBSCRIPTIONS) {
            setSubscriptions([...gymData.SUBSCRIPTIONS]);
        }
    }, [gymData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await ServerOperations.saveGymData(userEmail, 'SUBSCRIPTIONS', subscriptions);
            if (response && response.res) {
                Alert.alert(t('success'), t('subscriptions_updated'), [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert(t('error'), response.msg || t('failed_save_changes'));
            }
        } catch (error) {
            console.error('Error saving subscriptions:', error);
            Alert.alert(t('error'), t('failed_save_changes'));
        } finally {
            setIsSaving(false);
        }
    };

    const addSubscription = () => {
        const newSub = {
            FEE: '',
            PERIOD: '',
        };
        setSubscriptions([...subscriptions, newSub]);
        setExpandedIndex(subscriptions.length);
    };

    const removeSubscription = (index) => {
        Alert.alert(t('remove_subscription'), t('remove_subscription_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('remove_btn'),
                style: 'destructive',
                onPress: () => {
                    const newSubs = subscriptions.filter((_, i) => i !== index);
                    setSubscriptions(newSubs);
                    if (expandedIndex === index) setExpandedIndex(null);
                }
            }
        ]);
    };

    const updateSubscription = (index, field, value) => {
        const newSubs = [...subscriptions];
        newSubs[index] = { ...newSubs[index], [field]: value };
        setSubscriptions(newSubs);
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isSaving} message={t('saving_changes')} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('subscriptions')}</Text>
                        <Text style={styles.subtitle}>{t('manage_membership_plans')}</Text>
                    </View>

                    <View style={styles.content}>
                        <TouchableOpacity style={styles.addNewButton} onPress={addSubscription}>
                            <Text style={styles.addNewButtonText}>{t('add_new_plan') || '+ Add New Plan'}</Text>
                        </TouchableOpacity>

                        {subscriptions.map((sub, index) => (
                            <View key={index} style={styles.card}>
                                <TouchableOpacity
                                    style={styles.cardHeader}
                                    onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                >
                                    <View>
                                        <Text style={styles.cardTitle}>
                                            {sub.PERIOD ? (() => {
                                                const n = parseInt(sub.PERIOD, 10);
                                                if (!isNaN(n)) {
                                                    // Arabic special rule: if locale is Arabic and n > 10, use singular
                                                    if (locale === 'ar' && n > 10) return `${n} ${t('month')}`;
                                                    return `${n} ${(n === 1) ? t('month') : t('months')}`;
                                                }
                                                return `${sub.PERIOD} ${t('months')}`;
                                            })() : t('plan_number').replace('{number}', index + 1)}
                                        </Text>
                                        <Text style={styles.cardSubtitle}>
                                            {sub.FEE ? `${sub.FEE} ${t('jod')}` : t('no_price_set')}
                                        </Text>
                                    </View>
                                    <Text style={styles.expandIcon}>{expandedIndex === index ? '▼' : '▶'}</Text>
                                </TouchableOpacity>

                                {expandedIndex === index && (
                                    <View style={styles.cardDetails}>
                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{`${t('period')} (${t('months')})`}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                                                <TextInput
                                                    style={[styles.input, { flex: 1 }]}
                                                    value={sub.PERIOD ? String(sub.PERIOD) : ''}
                                                    onChangeText={(value) => updateSubscription(index, 'PERIOD', value.replace(/\D/g, ''))}
                                                    placeholder={t('period_format_months') || 'e.g., 1'}
                                                    placeholderTextColor={theme.colors.textLight}
                                                    keyboardType="numeric"
                                                />
                                                <Text style={{ color: theme.colors.textLight, fontWeight: '600' }}>{(() => {
                                                    const v = sub.PERIOD && parseInt(sub.PERIOD, 10);
                                                    if (!v || isNaN(v)) return t('months');
                                                    if (locale === 'ar' && v > 10) return t('month');
                                                    return (v === 1) ? t('month') : t('months');
                                                })()}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('fee_jod') || 'Fee (JOD)'}</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={sub.FEE || ''}
                                                onChangeText={(value) => updateSubscription(index, 'FEE', value)}
                                                placeholder={t('price_format')}
                                                placeholderTextColor={theme.colors.textLight}
                                                keyboardType="numeric"
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeSubscription(index)}
                                        >
                                            <Text style={styles.removeButtonText}>{t('remove_subscription')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}

                        {subscriptions.length === 0 && (
                            <Text style={styles.emptyText}>{t('no_subscription_plans')}</Text>
                        )}
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>{t('save_changes')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
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
    subtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
    },
    content: {
        padding: theme.spacing.lg,
    },
    addNewButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        elevation: 2,
    },
    addNewButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    card: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.65),
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    cardTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
    },
    cardSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        marginTop: theme.spacing.xs,
        fontWeight: '600',
    },
    expandIcon: {
        fontSize: 16,
        color: theme.colors.primary,
    },
    cardDetails: {
        padding: theme.spacing.md,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: Commons.hexToRgba(theme.colors.border, 0.3),
    },
    fieldContainer: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.5),
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.4),
    },
    multilineInput: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    removeButton: {
        backgroundColor: Commons.hexToRgba(theme.colors.error, 0.15),
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    removeButtonText: {
        color: theme.colors.error,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
        textAlign: 'center',
        padding: theme.spacing.xl,
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    button: {
        flex: 1,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        elevation: 2,
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.7),
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
});
