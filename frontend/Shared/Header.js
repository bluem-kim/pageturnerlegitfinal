import React from "react";
import { StyleSheet, Text, View } from "react-native";

const Header = ({ title = "PageTurner Shop" }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#101418",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
});

export default Header;