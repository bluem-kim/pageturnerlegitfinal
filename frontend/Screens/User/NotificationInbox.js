import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const C = {
  bg: "#FFFAF6",
  white: "#FFFFFF",
  ink: "#18120C",
  primary: "#F4821F",
  primaryDark: "#B85E0E",
  border: "#EDE5DC",
  muted: "#9A8A7A",
  blue: "#3B82F6",
  surface: "#F7F2EC",
};

const NotificationInbox = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem("notifications");
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const clearAll = async () => {
    try {
      await AsyncStorage.removeItem("notifications");
      setNotifications([]);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const handleNotificationPress = (notif) => {
    const { type, promotionId, orderId } = notif.data || {};
    
    if (type === "promotion" && promotionId) {
      navigation.navigate("Shop", {
        screen: "Promotion Detail",
        params: { promotionId }
      });
    } else if (type === "order") {
      navigation.navigate("Profile", {
        screen: "Order Detail",
        params: { orderId }
      });
    }
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.receivedAt).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return (
      <TouchableOpacity 
        style={s.card} 
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={s.iconBox}>
          <Ionicons 
            name={item.data?.type === "order" ? "cube" : "megaphone"} 
            size={20} 
            color={C.primary} 
          />
        </View>
        <View style={s.meta}>
          <View style={s.row}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.date}>{date}</Text>
          </View>
          <Text style={s.body} numberOfLines={2}>{item.body}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={s.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={60} color={C.border} />
          <Text style={s.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: C.ink, marginLeft: 16 },
  clearText: { fontSize: 13, fontWeight: "700", color: C.primary },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flex: 1, marginLeft: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  title: { fontSize: 14, fontWeight: "800", color: C.ink, flex: 1, marginRight: 8 },
  date: { fontSize: 11, color: C.muted, fontWeight: "600" },
  body: { fontSize: 13, color: C.muted, lineHeight: 18 },
  emptyText: { marginTop: 16, fontSize: 15, fontWeight: "700", color: C.muted },
});

export default NotificationInbox;
