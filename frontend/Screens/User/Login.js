import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Constants from "expo-constants";

import AuthGlobal from "../../Context/Store/AuthGlobal";
import { loginGoogleUser, loginUser } from "../../Context/Actions/Auth.actions";

const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || "";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

const { width: SW, height: SH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — Warm Ember palette
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:            "#FFF8F2",
  white:         "#FFFFFF",
  ink:           "#1A0F00",
  inkMid:        "#5C3A1E",
  primary:       "#F4821F",
  primaryDark:   "#C45C00",
  primaryDeep:   "#8B3A00",
  primaryLight:  "#FEF0E3",
  primaryGlow:   "#FFB36B",
  amber:         "#FFAA00",
  muted:         "#B08060",
  border:        "#F0E4D4",
  surface:       "#FDF6EE",
  danger:        "#EF4444",
  dangerLight:   "#FEE2E2",
  green:         "#22C55E",
  greenLight:    "#DCFCE7",
  overlay:       "rgba(244,130,31,0.08)",
};

const F = {
  display: Platform.select({ ios: "Georgia", android: "serif",      default: "serif" }),
  body:    Platform.select({ ios: "Avenir",  android: "sans-serif", default: "sans-serif" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOK LOGO
// ─────────────────────────────────────────────────────────────────────────────
const BookLogo = ({ size = 28 }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Path d="M6 4 C6 4 16 4 26 4 L26 28 C26 28 16 28 6 28 Z" fill="#FFF" opacity={0.15} />
    <Path d="M6 4 L6 28" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
    <Path d="M10 11 L23 11" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity={0.95} />
    <Path d="M10 16 L23 16" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity={0.95} />
    <Path d="M10 21 L18 21" stroke="#FFF" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
    <Path d="M6 4 L26 4 L26 28 L6 28" stroke="#FFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE "G" ICON
// ─────────────────────────────────────────────────────────────────────────────
const GoogleIcon = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED FLOATING ORB (decorative background)
// ─────────────────────────────────────────────────────────────────────────────
const FloatingOrb = ({ style, size, delay = 0, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3200, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Animated.View
      style={[
        { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY }] },
        style,
      ]}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGGERED FADE-UP
// ─────────────────────────────────────────────────────────────────────────────
const FadeUp = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, delay, damping: 18, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PULSING BUTTON (for Sign In)
// ─────────────────────────────────────────────────────────────────────────────
const PressableScale = ({ children, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 200 }).start();
  return (
    <TouchableOpacity
      onPressIn={onIn}
      onPressOut={onOut}
      onPress={onPress}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT FIELD
// ─────────────────────────────────────────────────────────────────────────────
const InputField = ({ icon, label, placeholder, value, onChange, secure, keyboardType }) => {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.primary] });
  const bgColor     = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.white] });

  return (
    <View style={inp.container}>
      {!!label && <Text style={inp.label}>{label}</Text>}
      <Animated.View style={[inp.wrap, { borderColor, backgroundColor: bgColor }]}>
        <View style={[inp.iconBox, focused && inp.iconBoxFocus]}>
          <Ionicons name={icon} size={16} color={focused ? C.primary : C.muted} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          secureTextEntry={secure && !visible}
          keyboardType={keyboardType || "default"}
          autoCapitalize="none"
          style={inp.input}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {secure && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} hitSlop={12} style={inp.eye}>
            <Ionicons name={visible ? "eye-outline" : "eye-off-outline"} size={17} color={focused ? C.primary : C.muted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const inp = StyleSheet.create({
  container:    { marginBottom: 14 },
  label:        { fontSize: 11, fontWeight: "700", color: C.inkMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginLeft: 2 },
  wrap:         { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, height: 56, paddingHorizontal: 8, gap: 6 },
  iconBox:      { width: 38, height: 38, borderRadius: 12, backgroundColor: C.overlay, alignItems: "center", justifyContent: "center" },
  iconBoxFocus: { backgroundColor: C.primaryLight },
  input:        { flex: 1, fontSize: 15, color: C.ink, fontFamily: F.body, fontWeight: "500", letterSpacing: 0.1 },
  eye:          { paddingHorizontal: 8 },
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const Login = ({ navigation }) => {
  const context  = useContext(AuthGlobal);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);

  // Shimmer on header icon
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  useEffect(() => {
    if (context?.stateUser?.isAuthenticated) {
      setSuccess("Login successful. Redirecting...");
      const t = setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "User Profile" }] });
        const isAdmin = context?.stateUser?.userProfile?.isAdmin || context?.stateUser?.user?.isAdmin;
        navigation.getParent()?.navigate(isAdmin ? "Home" : "Shop");
      }, 900);
      return () => clearTimeout(t);
    }
  }, [context?.stateUser?.isAuthenticated, navigation]);

  const handleSubmit = async () => {
    if (!email || !password) { setSuccess(""); setError("Please fill in your credentials"); return; }
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await loginUser({ email, password }, context.dispatch);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(""); setSuccess("");
    if (!GOOGLE_WEB_CLIENT_ID) { setError("Google login is not configured"); return; }
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google Sign-In");
      }
      loginGoogleUser(idToken, context.dispatch);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError("Sign-in in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Play Services not available");
      } else if (error.code === "10") {
        setError("Google Sign-In Error (10): SHA-1 Fingerprint mismatch. Your local debug key doesn't match the one in Firebase Console.");
      } else {
        setError(error.message || "Google login failed");
      }
    }
  };

  return (
    <View style={s.screen}>

      {/* ── HERO HEADER ── */}
      <LinearGradient
        colors={[C.primaryDeep, C.primaryDark, C.primary, C.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.2 }}
        style={s.hero}
      >
        {/* Decorative floating orbs */}
        <FloatingOrb size={160} color="rgba(255,255,255,0.07)" style={{ top: -50, right: -40 }} delay={0} />
        <FloatingOrb size={90}  color="rgba(255,255,255,0.10)" style={{ bottom: 30, left: -30 }}  delay={600} />
        <FloatingOrb size={50}  color="rgba(255,200,80,0.18)"  style={{ top: 60, right: 60 }}     delay={1200} />

        {/* Top nav */}
        <View style={s.heroNav}>
          <View style={s.brandRow}>
            <Animated.View style={[s.logoRing, { opacity: shimmerOpacity }]}>
              <BookLogo size={22} />
            </Animated.View>
            <View>
              <Text style={s.brandName}>PageTurner</Text>
              <Text style={s.brandTagline}>Your bookstore</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.toggleDrawer()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.menuBtn}
          >
            <Ionicons name="menu" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Headline */}
        <FadeUp delay={0}>
          <Text style={s.heroEyebrow}>Good to see you</Text>
          <Text style={s.heroTitle}>Welcome{"\n"}Back</Text>
          <View style={s.heroAccent} />
        </FadeUp>
      </LinearGradient>

      {/* ── FORM AREA ── */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card lifted above hero */}
          <FadeUp delay={100} style={s.card}>

            <Text style={s.cardTitle}>Sign in to your account</Text>

            <InputField
              icon="mail-outline"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              keyboardType="email-address"
            />
            <InputField
              icon="lock-closed-outline"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              secure
            />

            {/* Forgot password */}
            <TouchableOpacity 
              style={s.forgotRow} 
              hitSlop={8} 
              onPress={() => navigation.navigate("Forgot Password")}
            >
              <Text style={s.forgotTxt}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Banners */}
            {!!error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={15} color={C.danger} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}
            {!!success && (
              <View style={s.successBanner}>
                <Ionicons name="checkmark-circle" size={15} color={C.green} />
                <Text style={s.successTxt}>{success}</Text>
              </View>
            )}

            {/* Sign In */}
            <PressableScale onPress={handleSubmit} style={s.loginBtn}>
              <LinearGradient
                colors={[C.primaryGlow, C.primary, C.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.loginBtnGradient}
              >
                <Text style={s.loginBtnTxt}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </PressableScale>

            {/* Divider */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>or</Text>
              <View style={s.divLine} />
            </View>

            {/* Google */}
            <TouchableOpacity style={s.googleBtn} onPress={handleGoogleLogin}>
              <GoogleIcon size={20} />
              <Text style={s.googleBtnTxt}>Continue with Google</Text>
            </TouchableOpacity>
          </FadeUp>

          {/* Register row */}
          <FadeUp delay={200} style={s.footer}>
            <Text style={s.footerLabel}>New to PageTurner?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              style={s.registerBtn}
              activeOpacity={0.82}
            >
              <Text style={s.registerBtnTxt}>Create Account</Text>
              <Ionicons name="chevron-forward" size={14} color={C.primary} />
            </TouchableOpacity>
          </FadeUp>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const CARD_OFFSET = 0; // how much card overlaps the hero

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // ── Hero ──
  hero: {
    paddingTop:        Platform.OS === "ios" ? 62 : 46,
    paddingBottom:     40,
    paddingHorizontal: 24,
    overflow:          "hidden",
  },
  heroNav:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  brandRow:    { flexDirection: "row", alignItems: "center", gap: 12 },
  logoRing:    { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  brandName:   { fontSize: 17, fontWeight: "900", fontFamily: F.display, color: "#FFF", letterSpacing: 0.2 },
  brandTagline:{ fontSize: 9.5, color: "rgba(255,255,255,0.6)", fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  menuBtn:     { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  heroEyebrow: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 },
  heroTitle:   { fontSize: 46, fontWeight: "900", fontFamily: F.display, color: "#FFF", lineHeight: 50, letterSpacing: -0.5 },
  heroAccent:  { width: 44, height: 4, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.55)", marginTop: 14 },

  // ── Scroll / Card ──
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16, paddingBottom: 28 },

  card: {
    backgroundColor:  C.white,
    borderRadius:     28,
    padding:          24,
    marginTop:        24,
    shadowColor:      C.primaryDark,
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.13,
    shadowRadius:     24,
    elevation:        10,
    borderWidth:      1,
    borderColor:      C.border,
    marginBottom:     14,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: C.ink, fontFamily: F.display, marginBottom: 22, letterSpacing: 0.1 },

  // Forgot
  forgotRow: { alignSelf: "flex-end", marginBottom: 16, marginTop: -4 },
  forgotTxt: { fontSize: 12.5, color: C.primary, fontWeight: "700" },

  // Banners
  errorBanner:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.dangerLight, borderWidth: 1, borderColor: C.danger, borderRadius: 14, padding: 12, marginBottom: 14 },
  errorTxt:      { flex: 1, fontSize: 13, color: C.danger, fontWeight: "600" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenLight, borderWidth: 1, borderColor: C.green, borderRadius: 14, padding: 12, marginBottom: 14 },
  successTxt:    { flex: 1, fontSize: 13, color: C.green, fontWeight: "600" },

  // Sign In
  loginBtn:          { borderRadius: 18, overflow: "hidden", marginBottom: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.42, shadowRadius: 14, elevation: 8 },
  loginBtnGradient:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17 },
  loginBtnTxt:       { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.4 },

  // Divider
  divRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divTxt:  { fontSize: 12, color: C.muted, fontWeight: "600", letterSpacing: 0.5 },

  // Google
  googleBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 18, paddingVertical: 15 },
  googleBtnTxt: { fontSize: 14.5, fontWeight: "700", color: C.ink, letterSpacing: 0.1 },

  // Footer / Register
  footer:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 20, paddingVertical: 16 },
  footerLabel:  { fontSize: 13.5, color: C.inkMid, fontWeight: "600" },
  registerBtn:  { flexDirection: "row", alignItems: "center", gap: 4 },
  registerBtnTxt:{ fontSize: 14, fontWeight: "800", color: C.primary },
});

export default Login;