import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Image,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../utils/theme';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import * as Constants from '../utils/Constants';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import { useTranslation } from '../utils/Strings';

export default function GymGeneralInfoScreen({ route, navigation }) {
    const { gymData, userEmail } = route.params;
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const [images, setImages] = useState([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    useEffect(() => {
        if (gymData) {
            // Extract non-array fields from gymData and hide id/status
            const generalInfo = {};
            const hiddenKeys = new Set(['ID', 'id', 'STATUS', 'status']);
            Object.keys(gymData).forEach(key => {
                if (!Array.isArray(gymData[key]) && !hiddenKeys.has(key)) {
                    generalInfo[key] = gymData[key] || '';
                }
            });

            // If gymData contains photos (array or @@-joined string), track it separately in state
            console.log('GymGeneralInfoScreen: incoming gymData keys:', Object.keys(gymData));
            let incomingPhotos = [];
            if (Array.isArray(gymData.PHOTOS) && gymData.PHOTOS.length > 0) {
                incomingPhotos = [...gymData.PHOTOS];
            } else if (typeof gymData.PHOTOS === 'string' && gymData.PHOTOS.trim().length > 0) {
                incomingPhotos = gymData.PHOTOS.split(/@@/).map(s => s.trim()).filter(Boolean);
            } else if (Array.isArray(gymData.IMAGES) && gymData.IMAGES.length > 0) {
                incomingPhotos = [...gymData.IMAGES];
            } else if (typeof gymData.IMAGES === 'string' && gymData.IMAGES.trim().length > 0) {
                incomingPhotos = gymData.IMAGES.split(/@@/).map(s => s.trim()).filter(Boolean);
            } else if (Array.isArray(gymData.MEDIA) && gymData.MEDIA.length > 0) {
                incomingPhotos = [...gymData.MEDIA];
            } else if (typeof gymData.MEDIA === 'string' && gymData.MEDIA.trim().length > 0) {
                incomingPhotos = gymData.MEDIA.split(/@@/).map(s => s.trim()).filter(Boolean);
            }

            // Normalize incoming photo URLs and ensure they are absolute (prefix attachmentPath if needed)
            if (incomingPhotos.length > 0) {
                const normalized = incomingPhotos.map(p => {
                    if (!p) return p;
                    const s = String(p).trim();
                    if (/^(https?:)?\/\//i.test(s)) return s; // already absolute
                    // prefix with attachmentPath
                    return Constants.attachmentPath.replace(/\/$/, '') + '/' + s.replace(/^\//, '');
                });
                console.log('GymGeneralInfoScreen: normalized PHOTOS:', normalized);
                setImages(normalized);
            }
            setFormData(generalInfo);
        }
    }, [gymData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // include images in the payload under PHOTOS key as an array (server expects array)
            const payload = { ...formData, PHOTOS: images.join('@@') };
            console.log('payload to save:', payload);
            const response = await ServerOperations.saveGymData(userEmail, 'GENERAL_INFO', payload);
            if (response && response.res) {
                Alert.alert(t('success'), t('general_info_updated'), [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert(t('error'), response.msg || t('failed_save_changes'));
            }
        } catch (error) {
            console.error('Error saving general info:', error);
            Alert.alert(t('error'), t('failed_save_changes'));
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('permission_required'), t('need_camera_roll_permissions'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: false,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            setIsUploadingImage(true);
            const asset = result.assets[0];

            const originalName = asset.fileName || 'image.jpg';
            const dotIndex = originalName.lastIndexOf('.');
            const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : '.jpg';
            const generatedName = Date.now() + extension;

            const file = { uri: asset.uri, name: generatedName, type: 'image/*' };
            const res = await ServerOperations.pickUploadHttpRequest(file);
            if (res && res.URL) {
                const url = Constants.attachmentPath + res.URL;
                setImages(prev => [...prev, url]);
            } else {
                Alert.alert(t('upload_failed_title'), t('upload_failed'));
            }
        } catch (err) {
            console.error('pickImage error', err);
            Alert.alert(t('error'), t('failed_pick_or_upload_image'));
        } finally {
            setIsUploadingImage(false);
        }
    };

    const removeImage = (index) => {
        const newImgs = images.filter((_, i) => i !== index);
        setImages(newImgs);
    };

    const { t } = useTranslation();

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isSaving} message={t('saving_changes')} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('general_information')}</Text>
                        <Text style={styles.subtitle}>{t('manage_gym_basic')}</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Images section - allow multiple images for general info */}
                        <View style={styles.imagesContainer}>
                            <View style={styles.photosHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                                    <MaterialIcons name="photo" size={20} color={theme.colors.primary} />
                                    <Text style={styles.photosLabel}>{t('images') || 'Images'}</Text>
                                </View>
                                <Text style={styles.photosCount}>{images.length}</Text>
                            </View>
                            <View style={styles.imagesRow}>
                                {images.map((img, i) => (
                                    <View key={i} style={styles.imageThumbContainer}>
                                        <Image source={{ uri: img }} style={styles.imageThumb} />
                                        <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(i)}>
                                            <Text style={{ color: 'white' }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                                    {isUploadingImage ? (
                                        <ActivityIndicator color={theme.colors.primary} />
                                    ) : (
                                        <MaterialIcons name="add-photo-alternate" size={28} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                        {Object.keys(formData).map((key) => {
                            // Hide ID and STATUS fields from UI and disable username
                            const hiddenKeys = new Set(['ID', 'id', 'STATUS', 'status']);
                            if (hiddenKeys.has(key)) return null;

                            const baseKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
                            const isUsername = baseKey === 'username';
                            const isCategory = baseKey === 'category';
                            // accept both 'businesstype' and 'business_type' (some servers/keys use underscores)
                            const isBusinessType = baseKey === 'businesstype' || baseKey === 'business_type' || (baseKey.includes('business') && baseKey.includes('type'));

                            // Detect phone fields so we can show numeric keyboard and sanitize input
                            const isPhone = baseKey === 'phone' || baseKey.includes('phone') || baseKey.includes('tel');

                            // Try to use a translated label for the exact key, fall back to a readable label
                            const translatedLabel = t(baseKey);
                            const labelText = isUsername
                                ? t('email')
                                : (translatedLabel !== baseKey ? translatedLabel : key.replace(/_/g, ' '));

                            return (
                                <View key={key} style={styles.fieldContainer}>
                                    <Text style={styles.label}>{labelText}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={String(formData[key])}
                                        onChangeText={(value) => {
                                            // If this is a phone field keep only digits (and + if desired)
                                            if (isPhone && typeof value === 'string') {
                                                // Allow digits, plus and spaces - strip other characters
                                                const sanitized = value.replace(/[^\d+\s-()]/g, '')
                                                    // collapse multiple spaces/dashes
                                                    .replace(/[\s-]{2,}/g, ' ').trim();
                                                updateField(key, sanitized);
                                            } else {
                                                updateField(key, value);
                                            }
                                        }}
                                        editable={!isUsername && !isCategory && !isBusinessType}
                                        selectTextOnFocus={!isUsername && !isCategory && !isBusinessType}
                                        placeholder={
                                            // Try translation for common 'enter_x' keys, otherwise fallback to readable placeholder
                                            (function () {
                                                const enterKey = `enter_${baseKey}`;
                                                const translatedPlaceholder = t(enterKey);
                                                if (translatedPlaceholder !== enterKey) return translatedPlaceholder;
                                                return `Enter ${key.replace(/_/g, ' ').toLowerCase()}`;
                                            })()
                                        }
                                        placeholderTextColor={theme.colors.textLight}
                                        multiline={key.includes('DESCRIPTION') || key.includes('ABOUT')}
                                        numberOfLines={key.includes('DESCRIPTION') || key.includes('ABOUT') ? 4 : 1}
                                        keyboardType={isUsername ? 'email-address' : (isPhone ? 'phone-pad' : undefined)}
                                    />
                                </View>
                            );
                        })}
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
        </ScreenBackground >
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
    form: {
        padding: theme.spacing.lg,
    },
    fieldContainer: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textTransform: 'capitalize',
    },
    input: {
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.5),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
    },
    imagesContainer: {
        marginBottom: theme.spacing.lg,
    },
    imagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexWrap: 'wrap',
    },
    photosHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    photosLabel: {
        fontSize: theme.fontSize.lg,
        fontWeight: '700',
        color: theme.colors.text,
    },
    photosCount: {
        backgroundColor: theme.colors.primary,
        color: theme.colors.white,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        fontSize: theme.fontSize.sm,
        fontWeight: '700',
        overflow: 'hidden',
        textAlign: 'center',
        color: theme.colors.white,
    },
    imageThumbContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        position: 'relative',
    },
    imageThumb: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageRemove: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageButton: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.5),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.6),
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
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
