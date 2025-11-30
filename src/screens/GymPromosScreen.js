import React, { useState, useEffect } from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
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

export default function GymPromosScreen({ route, navigation }) {
    const { gymData, userEmail } = route.params;
    const [isSaving, setIsSaving] = useState(false);
    const { t, locale } = useTranslation();

    const formatPromoPeriod = (period) => {
        if (period === undefined || period === null) return '';
        const s = String(period).trim();
        // If it already contains month words (english or Arabic) keep as-is
        if (/month|شهر|أشهر|شهور|شهور/i.test(s)) return s;
        // If numeric, format with localized month/months and Arabic >10 rule
        if (/^\d+$/.test(s)) {
            const n = parseInt(s, 10);
            if (locale === 'ar' && n > 10) return `${n} ${t('month')}`; // Arabic special rule
            return `${n} ${(n === 1) ? t('month') : t('months')}`;
        }
        return s;
    };
    const [promos, setPromos] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [datePickerState, setDatePickerState] = useState({ visible: false, index: null, field: null, value: new Date() });

    useEffect(() => {
        if (gymData && gymData.PROMOS) {
            // Normalize promo keys to FDT/TDT for compatibility with older data using FROM/TO
            const normalized = gymData.PROMOS.map(p => ({
                FDT: p.FDT || p.FROM || '',
                TDT: p.TDT || p.TO || '',
                PERIOD: p.PERIOD || '',
                FEE: p.FEE || '',
            }));
            setPromos(normalized);
        }
    }, [gymData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {

            const response = await ServerOperations.saveGymData(userEmail, 'PROMOS', promos);
            if (response && response.res) {
                Alert.alert(t('success'), t('promos_updated'), [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert(t('error'), response.msg || t('failed_save_changes'));
            }
        } catch (error) {
            console.error('Error saving promos:', error);
            Alert.alert(t('error'), t('failed_save_changes'));
        } finally {
            setIsSaving(false);
        }
    };

    const addPromo = () => {
        const newPromo = {
            FDT: '',
            TDT: '',
            PERIOD: '',
            FEE: '',
        };
        setPromos([...promos, newPromo]);
        setExpandedIndex(promos.length);
    };

    const removePromo = (index) => {
        Alert.alert(t('remove_promo'), t('remove_promo_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('remove_btn'),
                style: 'destructive',
                onPress: () => {
                    const newPromos = promos.filter((_, i) => i !== index);
                    setPromos(newPromos);
                    if (expandedIndex === index) setExpandedIndex(null);
                }
            }
        ]);
    };

    const updatePromo = (index, field, value) => {
        const newPromos = [...promos];
        newPromos[index] = { ...newPromos[index], [field]: value };
        setPromos(newPromos);
    };

    const openDatePicker = (index, field, existingVal) => {
        let dt = new Date();
        if (existingVal) {
            // parse dd/mm/yyyy
            const match = String(existingVal).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) {
                const d = parseInt(match[1], 10);
                const m = parseInt(match[2], 10) - 1;
                const y = parseInt(match[3], 10);
                dt = new Date(y, m, d);
            }
        }
        setDatePickerState({ visible: true, index, field, value: dt });
    };

    const formatDateDDMMYYYY = (date) => {
        if (!date) return '';
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const onDateSelected = (selectedDate) => {
        const { index, field } = datePickerState;
        setDatePickerState({ visible: false, index: null, field: null, value: new Date() });
        if (!selectedDate) return;
        const formatted = formatDateDDMMYYYY(selectedDate);
        updatePromo(index, field, formatted);
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isSaving} message={t('saving_changes')} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('promos_title')}</Text>
                        <Text style={styles.subtitle}>{t('manage_promotional_offers')}</Text>
                    </View>

                    <View style={styles.content}>
                        <TouchableOpacity style={styles.addNewButton} onPress={addPromo}>
                            <Text style={styles.addNewButtonText}>{t('add_promo')}</Text>
                        </TouchableOpacity>

                        {promos.map((promo, index) => (
                            <View key={index} style={styles.promoCard}>
                                <TouchableOpacity
                                    style={styles.promoHeader}
                                    onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                >
                                    <View>
                                        <Text style={styles.promoTitle}>
                                            {t('promo_number').replace('{number}', index + 1)}
                                        </Text>
                                        <Text style={styles.promoSubtitle}>
                                            {promo.FEE ? `${promo.FEE} ${t('jod')}` : t('no_fee_set')}
                                            {promo.PERIOD ? ` - ${formatPromoPeriod(promo.PERIOD)}` : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.expandIcon}>{expandedIndex === index ? '▼' : '▶'}</Text>
                                </TouchableOpacity>

                                {expandedIndex === index && (
                                    <View style={styles.promoDetails}>
                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('from_date')}</Text>
                                            <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => openDatePicker(index, 'FDT', promo.FDT)}>
                                                <Text style={{ color: promo.FDT ? theme.colors.text : theme.colors.textLight }}>{promo.FDT ? promo.FDT : t('date_format')}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('to_date')}</Text>
                                            <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => openDatePicker(index, 'TDT', promo.TDT)}>
                                                <Text style={{ color: promo.TDT ? theme.colors.text : theme.colors.textLight }}>{promo.TDT ? promo.TDT : t('end_date_format')}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{`${t('subscription_period')} (${t('months')})`}</Text>
                                            {/* indicate in months */}
                                            {/* Using localized months label */}
                                            <TextInput
                                                style={styles.input}
                                                value={promo.PERIOD || ''}
                                                onChangeText={(value) => updatePromo(index, 'PERIOD', value.replace(/\D/g, ''))}
                                                placeholder={t('period_format')}
                                                placeholderTextColor={theme.colors.textLight}
                                                keyboardType='numeric'
                                            />
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('fee_jod')}</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={promo.FEE || ''}
                                                onChangeText={(value) => updatePromo(index, 'FEE', value)}
                                                placeholder={t('fee_format')}
                                                placeholderTextColor={theme.colors.textLight}
                                                keyboardType="numeric"
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removePromo(index)}
                                        >
                                            <Text style={styles.removeButtonText}>{t('remove_promo')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}

                        {promos.length === 0 && (
                            <Text style={styles.emptyText}>{t('no_promos_added')}</Text>
                        )}

                        {/* Date picker modal for promos */}
                        <DateTimePickerModal
                            isVisible={datePickerState.visible}
                            mode="date"
                            date={datePickerState.value || new Date()}
                            onConfirm={(date) => onDateSelected(date)}
                            onCancel={() => setDatePickerState({ visible: false, index: null, field: null, value: new Date() })}
                        />
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
    promoCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.65),
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    promoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    promoTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    promoSubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
    expandIcon: {
        fontSize: theme.fontSize.md,
        color: theme.colors.primary,
    },
    promoDetails: {
        padding: theme.spacing.md,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    fieldContainer: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xs,
        fontWeight: '500',
    },
    input: {
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.5),
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.sm,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    dateInput: {
        justifyContent: 'center',
        height: 48,
    },
    removeButton: {
        backgroundColor: Commons.hexToRgba(theme.colors.error, 0.15),
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        alignItems: 'center',
        marginTop: theme.spacing.sm,
    },
    removeButtonText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.error,
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
