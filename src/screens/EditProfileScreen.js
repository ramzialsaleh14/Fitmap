import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    Platform,
    ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../utils/theme';
import ScreenBackground from '../components/ScreenBackground';
import * as Commons from '../utils/Commons';
import * as Constants from '../utils/Constants';
import * as ServerOperations from '../utils/ServerOperations';

export default function EditProfileScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [isPickerActive, setIsPickerActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        const userName = await Commons.getFromAS(Constants.USER_NAME);
        const userEmail = await Commons.getFromAS(Constants.USER_EMAIL);
        const userPhone = await Commons.getFromAS(Constants.USER_PHONE);
        const userImage = await Commons.getFromAS(Constants.USER_PROFILE_IMAGE);

        setName(userName || '');
        setEmail(userEmail || '');
        setPhone(userPhone || '');
        setProfileImage(userImage || null);
    };

    const pickImage = async () => {
        console.log('pickImage: Starting image selection, isPickerActive:', isPickerActive);

        // Prevent multiple simultaneous picker calls
        if (isPickerActive) {
            console.log('pickImage: Picker already active, ignoring call');
            return;
        }

        setIsPickerActive(true);

        try {
            // Additional wait for iOS
            if (Platform.OS === 'ios') {
                await new Promise(resolve => setTimeout(resolve, 300));
                console.log('pickImage: iOS wait completed');
            }

            console.log('pickImage: Requesting media library permissions');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to change your profile picture.');
                return;
            }

            console.log('pickImage: Launching image library');

            // Add timeout detection
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    console.warn('pickImage: Image picker timeout after 10 seconds');
                    resolve({ canceled: true, timeout: true });
                }, 10000);
            });

            const pickerPromise = ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: false,
                exif: false,
                allowsMultipleSelection: false,
            });

            console.log('pickImage: Waiting for image picker response...');
            const result = await Promise.race([pickerPromise, timeoutPromise]);

            if (result.timeout) {
                Alert.alert('Timeout', 'Image picker timed out. Please try again.');
                return;
            }

            console.log('pickImage: Image picker result:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Show uploading indicator
                setIsUploading(true);

                const asset = result.assets[0];
                console.log('pickImage: Processing asset:', asset);

                // Generate filename
                const originalName = asset.fileName || 'image.jpg';
                const dotIndex = originalName.lastIndexOf('.');
                const extension = dotIndex !== -1 ? originalName.substring(dotIndex) : '.jpg';
                const generatedName = Date.now() + extension;

                const file = {
                    type: 'image/*',
                    uri: asset.uri,
                    name: generatedName
                };

                console.log('pickImage: Uploading file:', file);
                const res = await ServerOperations.pickUploadHttpRequest(file, 1);
                console.log('pickImage: Upload result:', res);

                if (res && res.URL && res.URL !== '') {
                    const url = Constants.attachmentPath + res.URL;
                    setProfileImage(url);
                    //Alert.alert('Success', 'Profile photo uploaded successfully!');
                } else {
                    // Fallback to local URI if upload fails
                    Alert.alert('Upload Failed', 'Failed to upload image to server.');
                }
            } else {
                console.log('pickImage: Image selection was canceled or no assets');
            }
        } catch (error) {
            console.error('pickImage: Error:', error);
            Alert.alert('Error', `Failed to pick image: ${error.message}. Please try again.`);
        } finally {
            console.log('pickImage: Setting picker active to false');
            setIsUploading(false);
            setIsPickerActive(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        // Call server API to save profile changes
        const response = await ServerOperations.saveProfileChanges(
            email,
            name,
            phone,
            profileImage
        );

        if (response && response.res) {
            // Save to AsyncStorage on success
            await Commons.saveToAS(Constants.USER_NAME, name);
            await Commons.saveToAS(Constants.USER_PHONE, phone);

            if (profileImage) {
                await Commons.saveToAS(Constants.USER_PROFILE_IMAGE, profileImage);
            }

            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } else {
            Alert.alert('Error', response?.msg || 'Failed to update profile. Please try again.');
        }
    };

    const getInitials = () => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <ScreenBackground>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    {isUploading && (
                        <View style={styles.uploadingOverlay}>
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={styles.uploadingText}>Uploading photo...</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.imageSection}>
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{getInitials()}</Text>
                                </View>
                            )}
                            <View style={styles.cameraIconContainer}>
                                <Text style={styles.cameraIcon}>📷</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.changePhotoText}>Tap to change photo</Text>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your full name"
                            placeholderTextColor={theme.colors.textLight}
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.inputDisabled]}
                            value={email}
                            editable={false}
                            placeholder="Email address"
                            placeholderTextColor={theme.colors.textLight}
                        />
                        <Text style={styles.helperText}>Email cannot be changed</Text>

                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter your phone number"
                            placeholderTextColor={theme.colors.textLight}
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: theme.spacing.lg,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: theme.spacing.sm,
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: theme.colors.primary,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.colors.primary,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.card,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    cameraIcon: {
        fontSize: 20,
    },
    changePhotoText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    form: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
    },
    inputDisabled: {
        backgroundColor: theme.colors.border,
        color: theme.colors.textLight,
    },
    helperText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textLight,
        marginTop: theme.spacing.xs,
        fontStyle: 'italic',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        elevation: 2,
        shadowColor: theme.colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    saveButtonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: 'bold',
    },
    cancelButton: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: '600',
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    uploadingContainer: {
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        elevation: 5,
    },
    uploadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: '600',
    },
});
