import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  RefreshControl,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import baseURL from "../../assets/common/baseurl";
import { getJwtToken } from "../../utils/sessionStorage";
import Toast from "react-native-toast-message";

const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS (matching other admin screens)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#FFF8F2",
  white:        "#FFFFFF",
  ink:          "#1A0F00",
  inkMid:       "#5C3A1E",
  primary:      "#F4821F",
  primaryDark:  "#C45C00",
  primaryDeep:  "#8B3A00",
  primaryLight: "#FEF0E3",
  primaryGlow:  "#FFB36B",
  amber:        "#FFAA00",
  muted:        "#B08060",
  border:       "#F0E4D4",
  surface:      "#FDF6EE",
  danger:       "#EF4444",
  dangerLight:  "#FEE2E2",
  green:        "#22C55E",
  greenLight:   "#DCFCE7",
};

const F = {
  display: Platform.select({ ios: "Georgia",  android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",   android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const FloatingOrb = ({ style, size, delay = 0, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3600, delay, easing: (t) => t, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3600, easing: (t) => t, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY: ty }] }, style]} />;
};

const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 460, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
};

const Promotions = (props) => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "archived"

  const fetchPromotions = async () => {
    setLoading(true);
    const jwt = await getJwtToken();
    try {
      const res = await axios.get(`${baseURL}promotions/all`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setPromotions(res.data);
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Error fetching promotions" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openDrawer = () => {
    if (typeof props.navigation?.openDrawer === "function") {
      props.navigation.openDrawer();
      return;
    }
    props.navigation?.getParent?.()?.openDrawer?.();
  };

  useFocusEffect(
    useCallback(() => {
      fetchPromotions();
    }, [])
  );

  const filteredPromotions = useMemo(() => {
    return promotions.filter(p => activeTab === "archived" ? p.isArchived : !p.isArchived);
  }, [promotions, activeTab]);

  const archivePromotion = async (id, currentArchived) => {
    const action = currentArchived ? "Restore" : "Archive";
    Alert.alert(`${action} Promotion`, `Are you sure you want to ${action.toLowerCase()} this promotion?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action,
        style: currentArchived ? "default" : "destructive",
        onPress: async () => {
          const jwt = await getJwtToken();
          try {
            await axios.patch(`${baseURL}promotions/${id}/archive`, { isArchived: !currentArchived }, {
              headers: { Authorization: `Bearer ${jwt}` },
            });
            Toast.show({ type: "success", text1: `Promotion ${action.toLowerCase()}d` });
            fetchPromotions();
          } catch (err) {
            console.error(err);
            Toast.show({ type: "error", text1: `Error ${action.toLowerCase()}ing promotion` });
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, item.isArchived && { opacity: 0.6 }]}
      onPress={() => props.navigation.navigate("Promotion Detail", { promotionId: item.id })}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="megaphone-outline" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            {item.isArchived && (
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedText}>ARCHIVED</Text>
              </View>
            )}
          </View>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discountPercentage}% OFF</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => props.navigation.navigate("Promotion Form", { item })}
          >
            <Ionicons name="pencil-outline" size={18} color="#F4821F" />
            <Text style={[styles.actionText, { color: "#F4821F" }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => archivePromotion(item.id, item.isArchived)}
          >
            <Ionicons name={item.isArchived ? "refresh-outline" : "archive-outline"} size={18} color="#6366f1" />
            <Text style={[styles.actionText, { color: "#6366f1" }]}>{item.isArchived ? "Restore" : "Archive"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ══ HERO HEADER ══ */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={styles.hero}
      >
        <FloatingOrb size={150} color="rgba(255,255,255,0.07)" style={{ top: -45, right: -35 }} delay={0} />
        <FloatingOrb size={75}  color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -20 }}  delay={800} />

        <FadeUp delay={0}>
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
              <Ionicons name="menu" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>PageTurner</Text>
              <Text style={styles.heroTitle}>Promotions</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => props.navigation.navigate("Promotion Form")}
            >
              <Ionicons name="add" size={18} color={C.primary} />
              <Text style={styles.addButtonText}>New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "active" && styles.activeTab]}
              onPress={() => setActiveTab("active")}
            >
              <Text style={[styles.tabText, activeTab === "active" && styles.activeTabText]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === "archived" && styles.activeTab]}
              onPress={() => setActiveTab("archived")}
            >
              <Text style={[styles.tabText, activeTab === "archived" && styles.activeTabText]}>Archived</Text>
            </TouchableOpacity>
          </View>
        </FadeUp>
      </LinearGradient>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#F4821F" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredPromotions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPromotions(); }} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No promotions found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: {
    paddingTop: Platform.OS === "ios" ? 54 : 38,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  heroNav: { flexDirection: "row", alignItems: "center", gap: 15, marginBottom: 20 },
  menuBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroEyebrow: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: "#FFF", fontFamily: F.display },
  
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 4,
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: "#FFF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  activeTabText: {
    color: C.primaryDark,
  },

  addButton: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: { color: C.primary, fontWeight: "900", fontSize: 13 },
  list: { padding: 16, paddingTop: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: { width: "100%", height: 150 },
  imagePlaceholder: { width: "100%", height: 150, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "bold", flex: 1, marginRight: 8 },
  discountBadge: { backgroundColor: "#F4821F", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  discountText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  archivedBadge: { 
    backgroundColor: "#6366f1", 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4, 
    alignSelf: "flex-start",
    marginTop: 4
  },
  archivedText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  description: { fontSize: 14, color: "#666", marginBottom: 16 },
  actions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12, gap: 20 },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionText: { marginLeft: 4, fontSize: 14, fontWeight: "600" },
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { marginTop: 16, fontSize: 16, color: "#999" },
});

export default Promotions;
