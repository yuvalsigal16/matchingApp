// סקאלת טיפוגרפיה מרכזית.
// במקום שכל מסך יגדיר fontSize+fontFamily ידנית, משתמשים בסגנונות מוכנים.
// כל סגנון כולל כבר fontFamily, fontSize ו-lineHeight מתואמים.
//
// שימוש:  <Text style={[TYPOGRAPHY.h2, { color: COLORS.brand }]}>
// (הצבע ויישור-טקסט נשארים באחריות המסך, כי הם תלויי-הקשר/RTL.)

import { FONTS } from "./fonts";

export const TYPOGRAPHY = {
  // כותרת ראשית של מסך / לוגו.
  h1: {
    fontFamily: FONTS.extraBold,
    fontSize: 28,
    lineHeight: 36,
  },
  // כותרת מסך רגילה (בכותרת העליונה).
  h2: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    lineHeight: 30,
  },
  // כותרת מקטע / שם בכרטיס.
  h3: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    lineHeight: 24,
  },
  // טקסט גוף רגיל.
  body: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  // טקסט גוף מודגש.
  bodyBold: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 22,
  },
  // טקסט משני קטן (תאריכים, כתוביות עזר).
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  // טקסט זעיר (תוויות BottomNav, hint).
  tiny: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  // טקסט בתוך כפתור ראשי.
  button: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 22,
  },
};
