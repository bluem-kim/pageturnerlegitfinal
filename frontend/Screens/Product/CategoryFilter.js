import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const C = {
  primary:      "#F4821F",
  primaryLight: "#FEF0E3",
  ink:          "#18120C",
  muted:        "#9A8A7A",
  chip:         "#F2EBE3",
  border:       "#EDE5DC",
};

const F = {
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "sans-serif" }),
};

const CategoryFilter = ({ categories, active, onChange }) => {
  const all = [{ id: "all", name: "All" }, ...(categories || [])];

  return (
    <View style={s.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {all.map((item) => {
          const id  = item.id || item._id;
          const on  = active === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => onChange(id)}
              style={[s.chip, on && s.chipOn]}
              activeOpacity={0.75}
            >
              {on && <View style={s.dot} />}
              <Text style={[s.txt, on && s.txtOn]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* decorative gradient fade on right edge */}
      <View style={s.fade} pointerEvents="none" />
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { position: "relative", marginBottom: 8 },
  row: {
    paddingHorizontal: 16, paddingVertical: 8,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: C.chip,
    borderWidth: 1.5, borderColor: "transparent",
  },
  chipOn: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.primary,
  },
  txt: {
    fontSize: 13, fontWeight: "700", color: C.muted,
  },
  txtOn: {
    color: C.primary, fontWeight: "800",
  },
  fade: {
    position: "absolute", top: 0, right: 0, bottom: 0, width: 32,
    // Visual hint that list continues
    backgroundColor: "transparent",
  },
});

export default CategoryFilter;