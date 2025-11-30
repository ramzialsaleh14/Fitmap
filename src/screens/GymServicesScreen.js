import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,

    TouchableOpacity,
    Alert,
    FlatList,
    Modal,
} from 'react-native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';

export default function GymServicesScreen({ route, navigation }) {
    const { gymData, userEmail } = route.params;
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useTranslation();
    const [services, setServices] = useState([]); // now an array of { ID, DESC }
    // Service names are not editable. Keep only add/remove.
    const [availableServices, setAvailableServices] = useState([]);
    const [showServicePicker, setShowServicePicker] = useState(false);
    const [serviceQuery, setServiceQuery] = useState('');

    useEffect(() => {
        if (gymData && gymData.SERVICES) {
            // normalize services: may be array of strings or objects
            const normalized = gymData.SERVICES.map(s => {
                if (typeof s === 'string') return { ID: `SV${Math.random().toString(36).substr(2, 8)}`, DESC: s };
                if (s && (s.DESC || s.desc || s.NAME || s.name)) return { ID: s.ID || s.id || `SV${Math.random().toString(36).substr(2, 8)}`, DESC: s.DESC || s.desc || s.NAME || s.name };
                return { ID: s.ID || s.id || `SV${Math.random().toString(36).substr(2, 8)}`, DESC: '' };
            });
            setServices(normalized);
        }
        // Load master services list from server
        (async () => {
            try {
                const resp = await ServerOperations.getServices();
                if (resp) {
                    const normalizedMaster = resp.map(s => ({ ID: s.ID || s.id, DESC: s.DESC || s.desc || s.NAME || s.name }));
                    setAvailableServices(normalizedMaster);
                }
            } catch (error) {
                console.error('Error fetching master services list:', error);
            }
        })();
    }, [gymData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {

            const response = await ServerOperations.saveGymData(userEmail, 'SERVICES', services);
            if (response && response.res) {
                Alert.alert(t('success'), t('services_updated'), [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert(t('error'), response.msg || t('failed_save_changes'));
            }
        } catch (error) {
            console.error('Error saving services:', error);
            Alert.alert(t('error'), t('failed_save_changes'));
        } finally {
            setIsSaving(false);
        }
    };

    // Add by identifier (ID or DESC). Return true if added, false if duplicate / invalid
    const addServiceByValue = (value) => {
        const serviceObj = availableServices.find(s => s.ID === value || s.DESC === value);
        if (!serviceObj) {
            // nothing to add
            return { ok: false, msg: 'select' };
        }
        // Prevent duplicates
        if (services.find(s => s.ID === serviceObj.ID)) {
            return { ok: false, msg: 'duplicate' };
        }
        setServices(prev => [...prev, { ID: serviceObj.ID, DESC: serviceObj.DESC }]);
        // Clear search state to help find next item
        setServiceQuery('');
        return { ok: true };
    };

    // addService inline now removed (we add immediately when user taps an item in the modal)


    const removeService = (index) => {
        Alert.alert(t('remove_service'), t('remove_service_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('remove_btn'),
                style: 'destructive',
                onPress: () => {
                    const newServices = services.filter((_, i) => i !== index);
                    setServices(newServices);
                }
            }
        ]);
    };

    const updateService = (index, value) => {
        const newServices = [...services];
        newServices[index] = { ...newServices[index], DESC: value };
        setServices(newServices);
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isSaving} message="Saving changes..." />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('services_text')}</Text>
                        <Text style={styles.subtitle}>{t('manage_services')}</Text>
                    </View>

                    <View style={styles.content}>
                        {/* Add New Service CTA — opens modal for choosing services */}
                        <View style={styles.addSection}>
                            <TouchableOpacity style={styles.addCTA} onPress={() => setShowServicePicker(true)}>
                                <Text style={styles.addCTAText}>{t('add_new_service')}</Text>
                                <View style={styles.addCTAButton}><Text style={styles.addCTAButtonText}>+</Text></View>
                            </TouchableOpacity>
                        </View>

                        {/* Master service picker modal */}
                        <Modal
                            visible={showServicePicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowServicePicker(false)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContainer}>
                                    <View style={styles.modalHeaderRow}>
                                        <Text style={styles.modalTitle}>{t('choose_service')}</Text>
                                        <TouchableOpacity onPress={() => setShowServicePicker(false)} style={styles.modalCloseIcon}>
                                            <Text style={{ color: theme.colors.textLight, fontWeight: '700' }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.searchRow}>
                                        <TextInput
                                            placeholder={t('search_services')}
                                            placeholderTextColor={theme.colors.textLight}
                                            style={styles.searchInput}
                                            value={serviceQuery}
                                            onChangeText={setServiceQuery}
                                        />
                                    </View>
                                    <FlatList
                                        data={availableServices.filter(s => !serviceQuery || String(s.DESC).toLowerCase().includes(String(serviceQuery).toLowerCase()))}
                                        keyExtractor={(item) => item.ID?.toString() || item.DESC}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.modalItem}
                                                onPress={() => {
                                                    // Attempt to add immediately when pressed
                                                    const res = addServiceByValue(item.ID || item.DESC);
                                                    if (!res.ok) {
                                                        if (res.msg === 'duplicate') return Alert.alert(t('already_added'));
                                                        return Alert.alert(t('select_a_service'));
                                                    }
                                                    setShowServicePicker(false);
                                                }}
                                            >
                                                <View style={styles.modalItemRow}>
                                                    <Text style={styles.modalItemText}>{item.DESC}</Text>
                                                    <View style={styles.modalItemAction}><Text style={styles.modalItemActionText}>+</Text></View>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    />
                                    <TouchableOpacity style={styles.modalClose} onPress={() => setShowServicePicker(false)}>
                                        <Text style={styles.modalCloseText}>{t('cancel')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>

                        {/* Services List */}
                        <View style={styles.listSection}>
                            <Text style={styles.sectionTitle}>{t('current_services')} ({services.length})</Text>
                            {services.map((service, index) => (
                                <View key={index} style={styles.listItem}>
                                    <View style={styles.itemTextContainer}>
                                        <Text style={styles.itemText}>{service.DESC || service.desc || service.NAME || service}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeService(index)}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {services.length === 0 && (
                                <Text style={styles.emptyText}>{t('no_services')}</Text>
                            )}
                        </View>
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
    addSection: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    addContainer: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },

    addCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.6),
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
    },
    addCTAText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    addCTAButton: {
        width: 40,
        height: 40,
        borderRadius: 40 / 2,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addCTAButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: '700',
    },
    addInput: {
        flex: 1,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.5),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
    },
    addButton: {
        backgroundColor: theme.colors.primary,
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    addButtonText: {
        fontSize: 30,
        color: theme.colors.white,
        fontWeight: 'bold',
    },
    pickerInput: {
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.5),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
        justifyContent: 'center',
    },
    pickerText: {
        color: theme.colors.textLight,
    },
    listSection: {
        marginBottom: theme.spacing.lg,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.65),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    itemTextContainer: {
        flex: 1,
    },
    itemText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
    },
    editInput: {
        flex: 1,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        padding: 0,
    },
    removeButton: {
        backgroundColor: Commons.hexToRgba(theme.colors.error, 0.15),
        width: 35,
        height: 35,
        borderRadius: theme.borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        fontSize: 24,
        color: theme.colors.error,
        fontWeight: 'bold',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '70%',
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.lg,
    },
    modalTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
        color: theme.colors.text,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    modalCloseIcon: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchRow: {
        marginBottom: theme.spacing.sm,
    },
    searchInput: {
        height: 44,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.35),
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
    },
    modalItem: {
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
    },
    modalItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    modalItemAction: {
        width: 36,
        height: 36,
        borderRadius: 36 / 2,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    modalItemActionText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: theme.fontSize.lg,
    },
    modalItemText: {
        color: theme.colors.text,
    },
    modalClose: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    modalCloseText: {
        color: theme.colors.white,
        fontWeight: '700',
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
