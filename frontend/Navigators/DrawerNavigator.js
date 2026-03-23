import React, { useContext, useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDrawerNavigator, DrawerContentScrollView } from "@react-navigation/drawer";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, G } from "react-native-svg";

import HomeNavigator    from "./HomeNavigator";
import CartNavigator    from "./CartNavigator";
import UserNavigator    from "./UserNavigator";
import { AdminNavigator } from "./AdminNavigator";
import Dashboard        from "../Screens/Admin/Dashboard";
import Products         from "../Screens/Admin/Products";
import ProductForm      from "../Screens/Admin/ProductForm";
import Categories       from "../Screens/Admin/Categories";
import Orders           from "../Screens/Admin/Orders";
import Users            from "../Screens/Admin/Users";
import Reviews          from "../Screens/Admin/Reviews";
import Promotions       from "../Screens/Admin/Promotions";
import PromotionForm    from "../Screens/Admin/PromotionForm";
import PromotionDetails from "../Screens/User/PromotionDetails";
import UserProfile      from "../Screens/User/UserProfile";
import EditProfile      from "../Screens/User/EditProfile";
import MyOrders         from "../Screens/User/MyOrders";
import MyReviews        from "../Screens/User/MyReviews";
import ChangePassword   from "../Screens/User/ChangePassword";
import AuthGlobal       from "../Context/Store/AuthGlobal";
import { logoutUser }   from "../Context/Actions/Auth.actions";

const Drawer = createDrawerNavigator();

const FALLBACK_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#FFFAF6",
  white:        "#FFFFFF",
  ink:          "#18120C",
  primary:      "#F4821F",
  primaryDark:  "#B85E0E",
  primaryLight: "#FEF0E3",
  gold:         "#F5C842",
  muted:        "#9A8A7A",
  border:       "#EDE5DC",
  surface:      "#F7F2EC",
};

const F = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  sans:  Platform.select({ ios: "System",  android: "sans-serif", default: "sans-serif" }),
};

const STATUS_BAR_H = Platform.OS === "ios" ? 54 : 38;

// ─────────────────────────────────────────────────────────────────────────────
// LOGO MARK  — book icon built from SVG primitives (no image dependency)
// ─────────────────────────────────────────────────────────────────────────────
const BookLogo = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28">
    {/* Book cover */}
    <Path
      d="M5 3 C5 3 5 3 14 3 C23 3 23 3 23 3 L23 25 C23 25 23 25 14 25 C5 25 5 25 5 25 Z"
      fill="#FFF"
      opacity={0.22}
    />
    {/* Spine */}
    <Path d="M5 3 L5 25" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
    {/* Pages lines */}
    <Path d="M9 9 L20 9"  stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" opacity={0.85} />
    <Path d="M9 13 L20 13" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" opacity={0.85} />
    <Path d="M9 17 L16 17" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" opacity={0.7} />
    {/* Cover border */}
    <Path
      d="M5 3 L23 3 L23 25 L5 25"
      stroke="#FFF"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.7}
    />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE → ICON MAP
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_ICON = {
  "Home":            "home",
  "Shop":            "book",
  "Cart":            "cart",
  "Products":        "cube",
  "Orders":          "receipt",
  "Genres":          "library",
  "Users":           "people",
  "Reviews":         "chatbubble-ellipses",
  "Promotions":      "megaphone",
  "User Profile":    "person-circle",
  "Edit Profile":    "pencil",
  "My Orders":       "receipt",
  "My Reviews":      "star",
  "Change Password": "lock-closed",
};

