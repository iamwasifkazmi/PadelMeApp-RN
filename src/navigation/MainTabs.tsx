import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { DiscoverScreen, HomeScreen, MessagesScreen, ProfileScreen } from "../screens";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = 22;

function CenterCreateButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.centerBtnWrap}>
      <View style={styles.centerBtn}>
        <Ionicons name="add" size={30} color="#ffffff" />
      </View>
    </Pressable>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#8b98ac",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Ionicons name="search" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="CreateTab"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: "",
          tabBarLabel: () => <Text style={styles.hiddenLabel}>Create</Text>,
          tabBarIcon: () => null,
          tabBarButton: () => <CenterCreateButton onPress={() => navigation.navigate("CreateMatch" as never)} />,
        })}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesScreen}
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-ellipses" size={ICON_SIZE} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person" size={ICON_SIZE} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
    borderTopColor: "#e5e7eb",
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  centerBtnWrap: {
    top: -22,
    justifyContent: "center",
    alignItems: "center",
  },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.38,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  hiddenLabel: {
    display: "none",
  },
});
