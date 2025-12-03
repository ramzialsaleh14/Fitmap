import React from "react";
import {
    Alert,
    Platform,
    View,
    TextInput,
    TouchableOpacity,
    Dimensions,
    StyleSheet,
    FlatList,
    Image,
    NativeModules,
    ScrollView,
    Text,
    Button,
    Keyboard,
    CheckBox,
    Linking
} from "react-native";
import * as Constants from "./Constants";
//import { STRINGS } from "./Strings";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Audio handled in components via expo-audio
// export const getPath = (uri: string) => {
//   if (uri.startsWith("content://")) {
//     return RNFetchBlob.fs.stat(uri).then((info) => info?.path);
//   }
//   return uri;
// };

export const handleSearch = (text, list) => {
    if (text) {
        const newData = list.filter((item) => {
            const itemData = JSON.stringify(item).toLowerCase();
            const textData = text.toLowerCase();
            const itemDataId = item.ID;
            return itemData.indexOf(textData) > -1
        });
        return newData;
    } else {
        return list;
    }
};


export const saveToAS = async (key, value) => {
    try {
        await AsyncStorage.setItem(key, value);
        return true;
    } catch (error) {
        return false;
    }
};

export const getFromAS = async (key) => {
    try {
        const value = await AsyncStorage.getItem(key);
        return value;
    } catch (error) {
        return null;
    }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance;
};

