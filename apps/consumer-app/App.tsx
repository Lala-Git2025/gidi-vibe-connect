import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import ExploreAreaScreen from './screens/ExploreAreaScreen';
import EventsScreen from './screens/EventsScreen';
import ProfileScreen from './screens/ProfileScreen';
import NewsScreen from './screens/NewsScreen';
import SocialScreen from './screens/SocialScreen';
import DiscoverScreen from './screens/DiscoverScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider, useTheme, polished } from './contexts/ThemeContext';
import { CreatePostModalProvider } from './contexts/CreatePostModalContext';
import { StoryCreatorProvider } from './contexts/StoryCreatorContext';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => {
          // Polished V2 tab bar: floating capsule, gold-filled active pill,
          // glass blur emulated by darker translucent fill. 5 visible tabs;
          // hidden routes (News, ExploreArea, Discover) are filtered out.
          const { state, descriptors, navigation } = props;
          const visibleRoutes = state.routes.filter(route =>
            route.name !== 'News' && route.name !== 'ExploreArea' && route.name !== 'Discover'
          );

          return (
            <View style={[tabStyles.wrap, { paddingBottom: insets.bottom + 12 }]}>
              <View style={tabStyles.capsule}>
                {visibleRoutes.map((route) => {
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

                  const activeColor = '#18181B';
                  const inactiveColor = colors.textSecondary;

                  return (
                    <TouchableOpacity
                      key={route.key}
                      accessibilityRole="button"
                      accessibilityState={isFocused ? { selected: true } : {}}
                      onPress={onPress}
                      style={tabStyles.tab}
                      activeOpacity={0.8}
                    >
                      {isFocused && (
                        <LinearGradient
                          colors={[polished.goldHi, polished.goldDeep]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={tabStyles.activePill}
                        />
                      )}
                      {options.tabBarIcon && (
                        <View style={tabStyles.tabIcon}>
                          {options.tabBarIcon({
                            focused: isFocused,
                            color: isFocused ? activeColor : inactiveColor,
                            size: 22,
                          })}
                        </View>
                      )}
                      <Text style={[
                        tabStyles.tabLabel,
                        { color: isFocused ? activeColor : inactiveColor },
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen
          name="Explore"
          component={ExploreScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
            tabBarLabel: 'Explore',
          }}
        />
        <Tab.Screen
          name="Events"
          component={EventsScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
            tabBarLabel: 'Events',
          }}
        />
        <Tab.Screen
          name="Social"
          component={SocialScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble" size={size} color={color} />,
            tabBarLabel: 'Social',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
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

// Polished tabBar styles — kept outside the component so they don't recreate
// on every render. Capsule sits floating with backdrop blur emulated by a
// dark translucent fill + gold-tinted border.
const tabStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(20,20,24,0.95)',
    borderColor: 'rgba(234,179,8,0.18)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 12,
    right: 12,
    borderRadius: 16,
    shadowColor: '#EAB308',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <CreatePostModalProvider>
            <StoryCreatorProvider>
              <AppNavigator />
            </StoryCreatorProvider>
          </CreatePostModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
