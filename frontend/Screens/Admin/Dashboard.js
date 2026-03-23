import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Polyline, Stop, Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { fetchAdminOrders } from "../../Redux/Actions/orderActions";
import { formatPHP } from "../../utils/currency";
import { buildAnalyticsPdfHtml, exportPdfFromHtml } from "../../utils/pdfExport";

const { width: SW } = Dimensions.get("window");
const CHART_W = SW - 56;

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
  primaryMid:   "#FDDCBA",
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
  gold:         "#FFAA00",
  goldLight:    "#FEF9E7",
};

const F = {
  display: Platform.select({ ios: "Georgia",    android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",     android: "sans-serif", default: "sans-serif" }),
  mono:    Platform.select({ ios: "Courier New",android: "monospace",  default: "monospace" }),
};

const PIE_COLORS = [C.primary, C.amber, C.green, C.blue, C.purple, "#EC4899"];
const fmt = (v) => formatPHP ? formatPHP(v) : "\u20B1" + Number(v || 0).toLocaleString();

// ─────────────────────────────────────────────────────────────────────────────
// UNCHANGED BACKEND HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const monthLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-PH", { month: "short", year: "2-digit" });
};
const monthKey = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
};
const addressLabel = (order) => {
  const parts = [order?.shippingAddress1, order?.shippingAddress2]
    .map((p) => String(p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown Address";
};

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING ORB
// ─────────────────────────────────────────────────────────────────────────────
const FloatingOrb = ({ style, size, delay = 0, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3800, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  return <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY: ty }] }, style]} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// FADE-UP
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESSABLE SCALE
// ─────────────────────────────────────────────────────────────────────────────
const PressableScale = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, accent = C.primary, delay = 0, children }) => (
  <FadeUp delay={delay} style={sc.wrap}>
    <View style={sc.header}>
      <LinearGradient colors={[accent, accent + "CC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={sc.iconBox}>
        <Ionicons name={icon} size={14} color="#FFF" />
      </LinearGradient>
      <Text style={sc.title}>{title}</Text>
    </View>
    <View style={sc.body}>{children}</View>
  </FadeUp>
);

const sc = StyleSheet.create({
  wrap:    { backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 4 },
  header:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 14, fontWeight: "900", color: C.ink, fontFamily: F.display, letterSpacing: 0.1 },
  body:    { padding: 18 },
});

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
const Divider = ({ label }) => (
  <View style={dv.row}>
    <View style={dv.line} />
    {label ? <Text style={dv.txt}>{label}</Text> : null}
    {label ? <View style={dv.line} /> : null}
  </View>
);
const dv = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  txt:  { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, accent = C.primary, bgLight, delay = 0 }) => (
  <FadeUp delay={delay} style={kpi.wrap}>
    <View style={[kpi.inner, { backgroundColor: bgLight || C.surface }]}>
      <View style={[kpi.iconCircle, { backgroundColor: accent + "22" }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={kpi.label}>{label}</Text>
      <Text style={[kpi.value, { color: accent }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={kpi.sub}>{sub}</Text> : null}
    </View>
  </FadeUp>
);

const kpi = StyleSheet.create({
  wrap:       { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, overflow: "hidden", shadowColor: C.primaryDark, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  inner:      { padding: 16, gap: 5, minHeight: 150 },
  iconCircle: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  label:      { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
  value:      { fontSize: 19, fontWeight: "900", fontFamily: F.display },
  sub:        { fontSize: 11, color: C.muted, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────────────────────
// PIE CHART
// ─────────────────────────────────────────────────────────────────────────────
const MostPurchasedPieChart = ({ title, data, navigation }) => {
  const total  = data.reduce((s, d) => s + Number(d.value || 0), 0);
  const SIZE   = 148, SW_PIE = 28, R = (SIZE - SW_PIE) / 2;
  const CX = SIZE / 2, CY = SIZE / 2, CIRC = 2 * Math.PI * R;

  return (
    <SectionCard title={title} icon="pie-chart-outline" accent={C.primary} delay={160}>
      {!data.length ? <Text style={s.empty}>No data yet.</Text> : (
        <View style={s.pieRow}>
          <View>
            <Svg width={SIZE} height={SIZE}>
              {(() => {
                let offset = 0;
                return data.map((item, idx) => {
                  const val  = Number(item.value || 0);
                  const frac = total > 0 ? val / total : 0;
                  const dash = CIRC * frac;
                  const color = PIE_COLORS[idx % PIE_COLORS.length];
                  const el = (
                    <Circle key={`${item.label}-${idx}`} cx={CX} cy={CY} r={R}
                      stroke={color} strokeWidth={SW_PIE} fill="transparent"
                      strokeDasharray={`${dash} ${Math.max(CIRC - dash, 0)}`}
                      strokeDashoffset={-offset} strokeLinecap="butt"
                      rotation="-90" originX={CX} originY={CY}
                    />
                  );
                  offset += dash;
                  return el;
                });
              })()}
            </Svg>
            <View style={s.pieCenter}>
              <Text style={s.pieCenterNum}>{total}</Text>
              <Text style={s.pieCenterLbl}>items</Text>
            </View>
          </View>
          <View style={s.pieLegend}>
            {data.map((item, idx) => {
              const val   = Number(item.value || 0);
              const pct   = total > 0 ? ((val / total) * 100).toFixed(0) : "0";
              const color = PIE_COLORS[idx % PIE_COLORS.length];
              return (
                <TouchableOpacity
                  key={item.label}
                  style={s.legendRow}
                  onPress={() => item.product && navigation.navigate("Main", { screen: "Shop", params: { screen: "Product Detail", params: { item: item.product } } })}
                  activeOpacity={0.7}
                >
                  <View style={[s.legendDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.legendName} numberOfLines={1}>{item.label}</Text>
                    <Text style={[s.legendMeta, { color }]}>{val} sold · {pct}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LINE CHART
// ─────────────────────────────────────────────────────────────────────────────
const SixMonthLineChart = ({ title, data, insights }) => {
  const H = 160, PX = 8, PY = 16;
  const iW = CHART_W - PX * 2, iH = H - PY * 2;
  const max = Math.max(...data.map((d) => Number(d.value || 0)), 0);

  const pts = data.map((item, i) => {
    const x = data.length <= 1 ? CHART_W / 2 : PX + (i / (data.length - 1)) * iW;
    const y = PY + iH - (max > 0 ? (Number(item.value || 0) / max) * iH : 0);
    return { x, y, ...item };
  });
  const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");

  const growth      = insights?.growthPercent;
  const growthColor = typeof growth === "number" ? (growth >= 0 ? C.green : C.danger) : C.muted;
  const growthStr   = typeof growth === "number" ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "—";

  return (
    <SectionCard title={title} icon="trending-up-outline" accent={C.green} delay={220}>
      {!data.length ? <Text style={s.empty}>No data yet.</Text> : (
        <>
          {/* Insight pills */}
          <View style={s.insightRow}>
            {[
              { lbl: "Total",  val: fmt(insights?.totalSales  || 0), color: C.primary },
              { lbl: "Avg/Mo", val: fmt(insights?.averageSales|| 0), color: C.primaryDark },
              { lbl: "Orders", val: String(insights?.totalOrders||0), color: C.green },
              { lbl: "Growth", val: growthStr,                        color: growthColor },
            ].map(({ lbl, val, color }) => (
              <View key={lbl} style={s.insightPill}>
                <Text style={s.insightLbl}>{lbl}</Text>
                <Text style={[s.insightVal, { color }]}>{val}</Text>
              </View>
            ))}
          </View>

          {/* SVG line */}
          <View style={{ alignItems: "center" }}>
            <Svg width={CHART_W} height={H}>
              <Defs>
                <SvgGrad id="lg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={C.green} stopOpacity="0.22" />
                  <Stop offset="100%" stopColor={C.green} stopOpacity="0" />
                </SvgGrad>
              </Defs>
              <Polyline points={polyPts} fill="none" stroke={C.green} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((pt, i) => (
                <Circle key={i} cx={pt.x} cy={pt.y} r="5.5" fill={C.green} stroke={C.white} strokeWidth="2.5" />
              ))}
            </Svg>
            <View style={[s.lineLabels, { width: CHART_W }]}>
              {data.map((d) => <Text key={d.label} style={s.lineLbl}>{d.label}</Text>)}
            </View>
          </View>

          <Divider label="Monthly detail" />
          {data.map((item, i) => (
            <View key={item.label} style={[s.tableRow, i === data.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.tableMonthBox}>
                <Text style={s.tableMonth}>{item.label}</Text>
              </View>
              <Text style={[s.tableVal, { color: C.primary }]}>{fmt(item.value)}</Text>
              <View style={s.tableOrderBadge}>
                <Text style={s.tableOrders}>{item.orders} orders</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOLLIPOP / BAR CHART
// ─────────────────────────────────────────────────────────────────────────────
const LollipopChart = ({ title, icon, accent = C.primary, data, delay = 280 }) => {
  const top = Math.max(...data.map((d) => Number(d.value || 0)), 0);
  return (
    <SectionCard title={title} icon={icon} accent={accent} delay={delay}>
      {!data.length ? <Text style={s.empty}>No data yet.</Text> : data.map((item, i) => {
        const val     = Number(item.value || 0);
        const pct     = top > 0 ? Math.max((val / top) * 100, 5) : 5;
        const isFirst = i === 0;
        return (
          <View key={item.label} style={s.lolItem}>
            <View style={s.lolHeader}>
              <View style={[s.lolRankBadge, isFirst && { backgroundColor: C.primaryLight }]}>
                <Text style={[s.lolRankTxt, isFirst && { color: C.primary }]}>#{i + 1}</Text>
              </View>
              <Text style={s.lolLabel} numberOfLines={1}>{item.label}</Text>
              <Text style={[s.lolVal, { color: isFirst ? C.primary : C.inkMid }]}>{val}</Text>
            </View>
            <View style={s.lolTrack}>
              <LinearGradient
                colors={isFirst ? [C.primaryGlow, C.primary] : [C.primaryMid, C.border]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.lolFill, { width: `${pct}%` }]}
              />
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { adminOrders: orders, loadingAdmin: loading, errorAdmin } = useSelector((st) => st.orders);

  // Shimmer animation for header logo
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchAdminOrders()).catch((err) => {
        Toast.show({ type: "error", text1: "Failed to load dashboard", text2: err?.response?.data?.message || "Please try again", topOffset: 60 });
      });
    }, [dispatch])
  );

  const summary = useMemo(() => {
    const orderList = orders || [];
    const totalSales = orderList.reduce((sum, o) => sum + Number(o?.totalPrice || 0), 0);
    const productMap = {}, monthMap = {}, addressMap = {}, userMap = {};
    orderList.forEach((order) => {
      const key = monthKey(order?.dateOrdered || order?.createdAt);
      if (key) {
        if (!monthMap[key]) monthMap[key] = { label: monthLabel(order?.dateOrdered || order?.createdAt), value: 0, orders: 0 };
        monthMap[key].value  += Number(order?.totalPrice || 0);
        monthMap[key].orders += 1;
      }
      const addr     = addressLabel(order);
      const userName = String(order?.user?.name || "Unknown User");
      (order?.orderItems || []).forEach((oi) => {
        const qty  = Number(oi?.quantity || 0);
        const name = oi?.product?.name || "Unknown Item";
        const productData = oi?.product;
        
        if (productData) {
          if (!productMap[name]) {
            productMap[name] = { value: 0, product: productData };
          }
          productMap[name].value += qty;
        }

        addressMap[addr]  = (addressMap[addr]  || 0) + qty;
        userMap[userName] = (userMap[userName] || 0) + qty;
      });
    });
    const mostPurchasedItems = Object.entries(productMap).map(([l, data]) => ({ label: l, value: data.value, product: data.product })).sort((a, b) => b.value - a.value).slice(0, 5);
    const monthlySales = Object.entries(monthMap).map(([k, m]) => ({ key: k, ...m })).sort((a, b) => a.key.localeCompare(b.key)).slice(-6).map(({ label, value, orders }) => ({ label, value, orders }));
    const sixTotal  = monthlySales.reduce((s, m) => s + Number(m.value || 0), 0);
    const sixOrders = monthlySales.reduce((s, m) => s + Number(m.orders || 0), 0);
    const sixAvg    = monthlySales.length ? sixTotal / monthlySales.length : 0;
    const bestMonth = [...monthlySales].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0] || null;
    const first = monthlySales[0], last = monthlySales[monthlySales.length - 1];
    const growthPercent = first && Number(first.value) > 0 && last
      ? ((Number(last.value) - Number(first.value)) / Number(first.value)) * 100
      : null;
    const topAddresses = Object.entries(addressMap).map(([l, v]) => ({ label: l, value: v })).sort((a, b) => b.value - a.value).slice(0, 5);
    const topUsers     = Object.entries(userMap).map(([l, v]) => ({ label: l, value: v })).sort((a, b) => b.value - a.value).slice(0, 5);
    return { totalSales, mostPurchasedItems, sixMonthSales: monthlySales, sixMonthInsights: { totalSales: sixTotal, totalOrders: sixOrders, averageSales: sixAvg, bestMonth, growthPercent }, topAddresses, topUsers, topItem: mostPurchasedItems[0] || null };
  }, [orders]);

  const onRefresh = async () => {
    try { await dispatch(fetchAdminOrders()); }
    catch (err) { Toast.show({ type: "error", text1: "Refresh failed", text2: err?.response?.data?.message || "Please try again", topOffset: 60 }); }
  };

  const exportPdfReport = async () => {
    try {
      const html = buildAnalyticsPdfHtml({
        title: "PageTurner Analytics Report",
        summaryLines: [
          { label: "Total Sales:", value: fmt(summary.totalSales) },
          { label: "Total Orders:", value: String(orders?.length || 0) },
          { label: "Top Item:", value: `${summary.topItem?.label || "N/A"} (${summary.topItem?.value || 0} items)` },
          { label: "6-Month Total:", value: fmt(summary.sixMonthInsights?.totalSales || 0) },
          { label: "6-Month Average:", value: fmt(summary.sixMonthInsights?.averageSales || 0) },
          { label: "Growth:", value: typeof summary.sixMonthInsights?.growthPercent === "number" ? `${summary.sixMonthInsights.growthPercent.toFixed(1)}%` : "N/A" },
        ],
        sections: [
          { title: "Most Purchased Items", graphTitle: "Purchase Volume", graphData: summary.mostPurchasedItems.map((i) => ({ label: i.label, value: Number(i.value || 0), displayValue: `${i.value} items` })), headers: ["#", "Item", "Qty"], rows: summary.mostPurchasedItems.map((i, idx) => [idx + 1, i.label, i.value]) },
          { title: "6-Month Sales", graphTitle: "Sales Trend", graphData: summary.sixMonthSales.map((i) => ({ label: i.label, value: Number(i.value || 0), displayValue: fmt(i.value || 0) })), headers: ["Month", "Sales", "Orders"], rows: summary.sixMonthSales.map((i) => [i.label, fmt(i.value || 0), i.orders]) },
          { title: "Top 5 Users", graphTitle: "User Volume", graphData: summary.topUsers.map((i) => ({ label: i.label, value: Number(i.value || 0), displayValue: `${i.value} items` })), headers: ["#", "User", "Qty"], rows: summary.topUsers.map((i, idx) => [idx + 1, i.label, i.value]) },
          { title: "Top 5 Addresses", graphTitle: "Address Volume", graphData: summary.topAddresses.map((i) => ({ label: i.label, value: Number(i.value || 0), displayValue: `${i.value} items` })), headers: ["#", "Address", "Qty"], rows: summary.topAddresses.map((i, idx) => [idx + 1, i.label, i.value]) },
        ],
      });
      const result = await exportPdfFromHtml(html, { fileName: "PageTurnerAnalyticsReport", dialogTitle: "Export analytics report" });
      Toast.show({ type: "success", text1: "Report generated", text2: result.shared ? "PDF ready to share" : result.uri, topOffset: 60 });
    } catch (err) {
      Toast.show({ type: "error", text1: "PDF export failed", text2: err?.message || "Please try again", topOffset: 60 });
    }
  };

  const growth      = summary.sixMonthInsights?.growthPercent;
  const growthColor = typeof growth === "number" ? (growth >= 0 ? C.green : C.danger) : C.muted;

  const openDrawer = () => {
    if (typeof navigation?.openDrawer === "function") { navigation.openDrawer(); return; }
    navigation?.getParent?.()?.openDrawer?.();
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}
    >

      {/* ══ HERO HEADER ══ */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.1 }}
        style={s.header}
      >
        <FloatingOrb size={200} color="rgba(255,255,255,0.07)" style={{ top: -70, right: -60 }} delay={0} />
        <FloatingOrb size={100} color="rgba(255,255,255,0.09)" style={{ bottom: 0, left: -30 }}  delay={900} />
        <FloatingOrb size={55}  color="rgba(255,200,80,0.18)"  style={{ top: 50, left: SW * 0.45 }} delay={1500} />

        <FadeUp delay={0}>
          <View style={s.headerTop}>
            {/* Left — menu + brand */}
            <View style={s.headerLeft}>
              <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.8}>
                <Ionicons name="menu" size={22} color="#FFF" />
              </TouchableOpacity>
              <View>
                <Text style={s.brandEyebrow}>PageTurner</Text>
                <Text style={s.headerTitle}>Admin Dashboard</Text>
              </View>
            </View>

            {/* Right — export */}
            <PressableScale onPress={exportPdfReport} style={s.exportBtn}>
              <Ionicons name="document-text-outline" size={14} color={C.primary} />
              <Text style={s.exportBtnTxt}>Export</Text>
            </PressableScale>
          </View>

          {/* Order count pill */}
          <View style={s.headerPill}>
            <Ionicons name="receipt-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={s.headerPillTxt}>{orders?.length || 0} total orders</Text>
          </View>
        </FadeUp>
      </LinearGradient>

      {/* ══ BODY ══ */}
      <View style={s.body}>

        {/* ── OVERVIEW KPIs ── */}
        <Divider label="Overview" />
        <View style={s.kpiRow}>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => navigation.navigate("Orders")}
            activeOpacity={0.8}
          >
            <KpiCard icon="cash-outline"       label="Total Sales"   value={fmt(summary.totalSales)} sub={`${orders?.length || 0} orders`} accent={C.primary}      delay={60} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => navigation.navigate("Products")}
            activeOpacity={0.8}
          >
            <KpiCard icon="flame-outline"      label="Best Seller"   value={summary.topItem?.label?.split(" ")[0] || "—"} sub={summary.topItem ? `${summary.topItem.value} sold` : "No data"} accent={C.amber} bgLight={C.goldLight} delay={100} />
          </TouchableOpacity>
        </View>
        <View style={[s.kpiRow, { marginBottom: 22 }]}>
          <View style={{ flex: 1 }}>
            <KpiCard icon="trending-up-outline" label="6-Mo Growth"  value={typeof growth === "number" ? `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` : "—"} sub="vs first month" accent={growthColor} bgLight={typeof growth === "number" ? (growth >= 0 ? C.greenLight : C.dangerLight) : C.surface} delay={140} />
          </View>
          <TouchableOpacity 
            style={{ flex: 1 }} 
            onPress={() => navigation.navigate("Users")}
            activeOpacity={0.8}
          >
            <KpiCard icon="people-outline"     label="Top Customer"  value={summary.topUsers[0]?.label?.split(" ")[0] || "—"} sub={summary.topUsers[0] ? `${summary.topUsers[0].value} items` : "No data"} accent={C.blue} bgLight={C.blueLight} delay={180} />
          </TouchableOpacity>
        </View>

        {/* ── ANALYTICS ── */}
        <Divider label="Analytics" />

        <MostPurchasedPieChart title="Most Purchased Items" data={summary.mostPurchasedItems} navigation={navigation} />

        <SixMonthLineChart title="6-Month Sales Trend" data={summary.sixMonthSales} insights={summary.sixMonthInsights} />

        {/* ── RANKINGS ── */}
        <Divider label="Rankings" />

        <LollipopChart title="Top 5 Addresses"       icon="location-outline" accent={C.blue}   data={summary.topAddresses} delay={280} />
        <LollipopChart title="Top 5 Users by Volume"  icon="person-outline"   accent={C.purple} data={summary.topUsers}     delay={320} />

        {loading && (
          <View style={s.loadWrap}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        )}
        {errorAdmin ? <Text style={s.errorTxt}>{errorAdmin}</Text> : null}
      </View>

    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 52 },

  // Hero header
  header: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     28,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  headerTop:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerLeft:   { flexDirection: "row", alignItems: "center", gap: 12 },
  menuBtn:      { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  brandEyebrow: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.60)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 },
  headerTitle:  { fontSize: 22, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.1 },
  headerPill:   { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  headerPillTxt:{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.88)" },

  exportBtn:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 3 },
  exportBtnTxt: { fontSize: 12, fontWeight: "800", color: C.primary },

  // Body
  body: { paddingHorizontal: 14, paddingTop: 22 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 12 },

  // Empty
  empty: { fontSize: 13, color: C.muted, fontWeight: "600" },

  // Pie
  pieRow:       { flexDirection: "row", alignItems: "center", gap: 16 },
  pieCenter:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  pieCenterNum: { fontSize: 18, fontWeight: "900", fontFamily: F.display, color: C.ink },
  pieCenterLbl: { fontSize: 9, color: C.muted, fontWeight: "700", textTransform: "uppercase" },
  pieLegend:    { flex: 1, gap: 10 },
  legendRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendName:   { fontSize: 12, fontWeight: "700", color: C.ink },
  legendMeta:   { fontSize: 11, fontWeight: "600" },

  // Insight pills
  insightRow:  { flexDirection: "row", gap: 7, marginBottom: 16 },
  insightPill: { flex: 1, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 10, alignItems: "center", gap: 3 },
  insightLbl:  { fontSize: 9, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  insightVal:  { fontSize: 12, fontWeight: "900", fontFamily: F.display },

  // Line chart
  lineLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, marginBottom: 16 },
  lineLbl:    { fontSize: 9, color: C.muted, fontWeight: "700" },

  // Table
  tableRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  tableMonthBox:   { width: 48 },
  tableMonth:      { fontSize: 12, color: C.muted, fontWeight: "700" },
  tableVal:        { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "900" },
  tableOrderBadge: { backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tableOrders:     { fontSize: 10, color: C.muted, fontWeight: "700" },

  // Lollipop
  lolItem:      { marginBottom: 12 },
  lolHeader:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  lolRankBadge: { width: 26, height: 22, borderRadius: 7, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  lolRankTxt:   { fontSize: 11, fontWeight: "700", color: C.muted },
  lolLabel:     { flex: 1, fontSize: 12.5, fontWeight: "700", color: C.ink },
  lolVal:       { fontSize: 13, fontWeight: "900", fontFamily: F.mono },
  lolTrack:     { height: 9, borderRadius: 20, backgroundColor: C.surface, overflow: "hidden" },
  lolFill:      { height: 9, borderRadius: 20 },

  loadWrap: { paddingVertical: 16, alignItems: "center" },
  errorTxt: { color: C.danger, fontWeight: "600", marginTop: 8, fontSize: 13 },
});

export default Dashboard;