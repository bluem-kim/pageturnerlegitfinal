import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";

import baseURL from "../../assets/common/baseurl";
import { buildListPdfHtml, exportPdfFromHtml } from "../../utils/pdfExport";

const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
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
  blue:         "#3B82F6",
  blueLight:    "#DBEAFE",
  purple:       "#A855F7",
  purpleLight:  "#F3E8FF",
};

const F = {
  display: Platform.select({ ios: "Georgia",  android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",   android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING ORB
// ─────────────────────────────────────────────────────────────────────────────
const FloatingOrb = ({ style, size, delay = 0, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3600, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY: ty }] }, style]} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// FADE-UP
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 460, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR INITIALS
// ─────────────────────────────────────────────────────────────────────────────
const Avatar = ({ name, isAdmin, avatar }) => {
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
  const colors = isAdmin
    ? [C.primaryGlow, C.primary]
    : [C.blue + "CC", C.blue];
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={av.ring}>
      {!!avatar ? (
        <Image source={{ uri: avatar }} style={av.img} resizeMode="cover" />
      ) : (
        <Text style={av.initials}>{initials || "?"}</Text>
      )}
    </LinearGradient>
  );
};
const av = StyleSheet.create({
  ring:     { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  img:      { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white },
  initials: { fontSize: 16, fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────────────────────────────────────
// USER CARD
// ─────────────────────────────────────────────────────────────────────────────
const UserCard = ({ item, onToggleRole, onToggleSelect, selected, index }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 360, delay: index * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay: index * 45, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const isAdmin    = Boolean(item?.isAdmin);
  const isActive   = Boolean(item?.isActive);
  const isDeactive = !isActive;

  return (
    <Animated.View style={[uc.wrap, { opacity: op, transform: [{ scale }] }, isDeactive && uc.wrapMuted]}>
      {/* Left accent */}
      <View style={[uc.accent, { backgroundColor: isDeactive ? C.border : isAdmin ? C.primary : C.blue }]} />

      <View style={uc.body}>
        <View style={uc.topRow}>
          <Avatar name={item?.name} isAdmin={isAdmin} avatar={item?.avatar} />
          <View style={{ flex: 1 }}>
            <View style={uc.nameRow}>
              <Text style={[uc.name, isDeactive && { color: C.muted }]} numberOfLines={1}>
                {item.name || "Unnamed"}
              </Text>
              {isAdmin && (
                <View style={uc.adminBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={C.primary} />
                  <Text style={uc.adminBadgeTxt}>Admin</Text>
                </View>
              )}
            </View>
            <Text style={uc.email} numberOfLines={1}>{item.email || "No email"}</Text>
          </View>
          
          <TouchableOpacity style={[uc.selectBtn, selected && uc.selectBtnOn]} onPress={onToggleSelect} activeOpacity={0.8}>
            <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? C.primary : C.muted} />
          </TouchableOpacity>
        </View>

        {/* Meta chips */}
        <View style={uc.chipRow}>
          <View style={[uc.chip, { backgroundColor: isAdmin ? C.primaryLight : C.blueLight }]}>
            <Ionicons name={isAdmin ? "shield-outline" : "person-outline"} size={11} color={isAdmin ? C.primary : C.blue} />
            <Text style={[uc.chipTxt, { color: isAdmin ? C.primary : C.blue }]}>{isAdmin ? "Administrator" : "Standard User"}</Text>
          </View>
          <View style={[uc.chip, { backgroundColor: isActive ? C.greenLight : C.dangerLight }]}>
            <View style={[uc.chipDot, { backgroundColor: isActive ? C.green : C.danger }]} />
            <Text style={[uc.chipTxt, { color: isActive ? C.green : C.danger }]}>{isActive ? "Active" : "Deactivated"}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={uc.actionRow}>
          <TouchableOpacity
            style={[uc.roleBtn, isAdmin && uc.roleBtnAdmin]}
            onPress={onToggleRole}
            activeOpacity={0.8}
          >
            <Ionicons name={isAdmin ? "person-outline" : "shield-outline"} size={13} color={isAdmin ? C.primary : C.blue} />
            <Text style={[uc.roleBtnTxt, isAdmin && { color: C.primary }]}>
              {isAdmin ? "Set as User" : "Set as Admin"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const uc = StyleSheet.create({
  wrap:          { flexDirection: "row", backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  wrapMuted:     { opacity: 0.72, backgroundColor: C.surface },
  accent:        { width: 4, flexShrink: 0 },
  body:          { flex: 1, padding: 14, gap: 10 },
  topRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
  nameRow:       { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  name:          { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display },
  email:         { fontSize: 12, color: C.muted, fontWeight: "500", marginTop: 2 },
  adminBadge:    { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  adminBadgeTxt: { fontSize: 10, fontWeight: "800", color: C.primary },
  selectBtn:     { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  selectBtnOn:   { backgroundColor: C.primaryLight, borderColor: C.primary },
  chipRow:       { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  chip:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  chipDot:       { width: 6, height: 6, borderRadius: 3 },
  chipTxt:       { fontSize: 11.5, fontWeight: "700" },
  actionRow:     { flexDirection: "row", gap: 8 },
  roleBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.blueLight, borderWidth: 1.5, borderColor: C.blue, borderRadius: 12, paddingVertical: 9 },
  roleBtnAdmin:  { backgroundColor: C.primaryLight, borderColor: C.primary },
  roleBtnTxt:    { fontSize: 12, fontWeight: "800", color: C.blue },
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Users = ({ navigation }) => {
  const [users,         setUsers]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [activeTab,     setActiveTab]     = useState("active");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState([]);

  // Animated search border
  const searchAnim = useRef(new Animated.Value(0)).current;
  const onSearchFocus = () => { setSearchFocused(true);  Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); };
  const onSearchBlur  = () => { setSearchFocused(false); Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); };
  const searchBorder  = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  const searchBg      = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  // ── Backend (all unchanged) ──
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("jwt");
      const response = await axios.get(`${baseURL}users`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(response.data || []);
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to load users", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadUsers(); return undefined; }, [loadUsers]));

  const updateUserInList = (updatedUser) => {
    setUsers((prev) => (prev || []).map((item) => {
      const currentId = item.id || item._id;
      const updatedId = updatedUser.id || updatedUser._id;
      if (String(currentId) !== String(updatedId)) return item;
      return { ...item, ...updatedUser };
    }));
  };

  const toggleRole = async (user) => {
    try {
      const token = await AsyncStorage.getItem("jwt");
      const nextRole = !Boolean(user.isAdmin);
      const response = await axios.put(`${baseURL}users/${user.id || user._id}/role`, { isAdmin: nextRole }, { headers: { Authorization: `Bearer ${token}` } });
      updateUserInList(response.data);
      Toast.show({ type: "success", text1: `${response.data.name} is now ${response.data.isAdmin ? "Admin" : "User"}`, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Role update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const toggleStatus = async (user) => {
    try {
      const token = await AsyncStorage.getItem("jwt");
      const nextStatus = !Boolean(user.isActive);
      const response = await axios.put(`${baseURL}users/${user.id || user._id}/status`, { isActive: nextStatus }, { headers: { Authorization: `Bearer ${token}` } });
      updateUserInList(response.data);
      Toast.show({ type: "success", text1: `${response.data.name} is now ${response.data.isActive ? "Active" : "Deactivated"}`, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Status update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const bulkUpdateStatusSelected = async (isActive) => {
    const targets = filteredUsers.filter((item) => selectedIds.includes(String(item.id || item._id)) && Boolean(item?.isActive) !== Boolean(isActive));
    if (!targets.length) { Toast.show({ type: "info", text1: "Select users first", topOffset: 60 }); return; }
    try {
      const token = await AsyncStorage.getItem("jwt");
      let success = 0;
      for (const user of targets) {
        try {
          const response = await axios.put(`${baseURL}users/${user.id || user._id}/status`, { isActive }, { headers: { Authorization: `Bearer ${token}` } });
          updateUserInList(response.data);
          success += 1;
        } catch {}
      }
      Toast.show({ type: "success", text1: isActive ? "Selected users activated" : "Selected users deactivated", text2: `${success} users updated`, topOffset: 60 });
      setSelectedIds([]);
    } catch (error) {
      Toast.show({ type: "error", text1: "Bulk update failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadUsers(); setRefreshing(false); };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return (users || []).filter((item) => {
        const archived = !Boolean(item?.isActive);
        return activeTab === "archived" ? archived : !archived;
      });
    }

    const matches = (users || []).filter((item) => {
      const archived = !Boolean(item?.isActive);
      const matchesTab = activeTab === "archived" ? archived : !archived;
      if (!matchesTab) return false;

      return (
        String(item?.name || "").toLowerCase().includes(q) ||
        String(item?.email || "").toLowerCase().includes(q) ||
        (item?.isAdmin ? "admin" : "user").includes(q) ||
        (item?.isActive ? "active" : "deactivated").includes(q)
      );
    });

    // Sort: items that START with the search query appear at the top
    return matches.sort((a, b) => {
      const aName = String(a?.name || "").toLowerCase();
      const bName = String(b?.name || "").toLowerCase();
      const aEmail = String(a?.email || "").toLowerCase();
      const bEmail = String(b?.email || "").toLowerCase();

      const aStarts = aName.startsWith(q) || aEmail.startsWith(q);
      const bStarts = bName.startsWith(q) || bEmail.startsWith(q);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [users, activeTab, searchQuery]);

  const visibleIds = useMemo(() => filteredUsers.map((item) => String(item.id || item._id)), [filteredUsers]);
  const selectedVisibleCount = useMemo(() => selectedIds.filter((id) => visibleIds.includes(id)).length, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const exportUserListPdf = async () => {
    try {
      const rows = (users || []).map((item, index) => [index + 1, item?.name || "Unnamed", item?.email || "No email", item?.isAdmin ? "Admin" : "User", item?.isActive ? "Active" : "Deactivated"]);
      const html = buildListPdfHtml({ title: "PageTurner User Records", summaryLines: [{ label: "Total records:", value: String(rows.length) }], headers: ["#", "Name", "Email", "Role", "Status"], rows });
      const result = await exportPdfFromHtml(html, { fileName: "PageTurnerUserRecords", dialogTitle: "Export user records" });
      Toast.show({ type: "success", text1: "User records exported", text2: result.shared ? "PDF ready to share" : result.uri, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Export failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const activeCount   = (users || []).filter((i) =>  i?.isActive).length;
  const deactiveCount = (users || []).filter((i) => !i?.isActive).length;
  const adminCount    = (users || []).filter((i) =>  i?.isAdmin).length;

  if (loading && !refreshing) {
    return (
      <View style={s.loadScreen}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadTxt}>Loading users…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>

      {/* ══ HERO HEADER ══ */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={s.hero}
      >
        <FloatingOrb size={160} color="rgba(255,255,255,0.07)" style={{ top: -50, right: -40 }} delay={0} />
        <FloatingOrb size={80}  color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -25 }}  delay={900} />
        <FloatingOrb size={44}  color="rgba(255,200,80,0.18)"  style={{ top: 44, left: SW * 0.48 }} delay={1400} />

        <FadeUp delay={0}>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
              <Ionicons name="menu" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>PageTurner</Text>
              <Text style={s.heroTitle}>User Management</Text>
            </View>
            <TouchableOpacity style={s.exportBtn} onPress={exportUserListPdf} activeOpacity={0.85}>
              <Ionicons name="document-text-outline" size={14} color={C.primary} />
              <Text style={s.exportBtnTxt}>Export</Text>
            </TouchableOpacity>
          </View>

          {/* Hero stat pills */}
          <View style={s.heroPillRow}>
            <View style={s.heroPill}>
              <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={s.heroPillTxt}>{(users || []).length} total</Text>
            </View>
            <View style={s.heroPill}>
              <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={s.heroPillTxt}>{adminCount} admins</Text>
            </View>
            <View style={s.heroPill}>
              <Ionicons name="checkmark-circle-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={s.heroPillTxt}>{activeCount} active</Text>
            </View>
          </View>
        </FadeUp>
      </LinearGradient>

      {/* ══ LIST ══ */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id || item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"

        ListHeaderComponent={
          <View>
            {/* Search */}
            <FadeUp delay={60}>
              <Animated.View style={[s.searchWrap, { borderColor: searchBorder, backgroundColor: searchBg }]}>
                <Ionicons name="search-outline" size={16} color={searchFocused ? C.primary : C.muted} />
                <TextInput
                  style={s.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by name, email, role…"
                  placeholderTextColor={C.muted}
                  onFocus={onSearchFocus}
                  onBlur={onSearchBlur}
                  autoCapitalize="none"
                />
                {!!searchQuery && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={C.muted} />
                  </TouchableOpacity>
                )}
              </Animated.View>
            </FadeUp>

            {/* Tabs */}
            <FadeUp delay={100} style={s.tabRow}>
              <TouchableOpacity style={[s.tab, activeTab === "active" && s.tabActive]} onPress={() => setActiveTab("active")} activeOpacity={0.8}>
                <Text style={[s.tabTxt, activeTab === "active" && s.tabTxtActive]}>Active</Text>
                <View style={[s.tabBadge, activeTab === "active" && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === "active" && s.tabBadgeTxtActive]}>{activeCount}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, activeTab === "archived" && s.tabActive]} onPress={() => setActiveTab("archived")} activeOpacity={0.8}>
                <Text style={[s.tabTxt, activeTab === "archived" && s.tabTxtActive]}>Deactivated</Text>
                <View style={[s.tabBadge, activeTab === "archived" && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === "archived" && s.tabBadgeTxtActive]}>{deactiveCount}</Text>
                </View>
              </TouchableOpacity>
            </FadeUp>

            {/* Selection actions */}
            <FadeUp delay={115} style={s.selectRow}>
              <TouchableOpacity
                style={s.selectToggleBtn}
                onPress={() => setSelectedIds(allVisibleSelected ? [] : visibleIds)}
                activeOpacity={0.78}
              >
                <Ionicons name={allVisibleSelected ? "checkbox" : "square-outline"} size={15} color={C.primary} />
                <Text style={s.selectToggleTxt}>{allVisibleSelected ? "Clear All" : "Select All"}</Text>
              </TouchableOpacity>
              <Text style={s.selectedCountTxt}>{selectedVisibleCount} selected</Text>
            </FadeUp>

            {/* Bulk actions */}
            {selectedVisibleCount > 0 && (
              <FadeUp delay={130} style={s.bulkRow}>
                {activeTab === "active" ? (
                  <TouchableOpacity style={s.bulkBtnArchive} onPress={() => bulkUpdateStatusSelected(false)} activeOpacity={0.8}>
                    <Ionicons name="ban-outline" size={13} color={C.danger} />
                    <Text style={s.bulkBtnArchiveTxt}>Deactivate Selected</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.bulkBtnRestore} onPress={() => bulkUpdateStatusSelected(true)} activeOpacity={0.8}>
                    <Ionicons name="checkmark-circle-outline" size={13} color={C.green} />
                    <Text style={s.bulkBtnRestoreTxt}>Activate Selected</Text>
                  </TouchableOpacity>
                )}
              </FadeUp>
            )}

            {/* Section label */}
            <View style={s.sectionRow}>
              <View style={s.sectionLine} />
              <Text style={s.sectionTxt}>{activeTab === "archived" ? "Deactivated" : "Active"} Users</Text>
              <View style={s.sectionLine} />
            </View>
          </View>
        }

        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="people-outline" size={30} color={C.border} />
            </View>
            <Text style={s.emptyTitle}>No users found</Text>
            <Text style={s.emptySubtitle}>
              {searchQuery ? "Try a different search term" : "No users in this category"}
            </Text>
          </View>
        }

        renderItem={({ item, index }) => (
          <UserCard
            item={item}
            index={index}
            onToggleRole={() => toggleRole(item)}
            selected={selectedIds.includes(String(item.id || item._id))}
            onToggleSelect={() => {
              const id = String(item.id || item._id);
              setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
            }}
          />
        )}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg },

  // Loading
  loadScreen:{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 12 },
  loadTxt:   { fontSize: 14, color: C.muted, fontWeight: "600" },

  // Hero
  hero: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     22,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  heroNav:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  menuBtn:      { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  heroEyebrow:  { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  heroTitle:    { fontSize: 21, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },
  heroPillRow:  { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  heroPill:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  heroPillTxt:  { fontSize: 11.5, fontWeight: "700", color: "rgba(255,255,255,0.88)" },
  exportBtn:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
  exportBtnTxt: { fontSize: 12, fontWeight: "800", color: C.primary },

  // List
  listContent:  { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 },

  // Search
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 14, color: C.ink, fontFamily: F.body, fontWeight: "500" },

  // Tabs
  tabRow:           { flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, padding: 4, gap: 4, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  tab:              { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 13 },
  tabActive:        { backgroundColor: C.white, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
  tabTxt:           { fontSize: 13, fontWeight: "700", color: C.muted },
  tabTxtActive:     { color: C.ink, fontWeight: "900" },
  tabBadge:         { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeActive:   { backgroundColor: C.primaryLight },
  tabBadgeTxt:      { fontSize: 11, fontWeight: "800", color: C.muted },
  tabBadgeTxtActive:{ color: C.primary },

  // Bulk
  bulkRow:           { flexDirection: "row", gap: 10, marginBottom: 14 },
  bulkBtnArchive:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.dangerLight, borderWidth: 1.5, borderColor: C.danger, borderRadius: 14, paddingVertical: 11 },
  bulkBtnArchiveTxt: { fontSize: 12, fontWeight: "800", color: C.danger },
  bulkBtnRestore:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.greenLight, borderWidth: 1.5, borderColor: C.green, borderRadius: 14, paddingVertical: 11 },
  bulkBtnRestoreTxt: { fontSize: 12, fontWeight: "800", color: C.green },

  // Selection
  selectRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectToggleBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  selectToggleTxt:   { fontSize: 12, fontWeight: "800", color: C.primary },
  selectedCountTxt:  { fontSize: 12, fontWeight: "700", color: C.muted },

  // Section divider
  sectionRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
  sectionTxt:  { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 },

  // Empty
  emptyWrap:    { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 16, fontWeight: "900", color: C.inkMid, fontFamily: F.display },
  emptySubtitle:{ fontSize: 13, color: C.muted, fontWeight: "600", textAlign: "center" },
});

export default Users;