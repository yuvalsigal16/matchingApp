// שלוש רמות צל אחידות במקום ערכי shadowOpacity/elevation אקראיים בכל מסך.
// כל רמה מגדירה גם iOS (shadow*) וגם Android (elevation).
//
// שימוש:  <View style={[styles.card, SHADOWS.sm]}>

import { COLORS } from "./colors";

export const SHADOWS = {
  // צל עדין - לכרטיסים שטוחים, badges.
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  // צל בינוני - לכרטיסים מורמים, רשימות.
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // צל חזק - ל-FAB, modals, אלמנטים צפים.
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
};
