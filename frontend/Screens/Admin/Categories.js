import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
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
  overlay:      "rgba(244,130,31,0.08)",
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
// ANIMATED INPUT
// ─────────────────────────────────────────────────────────────────────────────
const InputField = ({ icon, label, placeholder, value, onChange, multiline, height, error }) => {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const onFocus = () => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); };
  const onBlur  = () => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); };
  const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: [error ? C.danger : C.border, C.primary] });
  const bgColor     = anim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  return (
    <View style={inp.container}>
      {!!label && <Text style={[inp.label, error && { color: C.danger }]}>{label}</Text>}
      <Animated.View style={[inp.wrap, { borderColor, backgroundColor: bgColor }, multiline && { height: height || 88, alignItems: "flex-start" }, error && !focused && { borderColor: C.danger }]}>
        {!!icon && (
          <View style={[inp.iconBox, focused && inp.iconBoxFocus, multiline && { marginTop: 10 }]}>
            <Ionicons name={icon} size={15} color={focused ? C.primary : error ? C.danger : C.muted} />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          multiline={multiline}
          style={[inp.input, multiline && { paddingTop: 12, textAlignVertical: "top" }]}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </Animated.View>
      {!!error && <Text style={inp.errorTxt}>{error}</Text>}
    </View>
  );
};

const inp = StyleSheet.create({
  container:    { marginBottom: 12 },
  label:        { fontSize: 11, fontWeight: "700", color: C.inkMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginLeft: 2 },
  wrap:         { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, minHeight: 52, paddingHorizontal: 8, gap: 6 },
  iconBox:      { width: 34, height: 34, borderRadius: 10, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconBoxFocus: { backgroundColor: C.primaryLight },
  input:        { flex: 1, fontSize: 14.5, color: C.ink, fontFamily: F.body, fontWeight: "500", paddingVertical: 0 },
  errorTxt:     { fontSize: 10, color: C.danger, fontWeight: "700", marginTop: 4, marginLeft: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// GENRE CARD
// ─────────────────────────────────────────────────────────────────────────────
const GenreCard = ({ item, onEdit, onToggleSelect, selected, index }) => {
  const scale = useRef(new Animated.Value(0.97)).current;
  const op    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,    { toValue: 1, duration: 360, delay: index * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, delay: index * 45, damping: 16, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const isArchived = Boolean(item?.isArchived);

  return (
    <Animated.View style={[gc.wrap, { opacity: op, transform: [{ scale }] }, isArchived && gc.wrapArchived]}>
      <View style={[gc.accent, { backgroundColor: isArchived ? C.border : C.primary }]} />
      <View style={gc.body}>
        <View style={gc.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[gc.name, isArchived && gc.nameMuted]} numberOfLines={1}>{item.name}</Text>
            {!!item.description && (
              <Text style={gc.desc} numberOfLines={2}>{item.description}</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <TouchableOpacity style={[gc.selectBtn, selected && gc.selectBtnOn]} onPress={onToggleSelect} activeOpacity={0.8}>
              <Ionicons name={selected ? "checkbox" : "square-outline"} size={18} color={selected ? C.primary : C.muted} />
            </TouchableOpacity>
            {isArchived && (
              <View style={gc.archivedBadge}>
                <Text style={gc.archivedBadgeTxt}>Archived</Text>
              </View>
            )}
          </View>
        </View>

        <View style={gc.actionRow}>
          <TouchableOpacity style={gc.editBtn} onPress={onEdit} activeOpacity={0.8}>
            <Ionicons name="pencil-outline" size={13} color={C.primary} />
            <Text style={gc.editBtnTxt}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const gc = StyleSheet.create({
  wrap:           { flexDirection: "row", backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  wrapArchived:   { opacity: 0.72, backgroundColor: C.surface },
  accent:         { width: 4, flexShrink: 0 },
  body:           { flex: 1, padding: 14, gap: 10 },
  topRow:         { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name:           { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display },
  nameMuted:      { color: C.muted },
  desc:           { fontSize: 12.5, color: C.muted, fontWeight: "500", marginTop: 3, lineHeight: 18 },
  selectBtn:      { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  selectBtnOn:    { backgroundColor: C.primaryLight, borderColor: C.primary },
  archivedBadge:  { backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.border },
  archivedBadgeTxt:{ fontSize: 10, color: C.muted, fontWeight: "700" },
  actionRow:      { flexDirection: "row", gap: 8 },
  editBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, paddingVertical: 8 },
  editBtnTxt:     { fontSize: 12, fontWeight: "800", color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Categories = ({ navigation }) => {
  const [categories,      setCategories]      = useState([]);
  const [name,            setName]            = useState("");
  const [description,     setDescription]     = useState("");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [activeTab,       setActiveTab]       = useState("active");
  const [editingId,       setEditingId]       = useState("");
  const [editName,        setEditName]        = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [searchFocused,   setSearchFocused]   = useState(false);
  const [selectedIds,     setSelectedIds]     = useState([]);

  // Validation state
  const [errors,    setErrors]    = useState({});
  const [editErrors, setEditErrors] = useState({});

  // Animated edit panel
  const editAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(editAnim, { toValue: editingId ? 1 : 0, damping: 18, stiffness: 140, useNativeDriver: true }).start();
  }, [editingId]);
  const editScale = editAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  // Search animated border
  const searchAnim = useRef(new Animated.Value(0)).current;
  const onSearchFocus = () => { setSearchFocused(true);  Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); };
  const onSearchBlur  = () => { setSearchFocused(false); Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); };
  const searchBorder  = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  const searchBg      = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  // ── Backend (all unchanged) ──
  const load = async () => {
    const res = await axios.get(`${baseURL}categories?includeSubgenres=1&includeArchived=1`);
    setCategories(res.data || []);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => Toast.show({ type: "error", text1: "Failed to load genres", topOffset: 60 }));
    }, [])
  );

  const addCategory = async () => {
    if (!name.trim()) {
      setErrors({ name: "Genre name is required" });
      Toast.show({ type: "error", text1: "Validation failed", text2: "Genre name is required", topOffset: 60 });
      return;
    }
    try {
      const token = await AsyncStorage.getItem("jwt");
      const res = await axios.post(`${baseURL}categories`, { name: name.trim(), description: description.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setCategories((prev) => [...prev, res.data]);
      setName(""); setDescription(""); setErrors({});
      Toast.show({ type: "success", text1: "Genre added", topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Add failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const startEdit  = (item) => { setEditingId(String(item.id || item._id || "")); setEditName(String(item?.name || "")); setEditDescription(String(item?.description || "")); setEditErrors({}); };
  const cancelEdit = () => { setEditingId(""); setEditName(""); setEditDescription(""); setEditErrors({}); };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) {
      setEditErrors({ name: "Genre name is required" });
      Toast.show({ type: "error", text1: "Validation failed", text2: "Genre name is required", topOffset: 60 });
      return;
    }
    try {
      const token = await AsyncStorage.getItem("jwt");
      const response = await axios.put(`${baseURL}categories/${editingId}`, { name: editName.trim(), description: editDescription.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setCategories((prev) => (prev || []).map((item) => { const id = String(item.id || item._id); if (id !== String(editingId)) return item; return response.data; }));
      Toast.show({ type: "success", text1: "Genre updated", topOffset: 60 });
      cancelEdit();
    } catch (error) {
      Toast.show({ type: "error", text1: "Update failed", text2: error?.response?.data?.message || "Please try again", topOffset: 60 });
    }
  };

  const bulkArchiveSelected = async (isArchived) => {
    const targets = filteredCategories.filter((item) => selectedIds.includes(String(item.id || item._id)) && Boolean(item?.isArchived) !== Boolean(isArchived));
    if (!targets.length) { Toast.show({ type: "info", text1: "Select genres first", topOffset: 60 }); return; }
    try {
      const token = await AsyncStorage.getItem("jwt");
      let success = 0;
      for (const item of targets) {
        try { await axios.put(`${baseURL}categories/${item.id || item._id}/archive`, { isArchived }, { headers: { Authorization: `Bearer ${token}` } }); success += 1; } catch {}
      }
      await load();
      Toast.show({ type: "success", text1: isArchived ? "Selected genres archived" : "Selected genres restored", text2: `${success} genres updated`, topOffset: 60 });
      setSelectedIds([]);
    } catch (error) {
      Toast.show({ type: "error", text1: "Bulk update failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return (categories || []).filter((item) => {
        const archived = Boolean(item?.isArchived);
        return activeTab === "archived" ? archived : !archived;
      });
    }

    const matches = (categories || []).filter((item) => {
      const archived = Boolean(item?.isArchived);
      const matchesTab = activeTab === "archived" ? archived : !archived;
      if (!matchesTab) return false;

      return (
        String(item?.name || "").toLowerCase().includes(q) ||
        String(item?.description || "").toLowerCase().includes(q)
      );
    });

    // Sort: items that START with the search query appear at the top
    return matches.sort((a, b) => {
      const aName = String(a?.name || "").toLowerCase();
      const bName = String(b?.name || "").toLowerCase();

      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
  }, [categories, activeTab, searchQuery]);

  const visibleIds = useMemo(() => filteredCategories.map((item) => String(item.id || item._id)), [filteredCategories]);
  const selectedVisibleCount = useMemo(() => selectedIds.filter((id) => visibleIds.includes(id)).length, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const exportGenreListPdf = async () => {
    try {
      const rows = (categories || []).map((item, index) => [index + 1, item?.name || "N/A", item?.description || "-", item?.isArchived ? "Archived" : "Active"]);
      const html = buildListPdfHtml({ title: "PageTurner Genre Records", summaryLines: [{ label: "Total records:", value: String(rows.length) }], headers: ["#", "Genre", "Description", "State"], rows });
      const result = await exportPdfFromHtml(html, { fileName: "PageTurnerGenreRecords", dialogTitle: "Export genre records" });
      Toast.show({ type: "success", text1: "Genre records exported", text2: result.shared ? "PDF ready to share" : result.uri, topOffset: 60 });
    } catch (error) {
      Toast.show({ type: "error", text1: "Export failed", text2: error?.message || "Please try again", topOffset: 60 });
    }
  };

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  const activeCount   = (categories || []).filter((i) => !i?.isArchived).length;
  const archivedCount = (categories || []).filter((i) =>  i?.isArchived).length;

  return (
    <View style={s.screen}>

      {/* ══ HERO HEADER ══ */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={s.hero}
      >
        <FloatingOrb size={150} color="rgba(255,255,255,0.07)" style={{ top: -45, right: -35 }} delay={0} />
        <FloatingOrb size={75}  color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -20 }}  delay={800} />

        <FadeUp delay={0}>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
              <Ionicons name="menu" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>PageTurner</Text>
              <Text style={s.heroTitle}>Manage Genres</Text>
            </View>
            <TouchableOpacity style={s.exportBtn} onPress={exportGenreListPdf} activeOpacity={0.85}>
              <Ionicons name="document-text-outline" size={14} color={C.primary} />
              <Text style={s.exportBtnTxt}>Export</Text>
            </TouchableOpacity>
          </View>
          <View style={s.heroPill}>
            <Ionicons name="bookmark-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={s.heroPillTxt}>{(categories || []).length} total genres</Text>
          </View>
        </FadeUp>
      </LinearGradient>

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id || item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"

        ListHeaderComponent={
          <View>
            {/* ── SEARCH ── */}
            <FadeUp delay={60}>
              <Animated.View style={[s.searchWrap, { borderColor: searchBorder, backgroundColor: searchBg }]}>
                <Ionicons name="search-outline" size={16} color={searchFocused ? C.primary : C.muted} />
                <TextInput
                  style={s.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search genres…"
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

            {/* ── TABS ── */}
            <FadeUp delay={100} style={s.tabRow}>
              <TouchableOpacity style={[s.tab, activeTab === "active" && s.tabActive]} onPress={() => setActiveTab("active")} activeOpacity={0.8}>
                <Text style={[s.tabTxt, activeTab === "active" && s.tabTxtActive]}>Active</Text>
                <View style={[s.tabBadge, activeTab === "active" && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === "active" && s.tabBadgeTxtActive]}>{activeCount}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, activeTab === "archived" && s.tabActive]} onPress={() => setActiveTab("archived")} activeOpacity={0.8}>
                <Text style={[s.tabTxt, activeTab === "archived" && s.tabTxtActive]}>Archived</Text>
                <View style={[s.tabBadge, activeTab === "archived" && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeTxt, activeTab === "archived" && s.tabBadgeTxtActive]}>{archivedCount}</Text>
                </View>
              </TouchableOpacity>
            </FadeUp>

            {/* ── SELECTION ACTIONS ── */}
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

            {/* ── BULK ACTIONS ── */}
            {selectedVisibleCount > 0 && (
              <FadeUp delay={130} style={s.bulkRow}>
                {activeTab === "active" ? (
                  <TouchableOpacity style={s.bulkBtnArchive} onPress={() => bulkArchiveSelected(true)} activeOpacity={0.8}>
                    <Ionicons name="archive-outline" size={13} color={C.danger} />
                    <Text style={s.bulkBtnArchiveTxt}>Archive Selected</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.bulkBtnRestore} onPress={() => bulkArchiveSelected(false)} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={13} color={C.green} />
                    <Text style={s.bulkBtnRestoreTxt}>Restore Selected</Text>
                  </TouchableOpacity>
                )}
              </FadeUp>
            )}

            {/* ── ADD GENRE CARD ── */}
            <FadeUp delay={170} style={s.addCard}>
              <View style={s.addCardHeader}>
                <LinearGradient colors={[C.primary, C.primaryDark]} style={s.addCardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="add" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={s.addCardTitle}>Add New Genre</Text>
              </View>
              <InputField icon="bookmark-outline" label="Genre Name" placeholder="e.g. Science Fiction" value={name} onChange={(v) => { setName(v); setErrors({}); }} error={errors.name} />
              <InputField icon="document-text-outline" label="Description (optional)" placeholder="Short description…" value={description} onChange={setDescription} multiline height={80} />
              <TouchableOpacity style={s.addBtn} onPress={addCategory} activeOpacity={0.86}>
                <LinearGradient colors={[C.primaryGlow, C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.addBtnGradient}>
                  <Ionicons name="add-circle-outline" size={17} color="#FFF" />
                  <Text style={s.addBtnTxt}>Add Genre</Text>
                </LinearGradient>
              </TouchableOpacity>
            </FadeUp>

            {/* ── EDIT PANEL ── */}
            {!!editingId && (
              <Animated.View style={[s.editCard, { opacity: editAnim, transform: [{ scale: editScale }] }, editErrors.name && { borderColor: C.danger }]}>
                <View style={s.editCardHeader}>
                  <LinearGradient colors={[C.blue, C.blue + "CC"]} style={s.editCardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name="pencil" size={14} color="#FFF" />
                  </LinearGradient>
                  <Text style={s.editCardTitle}>Edit Genre</Text>
                  <TouchableOpacity onPress={cancelEdit} style={s.editCancelX} hitSlop={10}>
                    <Ionicons name="close" size={18} color={C.muted} />
                  </TouchableOpacity>
                </View>
                <InputField icon="bookmark-outline" label="Genre Name" placeholder="Genre name" value={editName} onChange={(v) => { setEditName(v); setEditErrors({}); }} error={editErrors.name} />
                <InputField icon="document-text-outline" label="Description" placeholder="Genre description" value={editDescription} onChange={setEditDescription} multiline height={80} />
                <View style={s.editActionRow}>
                  <TouchableOpacity style={s.editSaveBtn} onPress={saveEdit} activeOpacity={0.85}>
                    <Ionicons name="checkmark-done-outline" size={15} color="#FFF" />
                    <Text style={s.editSaveBtnTxt}>Save Changes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.editCancelBtn} onPress={cancelEdit} activeOpacity={0.85}>
                    <Text style={s.editCancelBtnTxt}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* List title */}
            <View style={s.listTitleRow}>
              <View style={s.listTitleLine} />
              <Text style={s.listTitleTxt}>{activeTab === "archived" ? "Archived" : "Active"} Genres</Text>
              <View style={s.listTitleLine} />
            </View>
          </View>
        }

        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="bookmark-outline" size={30} color={C.border} />
            </View>
            <Text style={s.emptyTitle}>No genres found</Text>
            <Text style={s.emptySubtitle}>
              {searchQuery ? "Try a different search term" : "Add your first genre above"}
            </Text>
          </View>
        }

        renderItem={({ item, index }) => (
          <GenreCard
            item={item}
            index={index}
            onEdit={() => startEdit(item)}
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
  screen: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     22,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  heroNav:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  menuBtn:     { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  heroEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 },
  heroTitle:   { fontSize: 21, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },
  heroPill:    { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillTxt: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.88)" },
  exportBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
  exportBtnTxt:{ fontSize: 12, fontWeight: "800", color: C.primary },

  // List
  listContent:  { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 48 },

  // Search
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 14, color: C.ink, fontFamily: F.body, fontWeight: "500" },

  // Tabs
  tabRow:         { flexDirection: "row", backgroundColor: C.surface, borderRadius: 16, padding: 4, gap: 4, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  tab:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 13 },
  tabActive:      { backgroundColor: C.white, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 3 },
  tabTxt:         { fontSize: 13, fontWeight: "700", color: C.muted },
  tabTxtActive:   { color: C.ink, fontWeight: "900" },
  tabBadge:       { backgroundColor: C.border, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeActive: { backgroundColor: C.primaryLight },
  tabBadgeTxt:    { fontSize: 11, fontWeight: "800", color: C.muted },
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

  // Add card
  addCard:       { backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14, shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  addCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  addCardIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addCardTitle:  { fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display },
  addBtn:        { borderRadius: 16, overflow: "hidden", shadowColor: C.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.36, shadowRadius: 12, elevation: 6 },
  addBtnGradient:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  addBtnTxt:     { fontSize: 15, fontWeight: "900", color: "#FFF", letterSpacing: 0.3 },

  // Edit card
  editCard:       { backgroundColor: C.white, borderRadius: 24, borderWidth: 2, borderColor: C.blue + "55", padding: 18, marginBottom: 14, shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 4 },
  editCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  editCardIcon:   { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editCardTitle:  { flex: 1, fontSize: 15, fontWeight: "900", color: C.ink, fontFamily: F.display },
  editCancelX:    { width: 30, height: 30, borderRadius: 9, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  editActionRow:  { flexDirection: "row", gap: 10 },
  editSaveBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: C.blue, borderRadius: 14, paddingVertical: 13 },
  editSaveBtnTxt: { fontSize: 13, fontWeight: "900", color: "#FFF" },
  editCancelBtn:  { paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  editCancelBtnTxt:{ fontSize: 13, fontWeight: "700", color: C.muted },

  // List section title
  listTitleRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  listTitleLine: { flex: 1, height: 1, backgroundColor: C.border },
  listTitleTxt:  { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 },

  // Empty
  emptyWrap:    { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 16, fontWeight: "900", color: C.inkMid, fontFamily: F.display },
  emptySubtitle:{ fontSize: 13, color: C.muted, fontWeight: "600", textAlign: "center" },
});

export default Categories;