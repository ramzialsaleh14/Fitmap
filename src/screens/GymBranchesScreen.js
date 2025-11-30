import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Modal,
    Dimensions,
    Platform,
    Switch,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { theme } from '../utils/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import ScreenBackground from '../components/ScreenBackground';
import LoadingOverlay from '../components/LoadingOverlay';
import * as Commons from '../utils/Commons';
import * as ServerOperations from '../utils/ServerOperations';
import { useTranslation } from '../utils/Strings';

export default function GymBranchesScreen({ route, navigation }) {
    const { gymData, userEmail } = route.params;
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useTranslation();
    const [branches, setBranches] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [timePickerState, setTimePickerState] = useState({ visible: false, index: null, field: null, value: new Date() });
    const [mapPicker, setMapPicker] = useState({ visible: false, index: null, coord: null });
    const mapRef = useRef(null);
    const [mapLocating, setMapLocating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef(null);

    useEffect(() => {
        if (gymData && gymData.BRANCHES) {
            setBranches([...gymData.BRANCHES]);
        }
    }, [gymData]);

    // Render the DateTimePicker conditionally
    const renderTimePicker = () => {
        if (!timePickerState.visible || timePickerState.index === null) return null;

        return (
            <DateTimePickerModal
                isVisible={timePickerState.visible}
                mode="time"
                date={timePickerState.value || new Date()}
                onConfirm={(date) => onTimeSelected(date)}
                onCancel={() => setTimePickerState({ visible: false, index: null, field: null, value: new Date() })}
                is24Hour={false}
            />
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Ensure MIXED and WOMEN_SECTION are stored as 'Y' or 'N' (empty -> 'N')
            let sanitized = [];
            sanitized = branches.map(b => ({
                ...b,
                MIXED: b.MIXED === 'Y' ? 'Y' : 'N',
                WOMEN_SECTION: b.WOMEN_SECTION === 'Y' ? 'Y' : 'N',
            }));

            setIsSaving(false);
            console.log('Saving branches data Json', JSON.stringify(sanitized));
            //console.log('Saving branches data', sanitized);
            //return;
            // append a small test branch so saveGymData always receives at least one test entry

            const response = await ServerOperations.saveGymData(userEmail, 'BRANCHES', sanitized);
            if (response.res) {
                Alert.alert(t('success'), t('branches_updated'), [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert(t('error'), response.msg || t('failed_save_changes'));
            }
        } catch (error) {
            console.error('Error saving branches:', error);
            Alert.alert(t('error'), t('failed_save_changes'));
        } finally {
            setIsSaving(false);
        }
    };

    const addBranch = () => {
        const newBranch = {
            AREA: '',
            BRANCH_ID: `BR${branches.length + 1}`,
            LOCATION: '',
            MEDIA: '',
            MEN_FROM: '',
            MEN_TO: '',
            MIXED: 'N',
            WOMEN_FROM: '',
            WOMEN_SECTION: 'N',
            WOMEN_TO: '',
        };
        setBranches([...branches, newBranch]);
        setExpandedIndex(branches.length);
    };

    const removeBranch = (index) => {
        Alert.alert(t('remove_branch'), t('remove_branch_confirm'), [
            { text: t('cancel'), style: 'cancel' },
            {
                text: t('remove_btn'),
                style: 'destructive',
                onPress: () => {
                    const newBranches = branches.filter((_, i) => i !== index);
                    setBranches(newBranches);
                    if (expandedIndex === index) setExpandedIndex(null);
                }
            }
        ]);
    };

    const updateBranch = (index, field, value) => {
        const newBranches = [...branches];
        // Convert boolean toggles into Y/N where appropriate
        if (field === 'MIXED' || field === 'WOMEN_SECTION') {
            let val = value;
            if (typeof value === 'boolean') {
                val = value ? 'Y' : 'N';
            }
            // empty string or null should be treated as 'N'
            if (val === '' || val === null || val === undefined) val = 'N';
            newBranches[index] = { ...newBranches[index], [field]: val };
        } else {
            newBranches[index] = { ...newBranches[index], [field]: value };
        }
        setBranches(newBranches);
    };

    const openMapPicker = async (index) => {
        try {
            // Prefill marker from existing branch location if available
            const branch = branches[index] || {};
            let coord = null;
            if (branch.LOCATION) {
                const parts = String(branch.LOCATION).split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    const lat = Number(parts[0]);
                    const lon = Number(parts[1]);
                    if (!isNaN(lat) && !isNaN(lon)) coord = { latitude: lat, longitude: lon };
                }
            }

            // If branch doesn't have LOCATION, open map immediately without waiting on device location.
            // This avoids blocking the UI when adding a new branch - user can pick on the map.
            // We intentionally do NOT call Commons.getCurrentLocation() here.
            // The MapView `initialRegion` will fall back to a default coordinate when coord is null.
            if (!coord) coord = null;

            console.log('[GymBranchesScreen] Open map picker for branch', index, 'coord', coord);
            setMapPicker({ visible: true, index, coord });
        } catch (error) {
            console.error('openMapPicker error', error);
            Alert.alert(t('error'), t('failed_load_map') || 'Failed to open map');
        }
    };

    const handleMapConfirm = (index, coord) => {
        if (!coord) return;
        const lat = Number(coord.latitude).toFixed(6);
        const lon = Number(coord.longitude).toFixed(6);
        console.log('[GymBranchesScreen] Map confirm for branch', index, 'selected location', `${lat},${lon}`);
        updateBranch(index, 'LOCATION', `${lat},${lon}`);
        setMapPicker({ visible: false, index: null, coord: null });
    };

    // Nominatim search (OpenStreetMap) - no key required; used only for place lookup in modal
    const searchPlaces = async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'FitmapApp/1.0' } });
            const json = await res.json();
            setSearchResults(json || []);
        } catch (err) {
            console.warn('searchPlaces error', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const onSearchQueryChange = (q) => {
        setSearchQuery(q);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        // Debounce by 700ms
        searchTimer.current = setTimeout(() => searchPlaces(q), 700);
    };

    const pickSearchResult = (result) => {
        if (!result) return;
        const coord = { latitude: Number(result.lat), longitude: Number(result.lon) };
        setMapPicker(prev => ({ ...prev, coord }));
        setSearchResults([]);
        setSearchQuery(result.display_name || '');
    };

    const formatTime = (date) => {
        if (!date) return '';
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const hh = hours < 10 ? `0${hours}` : hours;
        const mm = minutes < 10 ? `0${minutes}` : minutes;
        // Use 24-hour format
        return `${hh}:${mm}`;
    };

    const openTimePicker = (index, field, existingVal) => {
        // existingVal may be a string like '06:00 AM' — convert to Date
        let dt = new Date();
        if (existingVal) {
            // Try to parse 24-hour format 'HH:MM'
            const match24 = existingVal.match(/^(\d{1,2}):(\d{2})$/);
            if (match24) {
                let h24 = parseInt(match24[1], 10);
                const m24 = parseInt(match24[2], 10);
                dt.setHours(h24);
                dt.setMinutes(m24);
                dt.setSeconds(0);
            } else {
                // parse format 'HH:MM AM/PM' for backward compatibility
                const match = existingVal.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                if (match) {
                    let h = parseInt(match[1], 10);
                    const m = parseInt(match[2], 10);
                    const ampm = match[3].toUpperCase();
                    if (ampm === 'PM' && h !== 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    dt.setHours(h);
                    dt.setMinutes(m);
                    dt.setSeconds(0);
                }
            }
        }
        // show picker
        console.log('Opening time picker', index, field, existingVal);
        setTimePickerState({ visible: true, index, field, value: dt });
    };

    const onTimeSelected = (selectedDate) => {
        const { index, field } = timePickerState;
        console.log('Time picker selected', selectedDate);

        setTimePickerState({ visible: false, index: null, field: null, value: new Date() });

        if (selectedDate) {
            const formatted = formatTime(selectedDate);
            updateBranch(index, field, formatted);
            console.log('Time selected for branch', index, field, formatted);
        }
    };

    return (
        <ScreenBackground>
            <View style={styles.container}>
                <LoadingOverlay visible={isSaving} message={t('saving_changes')} />

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('branches')}</Text>
                        <Text style={styles.subtitle}>{t('manage_locations')}</Text>
                    </View>

                    <View style={styles.content}>
                        <TouchableOpacity style={styles.addNewButton} onPress={addBranch}>
                            <Text style={styles.addNewButtonText}>{t('add_new_branch')}</Text>
                        </TouchableOpacity>

                        {branches.map((branch, index) => (
                            <View key={index} style={styles.branchCard}>
                                <TouchableOpacity
                                    style={styles.branchHeader}
                                    onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                >
                                    <Text style={styles.branchTitle}>
                                        {t('branch_number').replace('{number}', index + 1)} {branch.BRANCH_ID ? `(${branch.BRANCH_ID})` : ''}
                                    </Text>
                                    <View style={styles.headerActions}>
                                        <Text style={styles.expandIcon}>{expandedIndex === index ? '▼' : '▶'}</Text>
                                    </View>
                                </TouchableOpacity>

                                {expandedIndex === index && (
                                    <View style={styles.branchDetails}>
                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('branch_id')}</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={branch.BRANCH_ID || ''}
                                                onChangeText={(value) => updateBranch(index, 'BRANCH_ID', value)}
                                                placeholder={t('enter_branch_id')}
                                                placeholderTextColor={theme.colors.textLight}
                                            />
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('area') || 'Area'}</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={branch.AREA || ''}
                                                onChangeText={(value) => updateBranch(index, 'AREA', value)}
                                                placeholder={t('enter_area_name')}
                                                placeholderTextColor={theme.colors.textLight}
                                            />
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('location_latlong') || 'Location (Lat,Long)'}</Text>
                                            <View style={styles.locationRow}>
                                                <TextInput
                                                    style={[styles.input, styles.locationInput]}
                                                    value={branch.LOCATION || ''}
                                                    onChangeText={(value) => updateBranch(index, 'LOCATION', value)}
                                                    placeholder={t('enter_location_latlong')}
                                                    placeholderTextColor={theme.colors.textLight}
                                                />
                                                <TouchableOpacity style={styles.mapIconButton} onPress={() => openMapPicker(index)}>
                                                    <MaterialCommunityIcons name="map-marker" size={22} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('media_urls') || 'Media (Image URLs)'}</Text>
                                            <TextInput
                                                style={[styles.input, styles.multilineInput]}
                                                value={branch.MEDIA || ''}
                                                onChangeText={(value) => updateBranch(index, 'MEDIA', value)}
                                                placeholder={t('enter_media_urls')}
                                                placeholderTextColor={theme.colors.textLight}
                                                multiline
                                                numberOfLines={2}
                                            />
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('mens_section_from')}</Text>
                                            <TouchableOpacity onPress={() => openTimePicker(index, 'MEN_FROM', branch.MEN_FROM)} style={[styles.input, styles.timeInput]}>
                                                <Text style={{ color: branch.MEN_FROM ? theme.colors.text : theme.colors.textLight }}>
                                                    {branch.MEN_FROM ? branch.MEN_FROM : t('time_format')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('mens_section_to')}</Text>
                                            <TouchableOpacity onPress={() => openTimePicker(index, 'MEN_TO', branch.MEN_TO)} style={[styles.input, styles.timeInput]}>
                                                <Text style={{ color: branch.MEN_TO ? theme.colors.text : theme.colors.textLight }}>
                                                    {branch.MEN_TO ? branch.MEN_TO : t('time_format')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('mixed_section')}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                                                <Switch
                                                    value={branch.MIXED === 'Y'}
                                                    onValueChange={(val) => updateBranch(index, 'MIXED', val)}
                                                    trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                                    thumbColor={branch.MIXED === 'Y' ? theme.colors.primary : theme.colors.textLight}
                                                />
                                                <Text style={{ color: theme.colors.textLight }}>{branch.MIXED === 'Y' ? t('mixed') || 'Mixed' : t('not_mixed') || 'Not Mixed'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('womens_section_from')}</Text>
                                            <TouchableOpacity onPress={() => openTimePicker(index, 'WOMEN_FROM', branch.WOMEN_FROM)} style={[styles.input, styles.timeInput]}>
                                                <Text style={{ color: branch.WOMEN_FROM ? theme.colors.text : theme.colors.textLight }}>
                                                    {branch.WOMEN_FROM ? branch.WOMEN_FROM : t('time_format')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('womens_section_to')}</Text>
                                            <TouchableOpacity onPress={() => openTimePicker(index, 'WOMEN_TO', branch.WOMEN_TO)} style={[styles.input, styles.timeInput]}>
                                                <Text style={{ color: branch.WOMEN_TO ? theme.colors.text : theme.colors.textLight }}>
                                                    {branch.WOMEN_TO ? branch.WOMEN_TO : t('time_format')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.fieldContainer}>
                                            <Text style={styles.label}>{t('womens_available')}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                                                <Switch
                                                    value={branch.WOMEN_SECTION === 'Y'}
                                                    onValueChange={(val) => updateBranch(index, 'WOMEN_SECTION', val)}
                                                    trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                                                    thumbColor={branch.WOMEN_SECTION === 'Y' ? theme.colors.primary : theme.colors.textLight}
                                                />
                                                <Text style={{ color: theme.colors.textLight }}>{branch.WOMEN_SECTION === 'Y' ? t('available') || 'Available' : t('not_available') || 'Not available'}</Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeBranch(index)}
                                        >
                                            <Text style={styles.removeButtonText}>{t('remove_branch')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                            </View>
                        ))}
                        {/* Render the native time picker once at the end of the list */}
                        {renderTimePicker()}

                        {/* Map picker modal */}
                        <Modal
                            visible={mapPicker.visible}
                            animationType="slide"
                            transparent={true}
                            onRequestClose={() => setMapPicker({ visible: false, index: null, coord: null })}
                        >
                            <View style={styles.modalBackdrop}>
                                <View style={styles.modalCard}>
                                    <Text style={styles.modalTitle}>{t('choose_location') || 'Choose Location'}</Text>
                                    <View style={styles.searchBar}>
                                        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textLight} style={{ marginLeft: theme.spacing.sm }} />
                                        <TextInput
                                            value={searchQuery}
                                            onChangeText={onSearchQueryChange}
                                            placeholder={t('search_place') || 'Search place or address'}
                                            placeholderTextColor={theme.colors.textLight}
                                            style={styles.searchInput}
                                            underlineColorAndroid="transparent"
                                            returnKeyType="search"
                                        />
                                        {searchQuery ? (
                                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} style={styles.searchClear}>
                                                <MaterialCommunityIcons name="close" size={18} color={theme.colors.textLight} />
                                            </TouchableOpacity>
                                        ) : null}
                                        {searching ? <ActivityIndicator style={{ marginHorizontal: theme.spacing.sm }} color={theme.colors.primary} /> : null}
                                    </View>

                                    {/* Search results */}
                                    {searchResults.length > 0 && (
                                        <View style={styles.searchResults}>
                                            {searchResults.map((res, i) => {
                                                // present shortened primary/secondary labels similar to Google suggestions
                                                const parts = (res.display_name || '').split(',').map(p => p.trim()).filter(Boolean);
                                                const primary = parts.slice(0, 1).join(',');
                                                const secondary = parts.slice(1, 3).join(', ');
                                                return (
                                                    <TouchableOpacity key={i} style={styles.searchItem} onPress={() => pickSearchResult(res)}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                                                            <MaterialCommunityIcons name="map-marker-radius" size={18} color={theme.colors.primary} />
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.searchPrimary} numberOfLines={1}>{primary}</Text>
                                                                {secondary ? <Text style={styles.searchSecondary} numberOfLines={1}>{secondary}</Text> : null}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}

                                    <View style={{ position: 'relative' }}>
                                        <MapView
                                            ref={mapRef}
                                            style={styles.map}
                                            initialRegion={{
                                                // When no coord is provided (new branch), center the map on Amman, Jordan
                                                latitude: mapPicker.coord?.latitude || 31.9454,
                                                longitude: mapPicker.coord?.longitude || 35.9284,
                                                latitudeDelta: 0.01,
                                                longitudeDelta: 0.01,
                                            }}
                                            onPress={(e) => setMapPicker(prev => ({ ...prev, coord: e.nativeEvent.coordinate }))}
                                        >
                                            {mapPicker.coord && (
                                                <Marker
                                                    coordinate={mapPicker.coord}
                                                    draggable
                                                    onDragEnd={(e) => setMapPicker(prev => ({ ...prev, coord: e.nativeEvent.coordinate }))}
                                                />
                                            )}
                                        </MapView>

                                        {/* current location button + label */}
                                        <View style={styles.mapLocateContainer} accessible accessibilityRole="button" accessibilityLabel={t('use_current_location')}>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={styles.mapLocateButton}
                                                accessibilityRole="button"
                                                accessibilityHint={t('use_current_location_hint')}
                                                onPress={async () => {
                                                    try {
                                                        setMapLocating(true);
                                                        const loc = await Commons.getCurrentLocation();
                                                        setMapLocating(false);
                                                        if (loc && loc.success) {
                                                            const coord = { latitude: loc.latitude, longitude: loc.longitude };
                                                            setMapPicker(prev => ({ ...prev, coord }));
                                                            // animate map
                                                            if (mapRef.current && mapRef.current.animateToRegion) {
                                                                mapRef.current.animateToRegion({ latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
                                                            }
                                                        } else {
                                                            setMapLocating(false);
                                                            Alert.alert(t('error'), loc.error || t('location_permission_denied'));
                                                        }
                                                    } catch (e) {
                                                        setMapLocating(false);
                                                        console.warn('Failed to get current location in modal', e);
                                                        Alert.alert(t('error'), t('failed_get_location') || t('failed_load_map'));
                                                    }
                                                }}
                                            >
                                                {mapLocating ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <MaterialCommunityIcons name="crosshairs-gps" size={22} color={theme.colors.white} />
                                                )}
                                            </TouchableOpacity>

                                            <Text style={styles.mapLocateLabel}>{mapLocating ? t('getting_location') : t('use_current_location')}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setMapPicker({ visible: false, index: null, coord: null })}>
                                            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => handleMapConfirm(mapPicker.index, mapPicker.coord)}>
                                            <Text style={styles.saveButtonText}>{t('confirm') || 'Confirm'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    </View>

                    {branches.length === 0 && (
                        <Text style={styles.emptyText}>{t('no_branches')}</Text>
                    )}

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
            </View >
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
    branchCard: {
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.65),
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        elevation: 1,
    },
    branchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    branchTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    expandIcon: {
        fontSize: 16,
        color: theme.colors.primary,
    },
    branchDetails: {
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
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationInput: {
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    mapIconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.sm,
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.06),
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.2),
    },
    multilineInput: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    timeInput: {
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalCard: {
        width: '100%',
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.95),
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        padding: theme.spacing.md,
        maxHeight: '90%'
    },
    modalTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.06),
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.xs,
        paddingRight: theme.spacing.sm,
        paddingLeft: 6,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.08),
        marginBottom: theme.spacing.sm,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.2),
        backgroundColor: Commons.hexToRgba(theme.colors.background, 0.06),
        color: theme.colors.text,
    },
    searchClear: {
        padding: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    searchPrimary: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
        fontWeight: '700',
    },
    searchSecondary: {
        color: theme.colors.textLight,
        fontSize: theme.fontSize.sm,
    },
    searchResults: {
        maxHeight: 160,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.92),
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: Commons.hexToRgba(theme.colors.border, 0.12),
        paddingVertical: theme.spacing.xs,
    },
    searchItem: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    searchItemText: {
        color: theme.colors.text,
    },
    map: {
        width: '100%',
        height: Math.min(Dimensions.get('window').height * 0.55, 400),
        borderRadius: theme.borderRadius.sm,
        overflow: 'hidden',
        backgroundColor: theme.colors.border,
    },
    mapLocateContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    mapLocateButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
    },
    mapLocateLabel: {
        marginTop: theme.spacing.xs,
        backgroundColor: Commons.hexToRgba(theme.colors.card, 0.9),
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        fontSize: theme.fontSize.xs,
        color: theme.colors.text,
        fontWeight: '600',
        elevation: 3,
    },
    modalActions: {
        marginTop: theme.spacing.md,
        flexDirection: 'row',
        gap: theme.spacing.md,
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
