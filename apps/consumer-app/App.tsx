import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, TouchableOpacity } from 'react-native';

import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import ExploreAreaScreen from './screens/ExploreAreaScreen';
import EventsScreen from './screens/EventsScreen';
import ProfileScreen from './screens/ProfileScreen';
import NewsScreen from './screens/NewsScreen';
import SocialScreen from './screens/SocialScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => {
          // Custom tab bar to ensure only 5 visible tabs
          const { state, descriptors, navigation } = props;
          const visibleRoutes = state.routes.filter(route =>
            route.name !== 'News' && route.name !== 'ExploreArea' && route.name !== 'Discover'
          );

          return (
            <View style={{
              flexDirection: 'row',
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              paddingBottom: insets.bottom + 8,
              paddingTop: 8,
            }}>
              {visibleRoutes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                };

                const label = typeof options.tabBarLabel === 'function'
                  ? route.name
                  : (options.tabBarLabel || route.name);

                return (
                  <TouchableOpacity
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    onPress={onPress}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {options.tabBarIcon && (
                      <View style={{ marginBottom: 4 }}>
                        {options.tabBarIcon({ focused: isFocused, color: isFocused ? colors.primary : colors.textSecondary, size: 26 })}
                      </View>
                    )}
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: isFocused ? colors.primary : colors.textSecondary,
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 26, fontFamily: '' }}>🏠</Text>,
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen
          name="Explore"
          component={ExploreScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 26, fontFamily: '' }}>🔍</Text>,
            tabBarLabel: 'Explore',
          }}
        />
        <Tab.Screen
          name="Events"
          component={EventsScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 26, fontFamily: '' }}>📅</Text>,
            tabBarLabel: 'Events',
          }}
        />
        <Tab.Screen
          name="Social"
          component={SocialScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 26, fontFamily: '' }}>💬</Text>,
            tabBarLabel: 'Social',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 26, fontFamily: '' }}>👤</Text>,
            tabBarLabel: 'Profile',
          }}
        />
        <Tab.Screen
          name="News"
          component={NewsScreen}
          options={{
            tabBarButton: () => null,
          }}
        />
        <Tab.Screen
          name="ExploreArea"
          component={ExploreAreaScreen}
          options={{
            tabBarButton: () => null,
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            tabBarButton: () => null,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
