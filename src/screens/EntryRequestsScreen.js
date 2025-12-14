import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import ScreenBackground from '../components/ScreenBackground';
import { MaterialIcons } from '@expo/vector-icons';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function EntryRequestsScreen({ route }) {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { gymData, userEmail } = route.params;
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('Pending');
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
    const [isFromDatePickerVisible, setFromDatePickerVisible] = useState(false);
    const [isToDatePickerVisible, setToDatePickerVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadRequests();
    }, [selectedStatus, fromDate, toDate]);

    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const gymId = gymData?.ID || '';
            const fromDateStr = formatDate(fromDate);
            const toDateStr = formatDate(toDate);
            const response = await ServerOperations.getEntryRequests(gymId, fromDateStr, toDateStr, selectedStatus);

            if (response) {
                setRequests(response);
            } else {
                setRequests([]);
            }
        } catch (error) {
            console.error('Error loading entry requests:', error);
            setRequests([]);
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const handleStatusChange = (status) => {
        setSelectedStatus(status);
        setShowFilters(false);
    };

    const handleFromDateConfirm = (date) => {
        setFromDatePickerVisible(false);
        setFromDate(date);
    };

    const handleToDateConfirm = (date) => {
        setToDatePickerVisible(false);
        setToDate(date);
    };

    const handleApprove = (request) => {
        Alert.alert(
            t('approve_request'),
            t('approve_request_message'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('approve'),
                    onPress: async () => {
                        await updateRequestStatus(request, 'Approved');
                    }
                }
            ]
        );
    };

    const handleDeny = (request) => {
        Alert.alert(
            t('deny_request'),
            t('deny_request_message'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('deny'),
                    style: 'destructive',
                    onPress: async () => {
                        await updateRequestStatus(request, 'Denied');
                    }
                }
            ]
        );
    };

    const updateRequestStatus = async (request, status) => {
        setIsUpdating(true);
        try {
            const response = await ServerOperations.respondToEntryRequest(
                request.ID,
                status,
            );

            if (response && response.res) {
                Alert.alert(
                    status === 'Approved' ? t('request_approved') : t('request_denied'),
                    ''
                );
                loadRequests();
            } else {
                Alert.alert(t('request_update_failed'), response?.msg || '');
            }
        } catch (error) {
            console.error('Error updating request status:', error);
            Alert.alert(t('request_update_failed'), '');
        } finally {
            setIsUpdating(false);
        }
    };

    const statusOptions = [
        { value: 'All', label: t('all'), color: theme.colors.text },
        { value: 'Pending', label: t('pending'), color: theme.colors.warning },
        { value: 'Approved', label: t('approved'), color: theme.colors.success },
        { value: 'Denied', label: t('denied'), color: theme.colors.error },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return theme.colors.warning;
            case 'Approved': return theme.colors.success;
            case 'Denied': return theme.colors.error;
            default: return theme.colors.text;
        }
    };

    const renderRequest = (request) => {
        const isPending = request.STATUS === 'Pending';

        return (
            <TouchableOpacity
                style={styles.requestCard}
                onPress={() => isPending && handleRequestPress(request)}
                disabled={!isPending}
                activeOpacity={isPending ? 0.7 : 1}
            >
                <View style={styles.requestHeader}>
                    <View style={styles.userInfo}>
                        <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                        <Text style={[styles.userName, { marginLeft: theme.spacing.sm }]}>{request.NAME || request.EMAIL}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.STATUS) }]}>
                        <Text style={styles.statusText}>
                            {t(request.STATUS.toLowerCase())}
                        </Text>
                    </View>
                </View>

                <View style={styles.requestDetails}>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="calendar-today" size={16} color={theme.colors.textLight} />
                        <Text style={[styles.detailText, { marginLeft: theme.spacing.sm }]}>{request.DATE}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="access-time" size={16} color={theme.colors.textLight} />
                        <Text style={[styles.detailText, { marginLeft: theme.spacing.sm }]}>{request.TIME}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialIcons name="email" size={16} color={theme.colors.textLight} />
                        <Text style={[styles.detailText, { marginLeft: theme.spacing.sm }]}>{request.EMAIL}</Text>
                    </View>
                </View>

                {isPending && (
                    <View style={styles.tapHintContainer}>
                        <MaterialIcons name="touch-app" size={16} color={theme.colors.primary} />
                        <Text style={[styles.tapHint, { marginLeft: theme.spacing.xs }]}>{t('tap_to_respond')}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const handleRequestPress = (request) => {
        setSelectedRequest(request);
        setShowResponseModal(true);
    };

    const handleModalResponse = async (status) => {
        if (selectedRequest) {
            await updateRequestStatus(selectedRequest, status);
            setShowResponseModal(false);
            setSelectedRequest(null);
        }
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('entry_requests')}</Text>
                    <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
                        <MaterialIcons name="filter-list" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Filter Section */}
                {showFilters && (
                    <View style={styles.filterSection}>
                        <Text style={styles.filterLabel}>{t('status')}:</Text>
                        <View style={styles.statusButtons}>
                            {statusOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.statusButton,
                                        selectedStatus === option.value && styles.statusButtonActive,
                                        { marginRight: theme.spacing.sm, marginBottom: theme.spacing.sm }
                                    ]}
                                    onPress={() => handleStatusChange(option.value)}
                                >
                                    <Text
                                        style={[
                                            styles.statusButtonText,
                                            selectedStatus === option.value && { color: option.color }
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.filterLabel}>{t('from_date')}:</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setFromDatePickerVisible(true)}
                        >
                            <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                            <Text style={[styles.dateButtonText, { marginLeft: theme.spacing.sm }]}>{formatDate(fromDate)}</Text>
                        </TouchableOpacity>

                        <Text style={styles.filterLabel}>{t('to_date')}:</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setToDatePickerVisible(true)}
                        >
                            <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                            <Text style={[styles.dateButtonText, { marginLeft: theme.spacing.sm }]}>{formatDate(toDate)}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Current Filters Display */}
                <View style={styles.currentFilters}>
                    <View style={[styles.filterChip, { marginRight: theme.spacing.sm }]}>
                        <Text style={styles.filterChipText}>
                            {t('status')}: {statusOptions.find(o => o.value === selectedStatus)?.label}
                        </Text>
                    </View>
                    <View style={styles.filterChip}>
                        <Text style={styles.filterChipText}>
                            {formatDate(fromDate)} - {formatDate(toDate)}
                        </Text>
                    </View>
                </View>

                {/* Requests List */}
                <FlatList
                    data={requests}
                    keyExtractor={(item, index) => item.ID?.toString() || index.toString()}
                    renderItem={({ item }) => renderRequest(item)}
                    style={styles.flatList}
                    contentContainerStyle={styles.flatListContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="inbox" size={64} color={theme.colors.textLight} />
                                <Text style={styles.emptyTitle}>{t('no_requests_found')}</Text>
                                <Text style={styles.emptyMessage}>{t('no_requests_message')}</Text>
                            </View>
                        )
                    }
                />

                {/* Date Picker Modals */}
                <DateTimePickerModal
                    isVisible={isFromDatePickerVisible}
                    mode="date"
                    date={fromDate}
                    onConfirm={handleFromDateConfirm}
                    onCancel={() => setFromDatePickerVisible(false)}
                />
                <DateTimePickerModal
                    isVisible={isToDatePickerVisible}
                    mode="date"
                    date={toDate}
                    onConfirm={handleToDateConfirm}
                    onCancel={() => setToDatePickerVisible(false)}
                />

                {/* Response Modal */}
                <Modal
                    visible={showResponseModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowResponseModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('respond_to_request')}</Text>
                                <TouchableOpacity onPress={() => setShowResponseModal(false)}>
                                    <MaterialIcons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            {selectedRequest && (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons name="person" size={20} color={theme.colors.primary} />
                                        <Text style={styles.modalInfoText}>{selectedRequest.NAME || selectedRequest.EMAIL}</Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                                        <Text style={styles.modalInfoText}>{selectedRequest.DATE}</Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons name="access-time" size={20} color={theme.colors.primary} />
                                        <Text style={styles.modalInfoText}>{selectedRequest.TIME}</Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <MaterialIcons name="email" size={20} color={theme.colors.primary} />
                                        <Text style={styles.modalInfoText}>{selectedRequest.EMAIL}</Text>
                                    </View>

                                    <Text style={styles.modalActionLabel}>{t('choose_action')}</Text>

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.denyModalButton]}
                                            onPress={() => handleModalResponse('Denied')}
                                            disabled={isUpdating}
                                        >
                                            <MaterialIcons name="close" size={24} color={theme.colors.white} />
                                            <Text style={styles.modalButtonText}>{t('deny')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.approveModalButton]}
                                            onPress={() => handleModalResponse('Approved')}
                                            disabled={isUpdating}
                                        >
                                            <MaterialIcons name="check" size={24} color={theme.colors.white} />
                                            <Text style={styles.modalButtonText}>{t('approve')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {isUpdating && (
                                        <View style={styles.loadingOverlay}>
                                            <ActivityIndicator size="large" color={theme.colors.primary} />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: theme.spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    backButton: {
        padding: theme.spacing.xs,
    },
    headerTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
        textAlign: 'center',
    },
    filterButton: {
        padding: theme.spacing.xs,
    },
    filterSection: {
        backgroundColor: theme.colors.card,
        padding: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    filterLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.sm,
    },
    statusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    statusButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.backgroundLight,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statusButtonActive: {
        backgroundColor: theme.colors.white,
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    statusButtonText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundLight,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    dateButtonText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
    },
    currentFilters: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    filterChip: {
        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.1),
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
    },
    filterChipText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
    },
    flatList: {
        flex: 1,
    },
    flatListContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl * 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl * 2,
        paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
    },
    emptyMessage: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    requestCard: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userName: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    statusText: {
        fontSize: theme.fontSize.xs,
        fontWeight: '700',
        color: theme.colors.white,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    requestDetails: {
        marginBottom: theme.spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    detailText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textLight,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginHorizontal: theme.spacing.xs,
    },
    approveButton: {
        backgroundColor: theme.colors.success,
    },
    denyButton: {
        backgroundColor: theme.colors.error,
    },
    actionButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    tapHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: theme.spacing.sm,
        paddingTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    tapHint: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        width: '85%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalBody: {
        padding: theme.spacing.lg,
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalInfoText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    modalActionLabel: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        marginHorizontal: theme.spacing.xs,
    },
    approveModalButton: {
        backgroundColor: theme.colors.success,
    },
    denyModalButton: {
        backgroundColor: theme.colors.error,
    },
    modalButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: '700',
        marginLeft: theme.spacing.xs,
        textTransform: 'uppercase',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.lg,
    },
});
