import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Linking,
    ActivityIndicator,
    Dimensions,
    Alert
} from 'react-native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';
import { MaterialIcons } from '@expo/vector-icons';
import { Modal as RNModal } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function GymDetailsScreen({ route, navigation }) {
    const { gymId } = route.params;
    const { t, locale } = useTranslation();
    const [gymData, setGymData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [freeVisits, setFreeVisits] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [isRequestingEntry, setIsRequestingEntry] = useState(false);
    const [showDateTimePicker, setShowDateTimePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [isTimePickerVisible, setTimePickerVisible] = useState(false);

    useEffect(() => {
        loadGymDetails();
        loadUserData();
    }, [gymId]);

    const loadUserData = async () => {
        const email = await Commons.getFromAS(Constants.USER_EMAIL);
        const freeVisitsStr = await Commons.getFromAS(Constants.USER_FREE_VISITS);
        setUserEmail(email);

        if (freeVisitsStr) {
            try {
                setFreeVisits(JSON.parse(freeVisitsStr));
            } catch (e) {
                console.error('Error parsing freeVisits:', e);
            }
        }
    };

    const loadGymDetails = async () => {
        setIsLoading(true);
        try {
            const response = await ServerOperations.getCustomerInfo('', gymId);
            if (response) {
                setGymData(response);
                // Update header title
                navigation.setOptions({
                    title: response.NAME || response.EST_NAME || 'Gym Details'
                });
            }
        } catch (error) {
            console.error('Error loading gym details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCallPress = () => {
        if (gymData?.PHONE) {
            Linking.openURL(`tel:${gymData.PHONE}`);
        }
    };

    const handleLocationPress = (location) => {
        if (location) {
            const coords = location.split(',');
            if (coords.length === 2) {
                const lat = coords[0].trim();
                const lng = coords[1].trim();
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
            }
        }
    };

    const handleMediaPress = (media) => {
        if (media) {
            Linking.openURL(media);
        }
    };

    const handlePhotoScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / 380);
        setCurrentPhotoIndex(index);
    };

    const formatPeriodLabel = (period) => {
        if (period === undefined || period === null) return '';
        const s = String(period).trim();
        // If it already contains 'month' in english or likely translations (defensive), keep it
        if (/month|شهر|أشهر|شهور/i.test(s)) return s;

        // If period is a pure number, use localized singular/plural form from translations
        if (/^\d+$/.test(s)) {
            const n = parseInt(s, 10);
            // Arabic special rule: if locale is Arabic and the number is greater than 10
            // the request wants the singular form 'شهر' instead of 'شهور'.
            if (locale === 'ar' && n > 10) return `${n} ${t('month')}`;
            return `${n} ${(n === 1) ? t('month') : t('months')}`;
        }

        // Otherwise return the raw string (covers terms like 'Quarterly', etc.)
        return s;
    };

    const checkEligibility = (gymCategory) => {
        if (!freeVisits || !gymCategory) return false;

        const category = String(gymCategory).toLowerCase();
        const platinum = parseInt(freeVisits.platinum || '0', 10);
        const gold = parseInt(freeVisits.gold || '0', 10);
        const silver = parseInt(freeVisits.silver || '0', 10);
        const bronze = parseInt(freeVisits.bronze || '0', 10);

        // Only check exact category match
        if (category === 'platinum') return platinum > 0;
        if (category === 'gold') return gold > 0;
        if (category === 'silver') return silver > 0;
        if (category === 'bronze') return bronze > 0;

        return false;
    };

    const handleRequestEntry = async () => {
        if (!userEmail || !gymData) {
            Alert.alert(t('error'), t('please_login'));
            return;
        }

        const gymCategory = gymData.CATEGORY;
        if (!checkEligibility(gymCategory)) {
            Alert.alert(
                t('no_free_visits'),
                t('no_free_visits_message').replace('{category}', gymCategory)
            );
            return;
        }

        // Show date/time picker modal
        setSelectedDate(new Date());
        setSelectedTime(new Date());
        setShowDateTimePicker(true);
    };

    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatTime = (date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const confirmRequestEntry = () => {
        Alert.alert(
            t('confirm_request_entry'),
            t('confirm_request_entry_message'),
            [
                {
                    text: t('cancel'),
                    style: 'cancel'
                },
                {
                    text: t('yes'),
                    onPress: () => {
                        setShowDateTimePicker(false);
                        sendRequestEntry(gymData.CATEGORY, formatDate(selectedDate), formatTime(selectedTime));
                    }
                }
            ]
        );
    };

    const sendRequestEntry = async (gymCategory, date, time) => {
        setIsRequestingEntry(true);
        try {
            const response = await ServerOperations.requestEntry(userEmail, gymId, gymCategory, date, time);

            if (response && response.res) {
                // Don't deduct visit count here - it will be deducted when gym approves
                Alert.alert(
                    t('request_entry_success'),
                    t('request_entry_success_message')
                );
            } else {
                Alert.alert(
                    t('request_entry_failed'),
                    response?.msg || t('failed_save_changes')
                );
            }
        } catch (error) {
            console.error('Error requesting entry:', error);
            Alert.alert(
                t('request_entry_failed'),
                t('failed_save_changes')
            );
        } finally {
            setIsRequestingEntry(false);
        }
    };

    const [subscribeModalVisible, setSubscribeModalVisible] = useState(false);
    const [modalPlan, setModalPlan] = useState(null); // { type: 'subscription'|'promo', period, price }
    const [modalStartDate, setModalStartDate] = useState('');
    const [modalError, setModalError] = useState('');
    // subscription modal date picker state
    const [subscriptionDatePickerVisible, setSubscriptionDatePickerVisible] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    const formatDateDDMMYYYY = (date) => {
        if (!date) return '';
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    if (isLoading) {
        return (
            <ScreenBackground>
                <LoadingOverlay visible={true} message="Loading gym details..." />
            </ScreenBackground>
        );
    }

    if (!gymData) {
        return (
            <ScreenBackground>
                <View style={styles.container}>
                    <Text style={styles.errorText}>Unable to load gym details</Text>
                </View>
            </ScreenBackground>
        );
    }

    return (
        <ScreenBackground>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Photos */}
                {gymData.PHOTOS && gymData.PHOTOS.length > 0 && (
                    <View style={styles.photosContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            pagingEnabled
                            decelerationRate="fast"
                            snapToInterval={380}
                            contentContainerStyle={styles.photosContent}
                            onScroll={handlePhotoScroll}
                            scrollEventThrottle={16}
                        >
                            {gymData.PHOTOS.map((photo, index) => (
                                <View key={index} style={styles.photoWrapper}>
                                    <Image
                                        source={{ uri: photo }}
                                        style={styles.photo}
                                        resizeMode="cover"
                                    />
                                </View>
                            ))}
                        </ScrollView>
                        <View style={styles.photosOverlay}>
                            <View style={styles.photosIndicator}>
                                {gymData.PHOTOS.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.indicatorDot,
                                            index === currentPhotoIndex && styles.indicatorDotActive
                                        ]}
                                    />
                                ))}
                            </View>
                            <View style={styles.photosCounter}>
                                <Text style={styles.photosCounterText}>
                                    <MaterialIcons name="photo" size={16} color={theme.colors.white} /> {currentPhotoIndex + 1}/{gymData.PHOTOS.length}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Header Info */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text style={styles.gymName}>{gymData.NAME || gymData.EST_NAME}</Text>
                        {gymData.CATEGORY && (() => {
                            const category = gymData.CATEGORY;
                            const categoryColor = {
                                Platinum: theme.colors.platinum,
                                Gold: theme.colors.gold,
                                Silver: theme.colors.silver,
                                Bronze: theme.colors.bronze,
                            }[category] || theme.colors.primary;

                            return (
                                <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                                    <Text style={styles.categoryText}>
                                        {t(`category_${category.toLowerCase()}`)}
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>

                    {gymData.PHONE && (
                        <TouchableOpacity
                            style={styles.phoneButton}
                            onPress={handleCallPress}
                        >
                            <MaterialIcons name="call" size={18} color={theme.colors.primary} style={styles.phoneIcon} />
                            <Text style={styles.phoneText}>{gymData.PHONE}</Text>
                        </TouchableOpacity>
                    )}

                    {userEmail && checkEligibility(gymData.CATEGORY) && (
                        <TouchableOpacity
                            style={[styles.phoneButton, styles.requestEntryButton]}
                            onPress={handleRequestEntry}
                            disabled={isRequestingEntry}
                        >
                            <MaterialIcons name="login" size={18} color={theme.colors.white} style={styles.phoneIcon} />
                            <Text style={[styles.phoneText, styles.requestEntryText]}>
                                {isRequestingEntry ? t('requesting') : t('request_entry')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Services */}
                {gymData.SERVICES && gymData.SERVICES.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('services')}</Text>
                        <View style={styles.servicesList}>
                            {gymData.SERVICES.map((service, index) => (
                                <View key={index} style={styles.serviceItem}>
                                    <Text style={styles.serviceBullet}>•</Text>
                                    <Text style={styles.serviceText}>
                                        {Commons.getServiceLabel(service, locale)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Branches */}
                {gymData.BRANCHES && gymData.BRANCHES.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('branches')}</Text>
                        {gymData.BRANCHES.map((branch, index) => (
                            <View key={index} style={styles.branchCard}>
                                <View style={styles.branchHeader}>
                                    <Text style={styles.branchTitle}>
                                        {branch.BRANCH_ID || `Branch ${index + 1}`}
                                    </Text>
                                    <Text style={styles.branchArea}>{branch.AREA}</Text>
                                </View>

                                {branch.LOCATION && (
                                    <TouchableOpacity
                                        style={styles.locationButton}
                                        onPress={() => handleLocationPress(branch.LOCATION)}
                                    >
                                        <MaterialIcons name="location-on" size={18} color={theme.colors.primary} style={styles.locationIcon} />
                                        <Text style={styles.locationText}>{t('view_on_map')}</Text>
                                    </TouchableOpacity>
                                )}

                                <View style={styles.branchTiming}>
                                    {branch.MEN_FROM && branch.MEN_TO && (
                                        <View style={styles.timingRow}>
                                            <Text style={styles.timingLabel}>{t('men_hours')}</Text>
                                            <Text style={styles.timingValue}>
                                                {branch.MEN_FROM} - {branch.MEN_TO}
                                            </Text>
                                        </View>
                                    )}
                                    {branch.WOMEN_SECTION === 'Y' && branch.WOMEN_FROM && branch.WOMEN_TO && (
                                        <View style={styles.timingRow}>
                                            <Text style={styles.timingLabel}>{t('women_hours')}</Text>
                                            <Text style={styles.timingValue}>
                                                {branch.WOMEN_FROM} - {branch.WOMEN_TO}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.timingRow}>
                                        <Text style={styles.mixedBadge}> {branch.MIXED === 'Y' ? t('mixed') : t('not_mixed')} </Text>
                                    </View>
                                </View>

                                {branch.MEDIA && (
                                    <TouchableOpacity
                                        style={styles.mediaButton}
                                        onPress={() => handleMediaPress(branch.MEDIA)}
                                    >
                                        <Text style={styles.mediaText}>{branch.MEDIA}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Subscriptions */}
                {gymData.SUBSCRIPTIONS && gymData.SUBSCRIPTIONS.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('plans')}</Text>
                        <View style={styles.subscriptionsList}>
                            {gymData.SUBSCRIPTIONS.filter(sub => sub.FEE).map((sub, index) => (
                                <TouchableOpacity key={index} style={styles.subscriptionCard} onPress={async () => {
                                    // prefer promo with same PERIOD if exists
                                    let usePromo = null;
                                    if (Array.isArray(gymData.PROMOS)) {
                                        const subPeriodNum = parseInt(String(sub.PERIOD || '').replace(/\D/g, ''), 10);
                                        if (!isNaN(subPeriodNum)) {
                                            usePromo = gymData.PROMOS.find(p => parseInt(String(p.PERIOD || '').replace(/\D/g, ''), 10) === subPeriodNum);
                                        }
                                    }
                                    const plan = usePromo ? { type: 'promo', period: usePromo.PERIOD, price: usePromo.FEE, raw: usePromo } : { type: 'subscription', period: sub.PERIOD, price: sub.FEE, raw: sub };
                                    setModalPlan(plan);
                                    setModalStartDate('');
                                    setSubscribeModalVisible(true);
                                }}>
                                    <Text style={styles.subscriptionPeriod}>{formatPeriodLabel(sub.PERIOD)}</Text>
                                    <Text style={styles.subscriptionFee}>
                                        {`${sub.FEE} ${t('jod')}`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Promos */}
                {gymData.PROMOS && gymData.PROMOS.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('promos_title') || t('promos')}</Text>
                        {gymData.PROMOS.map((promo, index) => (
                            <TouchableOpacity key={index} style={styles.promoCard} onPress={() => {
                                const plan = { type: 'promo', period: promo.PERIOD, price: promo.FEE, raw: promo };
                                setModalPlan(plan);
                                setModalStartDate('');
                                setSubscribeModalVisible(true);
                            }}>
                                <View style={styles.promoHeader}>
                                    <MaterialIcons name="local-offer" size={18} color={theme.colors.primary} style={styles.promoIcon} />
                                    <Text style={styles.promoPeriod}>{formatPeriodLabel(promo.PERIOD)}</Text>
                                </View>
                                {promo.FEE && (
                                    <Text style={styles.promoFee}>{`${promo.FEE} ${t('jod')}`}</Text>
                                )}
                                {/* Show only the promo end-date as "Available until" (prefer TDT then TO) */}
                                {(promo.TDT || promo.TO) && (
                                    <Text style={styles.promoDate}>{`${t('available_until')}: ${promo.TDT || promo.TO}`}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Subscribe Modal */}
                <RNModal
                    visible={subscribeModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setSubscribeModalVisible(false)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeaderRow}>
                                <View style={[styles.modalBadge, { backgroundColor: (gymData && gymData.CATEGORY) ? ({ Platinum: theme.colors.platinum, Gold: theme.colors.gold, Silver: theme.colors.silver, Bronze: theme.colors.bronze }[gymData.CATEGORY] || theme.colors.primary) : theme.colors.primary }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>{modalPlan ? formatPeriodLabel(modalPlan.period) : ''}</Text>
                                    <Text style={styles.modalSubtitle}>{modalPlan ? `${modalPlan.price || ''} ${t('jod')}` : ''}</Text>
                                </View>
                                {modalPlan && modalPlan.type === 'promo' ? (
                                    <View style={{ alignItems: 'center' }}>
                                        <View style={[styles.typePill, { backgroundColor: Commons.hexToRgba(theme.colors.success, 0.12) }]}>
                                            <Text style={[styles.typePillText, { color: theme.colors.success }]}>{t('promo')}</Text>
                                        </View>
                                        {/* show category badge under promo */}
                                        <View style={[styles.categoryBadgePill, { marginTop: theme.spacing.sm, backgroundColor: (gymData && gymData.CATEGORY) ? ({ Platinum: theme.colors.platinum, Gold: theme.colors.gold, Silver: theme.colors.silver, Bronze: theme.colors.bronze }[gymData.CATEGORY] || theme.colors.primary) : theme.colors.primary }]}>
                                            <Text style={[styles.categoryBadgeText]}>{gymData && gymData.CATEGORY ? (locale === 'ar' ? `${t('subscription')} ${t(`category_${String(gymData.CATEGORY).toLowerCase()}`)}` : `${t(`category_${String(gymData.CATEGORY).toLowerCase()}`)} ${t('subscription')}`) : t('subscriptions')}</Text>
                                        </View>
                                    </View>
                                ) : (
                                    // For subscriptions show the gym's CATEGORY as a colored badge (instead of the word 'subscriptions')
                                    <View style={[styles.categoryBadgePill, { backgroundColor: (gymData && gymData.CATEGORY) ? ({ Platinum: theme.colors.platinum, Gold: theme.colors.gold, Silver: theme.colors.silver, Bronze: theme.colors.bronze }[gymData.CATEGORY] || theme.colors.primary) : theme.colors.primary }]}>
                                        {/** Display "Gold Subscription" (EN) or "Subscription Gold" (AR) as requested */}
                                        <Text style={[styles.categoryBadgeText]}>{gymData && gymData.CATEGORY ? (locale === 'ar' ? `${t('subscription')} ${t(`category_${String(gymData.CATEGORY).toLowerCase()}`)}` : `${t(`category_${String(gymData.CATEGORY).toLowerCase()}`)} ${t('subscription')}`) : t('subscriptions')}</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity style={[styles.modalDateField, modalError ? { borderColor: theme.colors.error, borderWidth: 1 } : null]} onPress={() => { setSubscriptionDatePickerVisible(true); setModalError(''); }}>
                                <MaterialIcons name="calendar-today" size={18} color={modalStartDate ? theme.colors.primary : theme.colors.textLight} style={{ marginRight: theme.spacing.sm }} />
                                <Text style={{ color: modalStartDate ? theme.colors.text : theme.colors.textLight }}>{modalStartDate || t('pick_start_date')}</Text>
                            </TouchableOpacity>
                            {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}

                            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setSubscribeModalVisible(false)}>
                                    <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity disabled={isSubscribing} style={[styles.button, styles.saveButton]} onPress={async () => {
                                    // validate
                                    if (!modalStartDate || modalStartDate.trim() === '') {
                                        setModalError(t('start_date_required'));
                                        // No alert — inline error + preventing submission is sufficient
                                        return;
                                    }
                                    try {
                                        setIsSubscribing(true);
                                        const userEmail = await Commons.getFromAS(Constants.USER_EMAIL);
                                        if (!userEmail) {
                                            Alert.alert(t('error'), t('please_login') || 'Please login to subscribe');
                                            setIsSubscribing(false);
                                            return;
                                        }
                                        const response = await ServerOperations.subToGym(userEmail, gymData.ID || gymId, modalPlan.period, modalPlan.price, modalStartDate);
                                        if (response && response.res) {
                                            Alert.alert(t('success'), t('subscription_success'));
                                            setSubscribeModalVisible(false);
                                            // navigate back to main screen after successful subscription
                                            try {
                                                navigation.navigate('Main');
                                            } catch (err) {
                                                console.warn('Navigation to Main failed', err);
                                            }
                                        } else {
                                            Alert.alert(t('error'), response?.msg || t('subscription_failed'));
                                        }
                                    } catch (e) {
                                        console.error('subToGym error', e);
                                        Alert.alert(t('error'), t('subscription_failed'));
                                    } finally {
                                        setIsSubscribing(false);
                                    }
                                }}>
                                    {isSubscribing ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.saveButtonText}>{t('subscribe')}</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </RNModal>

                {/* Date/Time Picker Modal for Entry Requests */}
                <RNModal
                    visible={showDateTimePicker}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDateTimePicker(false)}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{t('select_date_time')}</Text>

                            <TouchableOpacity
                                style={styles.modalDateField}
                                onPress={() => setDatePickerVisible(true)}
                            >
                                <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
                                <Text style={{ color: theme.colors.text }}>{formatDate(selectedDate)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalDateField}
                                onPress={() => setTimePickerVisible(true)}
                            >
                                <MaterialIcons name="access-time" size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
                                <Text style={{ color: theme.colors.text }}>{formatTime(selectedTime)}</Text>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={() => setShowDateTimePicker(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.saveButton]}
                                    onPress={confirmRequestEntry}
                                >
                                    <Text style={styles.saveButtonText}>{t('confirm')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </RNModal>

                <DateTimePickerModal
                    isVisible={subscriptionDatePickerVisible}
                    mode="date"
                    date={new Date()}
                    onConfirm={(date) => {
                        setSubscriptionDatePickerVisible(false);
                        setModalStartDate(formatDateDDMMYYYY(date));
                    }}
                    onCancel={() => setSubscriptionDatePickerVisible(false)}
                />

                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    date={selectedDate}
                    onConfirm={(date) => {
                        setDatePickerVisible(false);
                        setSelectedDate(date);
                    }}
                    onCancel={() => setDatePickerVisible(false)}
                />

                <DateTimePickerModal
                    isVisible={isTimePickerVisible}
                    mode="time"
                    date={selectedTime}
                    onConfirm={(time) => {
                        setTimePickerVisible(false);
                        setSelectedTime(time);
                    }}
                    onCancel={() => setTimePickerVisible(false)}
                />
            </ScrollView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    photosContainer: {
        position: 'relative',
        height: 250,
        backgroundColor: theme.colors.background,
    },
    photosContent: {
        paddingHorizontal: theme.spacing.xs,
    },
    photoWrapper: {
        width: Dimensions.get('window').width - theme.spacing.xs * 2,
        height: 250,
        marginRight: theme.spacing.xs,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photosOverlay: {
        position: 'absolute',
        bottom: theme.spacing.md,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    photosIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    indicatorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Commons.hexToRgba('#fff', 0.5),
    },
    indicatorDotActive: {
        backgroundColor: theme.colors.white,
        width: 24,
    },
    photosCounter: {
        backgroundColor: Commons.hexToRgba('#000', 0.6),
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    photosCounterText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    header: {
        padding: theme.spacing.lg,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    gymName: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        marginRight: theme.spacing.md,
    },
    categoryBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    categoryText: {
        color: theme.colors.secondary,
        fontSize: theme.fontSize.xs,
        fontWeight: 'bold',
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.15),
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    phoneIcon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    phoneText: {
        color: theme.colors.primary,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    requestEntryButton: {
        backgroundColor: theme.colors.primary,
        marginTop: theme.spacing.sm,
    },
    requestEntryText: {
        color: theme.colors.white,
    },
    section: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    servicesList: {
        gap: theme.spacing.xs,
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
    },
    serviceBullet: {
        color: theme.colors.primary,
        marginRight: theme.spacing.sm,
        fontSize: theme.fontSize.lg,
    },
    serviceText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        flex: 1,
    },
    branchCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    branchHeader: {
        marginBottom: theme.spacing.sm,
    },
    branchTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    branchArea: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.1),
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.sm,
    },
    locationIcon: {
        marginRight: theme.spacing.xs,
    },
    locationText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    branchTiming: {
        marginTop: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    timingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timingLabel: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
    },
    timingValue: {
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    mixedBadge: {
        color: theme.colors.success,
        fontSize: theme.fontSize.sm,
        fontWeight: '600',
    },
    mediaButton: {
        marginTop: theme.spacing.sm,
        padding: theme.spacing.sm,
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.sm,
        alignItems: 'flex-start',
    },
    mediaText: {
        color: theme.colors.primary,
        fontWeight: '400',
        textDecorationLine: 'underline',
        fontSize: theme.fontSize.sm,
    },
    subscriptionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    subscriptionCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        minWidth: '45%',
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
    },
    subscriptionPeriod: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    subscriptionFee: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    promoCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.success, 0.1),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.success, 0.3),
    },
    promoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    promoIcon: {
        fontSize: 20,
        marginRight: theme.spacing.sm,
    },
    promoPeriod: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
    },
    promoFee: {
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
        color: theme.colors.success,
        marginBottom: theme.spacing.xs,
    },
    promoDate: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textLight,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        width: '100%',
        backgroundColor: theme.colors.card,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    modalSubtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.md,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    modalBadge: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    // visually match the header `categoryBadge` sizing
    typePill: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typePillText: {
        fontSize: theme.fontSize.xs,
        fontWeight: '700',
    },
    // keep the modal badge visually consistent with header `categoryBadge`
    categoryBadgePill: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryBadgeText: {
        fontSize: theme.fontSize.xs,
        fontWeight: '700',
        color: theme.colors.secondary,
    },
    modalDateField: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.8),
        borderRadius: theme.borderRadius.sm,
    },
    modalError: {
        color: theme.colors.error,
        marginTop: theme.spacing.sm,
        fontSize: theme.fontSize.sm,
    },
    errorText: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.textLight,
        textAlign: 'center',
        marginTop: theme.spacing.xl,
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
