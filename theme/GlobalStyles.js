import { StyleSheet } from "react-native";
import { FONTS } from "./fonts";

export const globalStyles = StyleSheet.create({
  text: {
    fontFamily: FONTS.regular,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
  },
  buttonText: {
    fontFamily: FONTS.bold,
  },
});