export const getCurrentLocation = async (retries = 5) => {
    try {
        // First check if user has enabled location services in app settings
        const locationPref = await getFromAS(Constants.USE_LOCATION);
        if (locationPref === 'false') {
            return { success: false, error: 'Location services disabled in app settings' };
        }

        const Location = require('expo-location');

        // Check if device location services are enabled
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
            return { success: false, error: 'Location services are disabled on device' };
        }

        // Request permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return { success: false, error: 'Location permission not granted' };
        }

        // Create a timeout promise (5 seconds)
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        // Race between getting location and timeout
        const location = await Promise.race([
            Location.getCurrentPositionAsync({
                enableHighAccuracy: true,
                accuracy: Location.Accuracy.Balanced,
            }),
            timeout,
        ]);

        if (location && location.coords) {
            const { latitude, longitude, accuracy } = location.coords;
            console.log('Current position:', `${latitude},${longitude}`, 'accuracy(m):', accuracy);

            return {
                success: true,
                latitude: latitude,
                longitude: longitude,
                accuracy: accuracy,
            };
        } else {
            throw new Error('Invalid position data');
        }
    } catch (error) {
        // Retry logic for timeout errors
        if (error.message === 'Timeout' && retries > 0) {
            console.log(`Timeout occurred, retrying getCurrentLocation (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return await getCurrentLocation(retries - 1);
        }

        // Log and throw error for final failure
        console.error('Error getting location:', error);

        if (error.message.includes('permission')) {
            return { success: false, error: 'Location permission not granted' };
        } else if (error.message.includes('Timeout') || error.message === 'Timeout') {
            return { success: false, error: 'Location request timed out' };
        } else {
            return { success: false, error: 'Location unavailable' };
        }
    }
};

export const multiSaveToAS = async (pairs) => {
    try {
        await AsyncStorage.multiSet(pairs);
    } catch (error) {
        console.log(error);
    }
};

export const removeFromAS = async (key) => {
    try {
        console.log(`Attempting to remove from AsyncStorage - Key: ${key}`);
        await AsyncStorage.removeItem(key);
        console.log(`Successfully removed from AsyncStorage - Key: ${key}`);
        return true;
    } catch (error) {
        console.error(`Error removing from AsyncStorage - Key: ${key}`, error);
        return false;
    }
};
export const getTintColor = () =>
    Platform.OS === "android" ? "white" : "black";
export const language = async () => {
    const language = await getFromAS(Constants.language);
    let { locale } = await Localization.getLocalizationAsync();

    if (!locale.startsWith("ar") && !locale.startsWith("en")) {
        locale = "en";
    }
    locale = language == null ? locale : language;
    return locale;
};

// Convert hex color to RGB object or rgba string.
export const hexToRgb = (hex) => {
    if (!hex) return null;
    let sanitized = hex.replace('#', '');
    if (sanitized.length === 3) {
        sanitized = sanitized.split('').map(c => c + c).join('');
    }
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
};

export const hexToRgba = (hex, alpha = 1) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(0,0,0,${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

// Return a language-appropriate label for a service object (or string)
export const getServiceLabel = (service, locale = 'ar') => {
    if (!service && service !== 0) return '';
    if (typeof service === 'string') return service;
    const isEn = locale && String(locale).toLowerCase().startsWith('en');

    if (isEn) {
        return service.DESC_EN || '';

    }
    return service.DESC_AR || '';
};

export const okAlert = (title, msg, cancelable = true, fnToPerform = null) => {
    Alert.alert(
        title,
        msg,
        [
            {
                text: "ok",
                style: "cancel",
                onPress: fnToPerform,
            },
        ],
        { cancelable }
    );
};

export const okMsgAlert = (msg, cancelable = true, fnToPerform = null) => {
    okAlert(
        Platform.OS === "android" ? "" : msg,
        Platform.OS === "android" ? msg : "",
        cancelable,
        fnToPerform
    );
};

// Open an attachment URI. If it's an audio file (by extension or mime-like suffix), play it in-app using expo-audio.
export const openAttachment = async (uri) => {
    try {
        if (!uri) return;

        console.log('Commons.openAttachment called with URI:', uri);

        // Check if the URI ends with audio file extensions
        const isM4a = uri.toLowerCase().endsWith('.m4a');
        const is3gp = uri.toLowerCase().endsWith('.3gp');
        const isAac = uri.toLowerCase().endsWith('.aac');
        const isMp3 = uri.toLowerCase().endsWith('.mp3');
        const isWav = uri.toLowerCase().endsWith('.wav');

        if (isM4a || is3gp || isAac || isMp3 || isWav) {
            let fileExtension;
            if (is3gp) fileExtension = '3gp';
            else if (isAac) fileExtension = 'aac';
            else if (isMp3) fileExtension = 'mp3';
            else if (isWav) fileExtension = 'wav';
            else fileExtension = 'm4a';

            console.log(`Attempting to play ${fileExtension} file via Commons.openAttachment:`, uri);

            try {
                // Set audio mode for playback
                try {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                        shouldDuckAndroid: true,
                        playThroughEarpieceAndroid: false,
                    });
                } catch (audioModeError) {
                    console.warn('Failed to set audio mode for playback:', audioModeError);
                }

                // Check if file exists (for local files)
                if (uri.startsWith('file://')) {
                    try {
                        const fileObj = new FileSystem.File(uri);
                        const exists = fileObj.exists;
                        const size = fileObj.size;
                        console.log('Audio file info:', { exists, size });
                        if (!exists) {
                            const title = await translate('file_error');
                            const msg = await translate('audio_file_not_found');
                            Alert.alert(title, msg);
                            return;
                        }
                        if (size === 0) {
                            const title = await translate('file_error');
                            const msg = await translate('audio_file_empty');
                            Alert.alert(title, msg);
                            return;
                        }
                    } catch (fileCheckError) {
                        console.warn('File check failed:', fileCheckError);
                    }
                }

                // Use expo-av for audio playback
                console.log('Playing audio with expo-av...');

                // First load the audio without playing
                const { sound } = await Audio.Sound.createAsync(
                    { uri: uri },
                    {
                        shouldPlay: false,  // Load first, then play
                        isLooping: false,
                        isMuted: false,
                        volume: 1.0,
                        rate: 1.0,
                        shouldCorrectPitch: true,
                    }
                );

                // Get the audio status to check if it loaded properly
                const status = await sound.getStatusAsync();
                console.log('Audio loaded status:', {
                    isLoaded: status.isLoaded,
                    durationMillis: status.durationMillis,
                    uri: uri
                });

                if (!status.isLoaded) {
                    const title = await translate('playback_error');
                    const msg = await translate('failed_to_load_audio');
                    Alert.alert(title, msg);
                    await sound.unloadAsync();
                    return;
                }
                if (status.durationMillis === 0) {
                    const title = await translate('playback_error');
                    const msg = await translate('audio_file_corrupted');
                    Alert.alert(title, msg);
                    await sound.unloadAsync();
                    return;
                }

                console.log(`Successfully loaded ${fileExtension} with expo-av (duration: ${status.durationMillis}ms)`);

                // Now start playing
                await sound.playAsync();

                // Set up playback status update listener
                sound.setOnPlaybackStatusUpdate((playbackStatus) => {
                    console.log('Playback status:', {
                        isLoaded: playbackStatus.isLoaded,
                        isPlaying: playbackStatus.isPlaying,
                        positionMillis: playbackStatus.positionMillis,
                        durationMillis: playbackStatus.durationMillis,
                        didJustFinish: playbackStatus.didJustFinish,
                        error: playbackStatus.error
                    });

                    if (playbackStatus.didJustFinish) {
                        console.log('Audio playback finished normally');
                        // Clean up the sound
                        try {
                            sound.unloadAsync();
                        } catch (e) {
                            console.warn('Sound cleanup warning:', e);
                        }
                    }

                    if (playbackStatus.error) {
                        console.error('Playback error in status:', playbackStatus.error);
                        try {
                            sound.unloadAsync();
                        } catch (e) {
                            console.warn('Sound cleanup warning:', e);
                        }
                    }
                });

                return;
            } catch (audioError) {
                console.warn(`expo-av failed for ${fileExtension}:`, audioError);
                const title = await translate('playback_error');
                const msg = await translate('failed_to_play_audio', { error: audioError.message || audioError });
                Alert.alert(title, msg);
                return;
            }
        }

        // Non-audio or no special handling, just try to open the URL
        console.log('Opening non-audio file externally:', uri);
        const supported = await Linking.canOpenURL(uri);
        if (supported) {
            Linking.openURL(uri);
        } else {
            const title = await translate('cannot_open_file');
            const msg = await translate('no_application_to_open_file');
            Alert.alert(title, msg);
        }
    } catch (error) {
        console.error('openAttachment error', error);
        const title = await translate('error');
        const msg = await translate('failed_to_open_attachment', { error: error.message || error });
        Alert.alert(title, msg);
    }
};

// helper to load translations dynamically (avoids circular import)
const translate = async (key, params = null) => {
    try {
        const { STRINGS } = await import('./Strings');
        let lang = (await getFromAS(Constants.language)) || null;
        if (!lang) {
            try {
                const Localization = await import('expo-localization');
                const loc = await Localization.getLocalizationAsync?.();
                lang = loc && loc.locale ? (loc.locale + '').substring(0, 2) : 'en';
            } catch (e) {
                lang = 'en';
            }
        }
        lang = lang ? lang.substring(0, 2) : 'en';
        let value = (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS['en'] && STRINGS['en'][key]) || key;
        if (params && typeof params === 'object') {
            Object.keys(params).forEach((k) => {
                value = value.replace(`{${k}}`, params[k]);
            });
        }
        return value;
    } catch (e) {
        return key;
    }
};

export const confirmAlert = (title, msg, yesFn) => {
    Alert.alert(title, msg, [
        {
            text: "cancel",
            style: "cancel",
        },
        {
            text: "yes",
            onPress: yesFn,
        },
    ]);
};

export const confirmLanguageAlert = (title, msg, yesFn) => {
    Alert.alert(title, msg, [
        {
            text: "cancel",
            style: "cancel",
        },
        {
            text: "yes",
            onPress: yesFn,
        },
    ]);
};


export const isIphoneX = () => {
    const dimen = Dimensions.get("window");
    return (
        Platform.OS === "ios" &&
        !Platform.isPad &&
        !Platform.isTVOS &&
        (dimen.height === 812 ||
            dimen.width === 812 ||
            dimen.height === 896 ||
            dimen.width === 896)
    );
};

//export const isArabic = () => STRINGS.curLanguage.startsWith("ar");
