import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MainScreen from '../screens/MainScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import MenuScreen from '../screens/MenuScreen';
import UserInfoScreen from '../screens/UserInfoScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import GymMainScreen from '../screens/GymMainScreen';
import GymGeneralInfoScreen from '../screens/GymGeneralInfoScreen';
import GymServicesScreen from '../screens/GymServicesScreen';
import GymBranchesScreen from '../screens/GymBranchesScreen';
import GymSubscriptionsScreen from '../screens/GymSubscriptionsScreen';
import GymTrainersScreen from '../screens/GymTrainersScreen';
import GymPromosScreen from '../screens/GymPromosScreen';
import GymDetailsScreen from '../screens/GymDetailsScreen';
import GymMembersScreen from '../screens/GymMembersScreen';
import MySubscriptionsScreen from '../screens/MySubscriptionsScreen';
import SearchScreen from '../screens/SearchScreen';
import { theme } from '../utils/theme';
import * as Commons from '../utils/Commons';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: Commons.hexToRgba(theme.colors.primary, 0.85),
                    },
                    headerTintColor: theme.colors.text,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                <Stack.Screen
                    name="Main"
                    component={MainScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ title: 'Login' }}
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{ title: 'Register' }}
                />
                <Stack.Screen
                    name="CategoryDetail"
                    component={CategoryDetailScreen}
                    options={({ route }) => ({ title: `${route.params.category} Gyms` })}
                />
                <Stack.Screen
                    name="Menu"
                    component={MenuScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="UserInfo"
                    component={UserInfoScreen}
                    options={{ title: 'User Info' }}
                />
                <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={{ title: 'Settings' }}
                />
                <Stack.Screen
                    name="EditProfile"
                    component={EditProfileScreen}
                    options={{ title: 'Edit Profile' }}
                />
                <Stack.Screen
                    name="GymMain"
                    component={GymMainScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="GymGeneralInfo"
                    component={GymGeneralInfoScreen}
                    options={{ title: 'General Information' }}
                />
                <Stack.Screen
                    name="GymServices"
                    component={GymServicesScreen}
                    options={{ title: 'Services' }}
                />
                <Stack.Screen
                    name="GymBranches"
                    component={GymBranchesScreen}
                    options={{ title: 'Branches' }}
                />
                <Stack.Screen
                    name="GymSubscriptions"
                    component={GymSubscriptionsScreen}
                    options={{ title: 'Subscriptions' }}
                />
                <Stack.Screen
                    name="GymTrainers"
                    component={GymTrainersScreen}
                    options={{ title: 'Trainers' }}
                />
                <Stack.Screen
                    name="GymPromos"
                    component={GymPromosScreen}
                    options={{ title: 'Promos' }}
                />
                <Stack.Screen
                    name="GymMembers"
                    component={GymMembersScreen}
                    options={{ title: 'Members' }}
                />
                <Stack.Screen
                    name="MySubscriptions"
                    component={MySubscriptionsScreen}
                    options={{ title: 'My Subscriptions' }}
                />
                <Stack.Screen
                    name="GymDetails"
                    component={GymDetailsScreen}
                    options={{ title: 'Gym Details' }}
                />
                <Stack.Screen
                    name="Search"
                    component={SearchScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
