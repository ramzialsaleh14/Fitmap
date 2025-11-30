import React from 'react';
import { ImageBackground, View, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

export default function ScreenBackground({ children, style, blurRadius = 0, overlayOpacity = 0 }) {
    return (
        <ImageBackground
            source={require('../../assets/gymbackground.jpg')}
            style={[styles.backgroundImage, style]}
            blurRadius={blurRadius}
            resizeMode="cover"
        >
            <View style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]} />
            {children}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)'
    },
});
