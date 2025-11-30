import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../utils/theme';
import { useTranslation } from '../utils/Strings';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import * as Constants from '../utils/Constants';

export default function GymTrainersScreen({ route, navigation }) {
    const { gymData, userEmail } = route.params;
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useTranslation();
    // trainers can be an array of strings (legacy) or objects with { NAME, IMAGE }
    const [trainers, setTrainers] = useState([]);
    const [uploadingIndex, setUploadingIndex] = useState(null);

    useEffect(() => {
        if (gymData && gymData.TRAINERS) {
            // Normalize trainers: support both string entries and { NAME } objects — also preserve IMAGE if present
            const normalized = gymData.TRAINERS.map(t => {
                if (!t) return { NAME: '' };
                if (typeof t === 'string') return { NAME: t };
                if (t.NAME) {
                    // If t has IMAGE or IMG or AVATAR fields, normalize to IMAGE
                    const photo = t.IMAGE || t.PHOTO || t.IMG || t.AVATAR || t.PHOTO_URL || null;
                    if (photo) return { ...t, IMAGE: photo };
                    return { ...t };
                }
                // fallback
                return { NAME: String(t) };
            });
            setTrainers(normalized);
        }
    }, [gymData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Convert trainers back into the server-expected format: array of objects with NAME and optionally IMAGE
            const payload = trainers.map(t => {
                const trainerObj = (typeof t === 'string') ? { NAME: t } : { NAME: t.NAME || '' };
                if (t && typeof t === 'object' && t.IMAGE) {
                    trainerObj.IMAGE = t.IMAGE;
                }
                return trainerObj;
            });

            const response = await ServerOperations.saveGymData(userEmail, 'TRAINERS', payload);
            if (response && response.res) {
                Alert.alert(t('success'), t('trainers_updated'), [
                    { text: t('ok') || 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert(t('error'), response.msg || t('failed_save_changes'));
            }
        } catch (error) {
            console.error('Error saving trainers:', error);
            Alert.alert(t('error'), t('failed_save_changes'));
        } finally {
            setIsSaving(false);
        }
    };

    const addTrainer = () => {
        setTrainers([...trainers, { NAME: '', IMAGE: '' }]);
    };

    const pickTrainerImage = async (index) => {
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

            setUploadingIndex(index);
            const asset = result.assets[0];

            const originalName = asset.fileName || 'image.jpg';
            const dotIndex = originalName.lastIndexOf('.');
            const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : '.jpg';
            const generatedName = Date.now() + extension;

            const file = { uri: asset.uri, name: generatedName, type: 'image/*' };
            const res = await ServerOperations.pickUploadHttpRequest(file);
            if (res && res.URL) {
                const url = Constants.attachmentPath + res.URL;
                const newList = [...trainers];
                const cur = newList[index] || { NAME: '' };
                newList[index] = { ...(typeof cur === 'string' ? { NAME: cur } : cur), IMAGE: url };
                setTrainers(newList);
            } else {
                Alert.alert(t('upload_failed_title'), t('upload_failed'));
            }
        } catch (err) {
            console.error('pickTrainerImage error', err);
            Alert.alert(t('error'), t('failed_pick_or_upload_image'));
        } finally {
            setUploadingIndex(null);
        }
    };

    const removeTrainerImage = (index) => {
        const list = [...trainers];
        const item = list[index];
        if (!item) return;
        list[index] = { ...(typeof item === 'string' ? { NAME: item } : item), IMAGE: '' };
        setTrainers(list);
    };

    const removeTrainer = (index) => {
        const newTrainers = trainers.filter((_, i) => i !== index);
        setTrainers(newTrainers);
    };

    const updateTrainer = (index, value) => {
        const newTrainers = [...trainers];
        const t = newTrainers[index];
        if (typeof t === 'string') {
            newTrainers[index] = value;
        } else if (t && typeof t === 'object') {
            newTrainers[index] = { ...t, NAME: value };
        } else {
            newTrainers[index] = { NAME: value };
        }
        setTrainers(newTrainers);
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isSaving} message={t('saving_changes')} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('trainers')}</Text>
                        <Text style={styles.subtitle}>{t('manage_gym_trainers')}</Text>
                    </View>

                    <View style={styles.content}>
                        <TouchableOpacity style={styles.addNewButton} onPress={addTrainer}>
                            <Text style={styles.addNewButtonText}>{t('add_trainer')}</Text>
                        </TouchableOpacity>

                        {trainers.map((trainer, index) => {
                            const item = typeof trainer === 'string' ? { NAME: trainer, IMAGE: '' } : trainer;
                            return (
                                <View key={index} style={styles.trainerCard}>
                                    <TouchableOpacity
                                        style={styles.avatarContainer}
                                        onPress={() => pickTrainerImage(index)}
                                        onLongPress={() => {
                                            // only confirm delete if image exists
                                            if (!item.IMAGE) return;
                                            Alert.alert(
                                                t('remove_image'),
                                                t('remove_image_confirm'),
                                                [
                                                    { text: t('cancel'), style: 'cancel' },
                                                    { text: t('remove_btn') || t('remove_image'), onPress: () => removeTrainerImage(index) },
                                                ]
                                            );
                                        }}
                                        delayLongPress={500}
                                        accessibilityLabel={t('remove_image')}
                                        accessibilityHint={t('long_press_to_remove')}
                                    >
                                        {uploadingIndex === index ? (
                                            <View style={styles.avatarPlaceholder}>
                                                <ActivityIndicator color={theme.colors.primary} />
                                            </View>
                                        ) : item.IMAGE ? (
                                            <Image source={{ uri: item.IMAGE }} style={styles.avatarImage} />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <MaterialIcons name="add-photo-alternate" size={28} color={theme.colors.primary} />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <TextInput
                                        style={styles.input}
                                        value={item.NAME}
                                        onChangeText={(value) => updateTrainer(index, value)}
                                        placeholder={t('enter_trainer_name')}
                                        placeholderTextColor={theme.colors.textLight}
                                    />

                                    {/* removeImageButton is now rendered on top of avatar inside avatarContainer */}

                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeTrainer(index)}
                                    >
                                        <Text style={styles.removeButtonText}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {trainers.length === 0 && (
                            <Text style={styles.emptyText}>{t('no_trainers_added')}</Text>
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
    trainerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.65),
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
        backgroundColor: Commons.hexToRgba(theme.colors.border, 0.08),
    },
    avatarImage: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.full,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.2),
    },
    avatarPlaceholderText: {
        color: theme.colors.primary,
        fontSize: 28,
        fontWeight: '600',
    },
    avatarHint: {
        fontSize: 9,
        color: theme.colors.textLight,
        marginTop: 2,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
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
    // removeImageButton is removed in favor of long-press + confirmation dialog on the avatar
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
