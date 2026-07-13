// ─────────────────────────────────────────────────────────────────────────────
// אלגוריתם התאמה #4 — "ההתאמה הטובה ביותר" של גלגל המזל.
// חישוב אדיטיבי פשוט (לא מנורמל), חסום ל-100, לבחירת המועמד הבולט להצגה בגלגל.
// חולץ כפי-שהוא מ-Wheel (usersWithScore) — אותו חישוב בדיוק, כולל התנהגותו הקיימת
// (השוואות הבוליאן כאן אינן מסננות null — נשמר כפי שהיה כדי לא לשנות תוצאות).
// ─────────────────────────────────────────────────────────────────────────────

// מחזיר אחוז 0–100 (חסום) להתאמת מועמד יחיד מול המשתמש המחובר.
export function computeWheelMatchScore(me, user) {
  let score = 0;

  if (user.age && me.age) {
    const ageDiff = Math.abs(user.age - me.age);
    if (ageDiff <= 2) score += 20;
    else if (ageDiff <= 5) score += 10;
  }

  const myInterests = (me.interests || []).map((s) => s.toLowerCase());
  const shared = (user.interests || []).filter((i) =>
    myInterests.includes(i.toLowerCase()),
  );
  score += shared.length * 15;

  if (user.isSmoker === me.isSmoker) score += 10;
  if (user.keepsKosher === me.keepsKosher) score += 10;
  if (user.keepsShabbat === me.keepsShabbat) score += 10;

  return Math.min(score, 100);
}