const ROUTE_ICON_OUT = {
  "Home":            "home-outline",
  "Shop":            "book-outline",
  "Cart":            "cart-outline",
  "Products":        "cube-outline",
  "Orders":          "receipt-outline",
  "Genres":          "library-outline",
  "Users":           "people-outline",
  "Reviews":         "chatbubble-ellipses-outline",
  "Promotions":      "megaphone-outline",
  "User Profile":    "person-circle-outline",
  "Edit Profile":    "pencil-outline",
  "My Orders":       "receipt-outline",
  "My Reviews":      "star-outline",
  "Change Password": "lock-closed-outline",
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────────────────────
const NavItem = ({ route, focused, label, onPress, badge, index }) => {
  const scale  = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(-20)).current;
  const op     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op,     { toValue: 1, duration: 340, delay: 60 + index * 50, useNativeDriver: true }),
      Animated.spring(slideX, { toValue: 0, delay: 60 + index * 50, damping: 18, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, []);

  const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, damping: 14 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1.0,  useNativeDriver: true, damping: 14 }).start();

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateX: slideX }, { scale }], marginBottom: 6 }}>
      <TouchableOpacity
        style={[ni.item, focused && ni.itemOn]}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        activeOpacity={1}
      >
        {focused && <View style={ni.bar} />}

        <View style={[ni.iconWrap, focused && ni.iconWrapOn]}>
          <Ionicons
            name={focused ? ROUTE_ICON[route.name] : ROUTE_ICON_OUT[route.name]}
            size={17}
            color={focused ? "#FFF" : C.muted}
          />
        </View>

        <Text style={[ni.label, focused && ni.labelOn]}>{label}</Text>

        {badge > 0 && (
          <View style={ni.badge}>
            <Text style={ni.badgeTxt}>{badge > 99 ? "99+" : badge}</Text>
          </View>
        )}

        {focused && <Ionicons name="chevron-forward" size={13} color={C.primary} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const ni = StyleSheet.create({
  item:      { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  itemOn:    { backgroundColor: C.primaryLight, borderColor: C.primary },
  bar:       { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.primary, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  iconWrap:  { width: 34, height: 34, borderRadius: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  iconWrapOn:{ backgroundColor: C.primary },
  label:     { flex: 1, fontSize: 14, fontWeight: "700", color: C.ink },
  labelOn:   { color: C.primaryDark, fontWeight: "800" },
  badge:     { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.primary, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  badgeTxt:  { color: "#FFF", fontSize: 10, fontWeight: "900" },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION LABEL
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ label }) => (
  <View style={sl.row}>
    <Text style={sl.txt}>{label}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 8, paddingHorizontal: 2 },
  txt:  { fontSize: 9, fontWeight: "900", color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 },
  line: { flex: 1, height: 1, backgroundColor: C.border },
});

// ─────────────────────────────────────────────────────────────────────────────
// BRAND HEADER  — used by both authenticated and guest drawers
// Rendered OUTSIDE the ScrollView so it's not inside any scrollable container
// — this eliminates the visible "box edge" gap at the top
// ─────────────────────────────────────────────────────────────────────────────
const DrawerHero = ({ avatarUri, userName, userEmail, cartUnits, avatarScale, op }) => (
  <Animated.View style={[hero.wrap, { opacity: op }]}>
    <LinearGradient
      colors={[C.primary, C.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={hero.grad}
    >
      {/* Decorative circles */}
      <View style={[hero.circle, { width: 160, height: 160, top: -60, right: -40 }]} />
      <View style={[hero.circle, { width: 90,  height: 90,  bottom: -30, left: 10 }]} />

      {/* Brand row */}
      <View style={hero.brandRow}>
        {/* Logo mark */}
        <View style={hero.logoCircle}>
          <BookLogo size={22} />
        </View>
        {/* Brand name */}
        <View style={hero.brandTextWrap}>
          <Text style={hero.brandName}>PageTurner</Text>
          <Text style={hero.brandTagline}>Your bookstore</Text>
        </View>
      </View>

      {/* Avatar */}
      <Animated.View style={[hero.avatarOuter, { transform: [{ scale: avatarScale }] }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0.15)"]}
          style={hero.avatarRing}
        >
          <Image source={{ uri: avatarUri }} style={hero.avatar} />
        </LinearGradient>
        <View style={hero.onlineDot} />
      </Animated.View>

      {/* Name + email */}
      <Text style={hero.name} numberOfLines={1}>{userName}</Text>
      {userEmail ? <Text style={hero.email} numberOfLines={1}>{userEmail}</Text> : null}

      {/* Cart strip */}
      {cartUnits > 0 && (
        <View style={hero.cartStrip}>
          <Ionicons name="cart" size={12} color={C.primary} />
          <Text style={hero.cartTxt}>{cartUnits} item{cartUnits !== 1 ? "s" : ""} in cart</Text>
        </View>
      )}
    </LinearGradient>
  </Animated.View>
);

const HERO_PT = STATUS_BAR_H + 14;

const hero = StyleSheet.create({
  wrap:   { overflow: "hidden" },       // no border radius — bleeds edge to edge, no box gap
  grad:   {
    paddingTop:    HERO_PT,
    paddingBottom: 24,
    paddingHorizontal: 18,
    alignItems:    "flex-start",
  },
  circle: { position: "absolute", borderRadius: 999, backgroundColor: "#FFF", opacity: 0.09 },

  brandRow:      { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  logoCircle:    { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  brandTextWrap: { gap: 0 },
  brandName:     { fontSize: 17, fontWeight: "900", fontFamily: F.serif, color: "#FFF", letterSpacing: 0.3 },
  brandTagline:  { fontSize: 9, color: "rgba(255,255,255,0.65)", fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },

  avatarOuter:   { position: "relative", marginBottom: 12, alignSelf: "center" },
  avatarRing:    { width: 80, height: 80, borderRadius: 40, padding: 3, alignItems: "center", justifyContent: "center" },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: C.border },
  onlineDot:     { position: "absolute", bottom: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: "#22C55E", borderWidth: 2.5, borderColor: C.primaryDark },

  name:     { fontSize: 18, fontWeight: "900", fontFamily: F.serif, color: "#FFF", alignSelf: "center", letterSpacing: 0.2 },
  email:    { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 2, alignSelf: "center" },

  cartStrip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "center", marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  cartTxt:  { fontSize: 12, fontWeight: "800", color: "#FFF" },
});

// ─────────────────────────────────────────────────────────────────────────────
// GUEST HERO
// ─────────────────────────────────────────────────────────────────────────────
const GuestHero = () => (
  <View style={{ overflow: "hidden" }}>
    <LinearGradient
      colors={[C.primary, C.primaryDark]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[hero.grad, { alignItems: "center" }]}
    >
      <View style={[hero.circle, { width: 160, height: 160, top: -60, right: -40 }]} />
      <View style={[hero.circle, { width: 90, height: 90, bottom: -30, left: 10 }]} />

      {/* Brand */}
      <View style={[hero.brandRow, { alignSelf: "center", marginBottom: 24 }]}>
        <View style={hero.logoCircle}><BookLogo size={22} /></View>
        <View style={hero.brandTextWrap}>
          <Text style={hero.brandName}>PageTurner</Text>
          <Text style={hero.brandTagline}>Your bookstore</Text>
        </View>
      </View>

      <Text style={[hero.name, { fontSize: 20, marginBottom: 6 }]}>Welcome!</Text>
      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "600", textAlign: "center" }}>
        Sign in to access your account
      </Text>
    </LinearGradient>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT BUTTON (pinned bottom)
// ─────────────────────────────────────────────────────────────────────────────
const SignOutBtn = ({ onPress }) => (
  <View style={so.wrap}>
    <TouchableOpacity style={so.btn} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="log-out-outline" size={16} color={C.primaryDark} />
      <Text style={so.txt}>Sign Out</Text>
    </TouchableOpacity>
    <View style={so.footer}>
      <View style={so.dot} />
      <Text style={so.footerTxt}>PageTurner Shop v1.0</Text>
    </View>
  </View>
);

const so = StyleSheet.create({
  wrap:      { paddingHorizontal: 14, paddingBottom: Platform.OS === "ios" ? 28 : 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  btn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.primary, borderRadius: 14, paddingVertical: 12 },
  txt:       { fontSize: 13, fontWeight: "800", color: C.primaryDark },
  footer:    { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 10 },
  dot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary, opacity: 0.5 },
  footerTxt: { fontSize: 11, color: C.muted, fontWeight: "600" },
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATED DRAWER CONTENT
// ─────────────────────────────────────────────────────────────────────────────
const DrawerMenu = ({ navigation, state, descriptors, isAdmin, profile, cartUnits, onSignOut }) => {
  const avatarScale = useRef(new Animated.Value(0.82)).current;
  const heroOp      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOp,      { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, damping: 14, stiffness: 160, useNativeDriver: true }),
    ]).start();
  }, []);

  const avatarUri = profile?.avatar || FALLBACK_AVATAR;
  const userName  = profile?.name   || "PageTurner User";
  const userEmail = profile?.email  || "";

  const routes = state.routes.filter((r) => {
    if (r.name === "Profile") return false;
    if (r.name === "Product Form") return false;
    if (r.name === "Promotion Form") return false;
    if (r.name === "Promotion Detail") return false;
    if (isAdmin  && r.name === "Cart") return false;
    if (!isAdmin && ["Products", "Orders", "Genres", "Users", "Reviews", "Promotions"].includes(r.name)) return false;
    return true;
  });

  const mainRoutes  = routes.filter((r) => ["Shop", "Home", "Cart"].includes(r.name));
  const userRoutes  = routes.filter((r) => ["User Profile", "Edit Profile", "My Orders", "My Reviews", "Change Password"].includes(r.name));
  const adminRoutes = routes.filter((r) => ["Products", "Orders", "Genres", "Users", "Reviews", "Promotions"].includes(r.name));

  const renderItem = (route, idx) => {
    const gIdx    = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === gIdx;
    const label   = descriptors[route.key]?.options?.drawerLabel || route.name;
    return (
      <NavItem
        key={route.key}
        route={route}
        focused={focused}
        label={label}
        onPress={() => navigation.navigate(route.name)}
        badge={route.name === "Cart" ? cartUnits : 0}
        index={idx}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Hero — lives OUTSIDE DrawerContentScrollView to avoid box gap */}
      <DrawerHero
        avatarUri={avatarUri}
        userName={userName}
        userEmail={userEmail}
        cartUnits={cartUnits}
        avatarScale={avatarScale}
        op={heroOp}
      />

      {/* Scrollable nav links */}
      <DrawerContentScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 }}
        showsVerticalScrollIndicator={false}
        // Remove the default top inset so no gap appears above our custom hero
        contentInset={{ top: 0 }}
        style={{ flex: 1 }}
      >
        {mainRoutes.length > 0 && (
          <>
            <SectionLabel label="Main" />
            {mainRoutes.map((r, i) => renderItem(r, i))}
          </>
        )}
        {adminRoutes.length > 0 && (
          <>
            <SectionLabel label="Admin" />
            {adminRoutes.map((r, i) => renderItem(r, mainRoutes.length + i))}
          </>
        )}
        {userRoutes.length > 0 && (
          <>
            <SectionLabel label="Account" />
            {userRoutes.map((r, i) => renderItem(r, mainRoutes.length + adminRoutes.length + i))}
          </>
        )}
      </DrawerContentScrollView>

      {/* Sign out — pinned to absolute bottom */}
      <SignOutBtn onPress={onSignOut} />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GUEST DRAWER CONTENT
// ─────────────────────────────────────────────────────────────────────────────
const GuestDrawerMenu = ({ navigation }) => {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(op, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: C.bg, opacity: op }}>
      <GuestHero />

      <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 24, gap: 12 }}>
        <TouchableOpacity
          style={gd.loginBtn}
          onPress={() => navigation.navigate("Profile", { screen: "Login" })}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={18} color="#FFF" />
          <Text style={gd.loginTxt}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={gd.registerBtn}
          onPress={() => navigation.navigate("Profile", { screen: "Register" })}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add-outline" size={18} color={C.primary} />
          <Text style={gd.registerTxt}>Create Account</Text>
        </TouchableOpacity>
      </View>

      <View style={so.footer}>
        <View style={so.dot} />
        <Text style={so.footerTxt}>PageTurner Shop v1.0</Text>
      </View>
    </Animated.View>
  );
};

