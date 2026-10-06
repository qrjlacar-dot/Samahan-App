import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#D9679C"
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({
            color,
            size
          }) => <Ionicons
                  name="home"
                  size={size}
                  color={color}
                />
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({
            color,
            size
          }) => <Ionicons
                  name="heart"
                  size={size}
                  color={color}
                />
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({
            color,
            size
          }) => <Ionicons
                  name="notifications"
                  size={size}
                  color={color}
                />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({
            color,
            size
          }) => <Ionicons
                  name="person"
                  size={size}
                  color={color}
                />
        }}
      />
    </Tabs>
  );
}