const gd = StyleSheet.create({
  loginBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 15, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  loginTxt:    { fontSize: 15, fontWeight: "900", color: "#FFF" },
  registerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.white, borderWidth: 2, borderColor: C.primary, borderRadius: 16, paddingVertical: 13 },
  registerTxt: { fontSize: 15, fontWeight: "900", color: C.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// DRAWER NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────
const DrawerNavigator = () => {
  const cartItems       = useSelector((s) => s.cartItems);
  const authContext     = useContext(AuthGlobal);
  const profile         = authContext?.stateUser?.userProfile || {};
  const userPayload     = authContext?.stateUser?.user        || {};
  const isAdmin         = Boolean(profile.isAdmin || userPayload.isAdmin);
  const isAuthenticated = Boolean(authContext?.stateUser?.isAuthenticated);
  const cartUnits       = cartItems.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0);

  const handleSignOut = async () => { await logoutUser(authContext.dispatch); };

  return (
    <Drawer.Navigator
      initialRouteName={isAuthenticated ? (isAdmin ? "Home" : "Shop") : "Shop"}
      screenOptions={{
        headerShown:  false,
        drawerType:   "front",
        overlayColor: "rgba(18,8,2,0.42)",
        drawerStyle: {
          backgroundColor: C.bg,
          width: 300,
          borderTopRightRadius: 28,
          borderBottomRightRadius: 28,
          // Remove any default padding/margin that causes the top gap
          overflow: "hidden",
        },
      }}
      drawerContent={(props) =>
        isAuthenticated ? (
          <DrawerMenu
            {...props}
            isAdmin={isAdmin}
            profile={{ ...profile, ...userPayload }}
            cartUnits={cartUnits}
            onSignOut={handleSignOut}
          />
        ) : (
          <GuestDrawerMenu {...props} />
        )
      }
    >
      {isAdmin ? (
        <Drawer.Screen name="Home" component={Dashboard} options={{ drawerLabel: "Home" }} />
      ) : (
        <Drawer.Screen name="Shop" component={HomeNavigator} options={{ drawerLabel: "Home" }} />
      )}

      {!isAdmin && (
        <Drawer.Screen name="Cart" component={CartNavigator} options={{ drawerLabel: "Cart" }} />
      )}

      <Drawer.Screen name="Edit Profile" component={EditProfile} options={{ drawerLabel: "Edit Profile", headerShown: false }} />
      <Drawer.Screen name="Change Password" component={ChangePassword} options={{ drawerLabel: "Change Password", headerShown: false }} />

      {!isAdmin && (
        <>
          <Drawer.Screen name="User Profile"    component={UserProfile}    options={{ drawerLabel: "User Profile",    headerShown: false }} />
          <Drawer.Screen name="My Orders"       component={MyOrders}       options={{ drawerLabel: "My Orders",       headerShown: false }} />
          <Drawer.Screen name="My Reviews"      component={MyReviews}      options={{ drawerLabel: "My Reviews",      headerShown: false }} />
        </>
      )}

      <Drawer.Screen name="Profile" component={UserNavigator} options={{ drawerLabel: "User Profile" }} />

      {isAdmin && (
        <>
          <Drawer.Screen name="Products" component={Products} options={{ drawerLabel: "Products" }} />
          <Drawer.Screen name="Orders" component={Orders} options={{ drawerLabel: "Orders" }} />
          <Drawer.Screen name="Genres" component={Categories} options={{ drawerLabel: "Genres" }} />
          <Drawer.Screen name="Users" component={Users} options={{ drawerLabel: "Users" }} />
          <Drawer.Screen name="Reviews" component={Reviews} options={{ drawerLabel: "Reviews" }} />
          <Drawer.Screen name="Promotions" component={Promotions} options={{ drawerLabel: "Promotions" }} />
          <Drawer.Screen
            name="Product Form"
            component={ProductForm}
            options={{ drawerItemStyle: { display: "none" } }}
          />
          <Drawer.Screen
            name="Promotion Form"
            component={PromotionForm}
            options={{ drawerItemStyle: { display: "none" } }}
          />
          <Drawer.Screen
            name="Promotion Detail"
            component={PromotionDetails}
            options={{ drawerItemStyle: { display: "none" } }}
          />
        </>
      )}
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;