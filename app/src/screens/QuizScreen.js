import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONTS } from "../theme/fonts";

const QUESTIONS = [
  { 
    id: 'bio', 
    title: 'קצת על עצמי', 
    type: 'fields', 
    fields: [{key: 'name', label: 'שם מלא'}, {key: 'age', label: 'גיל'}, {key: 'gender', label: 'מגדר'}, {key: 'city', label: 'מקום מגורים'}], 
    progress: 5 
  },
  { 
    id: 'interests', 
    title: 'תחומי עניין של טיול מושלם', 
    type: 'multi-select', 
    options: ['אקסטרים', 'טבע', 'תרבות', 'קולינריה', 'שופינג', 'בטן גב', 'מוזיקה', 'מסיבות'], 
    progress: 15 
  },
  { 
    id: 'smoking', 
    title: 'מעשן?', 
    type: 'single-select', 
    options: ['מעשן/ת 🚬', 'לא מעשן/ת 🚭'], 
    progress: 25 
  },
  { 
    id: 'religion', 
    title: 'מסורת ואורח חיים', 
    type: 'yes-no-list', 
    options: [{key: 'shabbat', label: 'שומר/ת שבת? 🕯️'}, {key: 'kosher', label: 'שומר/ת כשרות? ✡️'}], 
    progress: 40 
  },
  { 
    id: 'spontaneous', 
    title: 'כמה אני ספונטני?', 
    type: 'rating', 
    labels: ['אולי בפעם אחרת', 'מי טס מחר?'], 
    progress: 60 
  },
  { 
    id: 'lifestyle', 
    title: 'אורח החיים שלי בטיול', 
    type: 'rating', 
    labels: ['פשוט', 'יוקרתי'], 
    progress: 80 
  },
  { 
    id: 'social', 
    title: 'אפשר למצוא אותי ב:', 
    type: 'social-links', 
    progress: 100 
  }
];


export default function QuizScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentQ = QUESTIONS[step];

  const handleNext = () => {
  if (step < QUESTIONS.length - 1) {
    setStep(step + 1);
  } else {
    // במקום alert רגיל, נעבור למסך הבא לפי הסקיצה
    navigation.navigate('PreferencesQuiz'); 
  }
};

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  // פונקציה לעדכון תשובה ושמירה על הקיים
  const updateAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const renderQuestionContent = () => {
    switch (currentQ.type) {
      case 'fields':
        return currentQ.fields.map(f => (
          <TextInput 
            key={f.key} 
            style={styles.input} 
            placeholder={f.label} 
            placeholderTextColor="#888"
            textAlign="right"
            onChangeText={(val) => updateAnswer(f.key, val)}
            value={answers[f.key] || ''} // מחזיר את הערך שנשמר
          />
        ));

      case 'multi-select':
      case 'single-select':
        return (
          <View style={styles.optionsContainer}>
            {currentQ.options.map(opt => {
              const currentVal = answers[currentQ.id] || [];
              const isSelected = currentVal.includes(opt);
              return (
                <TouchableOpacity 
                  key={opt} 
                  style={[styles.optionBtn, isSelected && styles.selectedBtn]}
                  onPress={() => {
                    if (currentQ.type === 'single-select') {
                      updateAnswer(currentQ.id, [opt]);
                    } else {
                      const newList = isSelected 
                        ? currentVal.filter(i => i !== opt) 
                        : [...currentVal, opt];
                      updateAnswer(currentQ.id, newList);
                    }
                  }}
                >
                  <Text style={[styles.optionText, isSelected && styles.selectedText]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'yes-no-list':
        return currentQ.options.map(item => (
          <View key={item.key} style={styles.yesNoContainer}>
            <Text style={styles.yesNoLabel}>{item.label}</Text>
            <View style={styles.yesNoButtonsRow}>
              {['כן', 'לא'].map(val => (
                <TouchableOpacity 
                  key={val}
                  style={[styles.smallOptionBtn, answers[item.key] === val && styles.selectedBtn]}
                  onPress={() => updateAnswer(item.key, val)}
                >
                  <Text style={[styles.optionText, answers[item.key] === val && styles.selectedText]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ));

      case 'rating':
        return (
          <View style={styles.ratingWrapper}>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(num => (
                <TouchableOpacity 
                  key={num} 
                  style={[styles.rateCircle, answers[currentQ.id] === num && styles.selectedRate]}
                  onPress={() => updateAnswer(currentQ.id, num)}
                >
                  <Text style={[styles.rateText, answers[currentQ.id] === num && styles.selectedText]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.subText}>{currentQ.labels[0]}</Text>
              <Text style={styles.subText}>{currentQ.labels[1]}</Text>
            </View>
          </View>
        );

      case 'social-links':
        return (
          <View style={styles.socialContainer}>
            <View style={styles.socialInputRow}>
              <View style={styles.iconPlaceholder}><Text style={{fontSize: 24}}>📸</Text></View>
              <TextInput 
                style={styles.socialInput} 
                placeholder="@username (Instagram)" 
                placeholderTextColor="#888"
                onChangeText={(val) => updateAnswer('instagram', val)}
                value={answers['instagram'] || ''}
              />
            </View>
            <View style={styles.socialInputRow}>
              <View style={styles.iconPlaceholder}><Text style={{fontSize: 24}}>👤</Text></View>
              <TextInput 
                style={styles.socialInput} 
                placeholder="/username (Facebook)" 
                placeholderTextColor="#888"
                onChangeText={(val) => updateAnswer('facebook', val)}
                value={answers['facebook'] || ''}
              />
            </View>
            <Text style={styles.disclaimerText}>
              הפרטים יוצגו למשתמשים מתאימים בלבד ובהתאם למדיניות הפרטיות
            </Text>
          </View>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressHeader}>
        <View style={styles.circleProgress}>
          <Text style={styles.progressTxt}>{currentQ.progress}%</Text>
        </View>
      </View>

      <Text style={styles.title}>{currentQ.title}</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {renderQuestionContent()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{step === QUESTIONS.length - 1 ? 'סיום' : 'נמשיך הלאה?'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backLink}>חזרה לאחור</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E7E9', alignItems: 'center' },
  progressHeader: { marginTop: 20, marginBottom: 10 },
  circleProgress: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#1A3C40', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  progressTxt: { fontFamily: FONTS.bold, fontSize: 18, color: '#1A3C40' },
  title: { fontSize: 26, fontFamily: FONTS.extraBold, marginTop: 20, marginBottom: 30, textAlign: 'center', paddingHorizontal: 20, color: '#333' },
  scrollView: { width: '100%' },
  scrollArea: { alignItems: 'center', paddingHorizontal: 25, paddingBottom: 40 },
  input: { backgroundColor: '#fff', width: '100%', paddingVertical: 18, paddingHorizontal: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#BDC3C7', fontSize: 16, fontFamily: FONTS.regular, textAlign: 'right' },
  optionsContainer: { width: '100%', alignItems: 'center' },
  optionBtn: { backgroundColor: '#fff', width: '100%', paddingVertical: 18, borderRadius: 15, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7', elevation: 2 },
  // סגנון חדש לכפתורי כן/לא
  yesNoContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#BDC3C7', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  yesNoLabel: { fontSize: 18, fontFamily: FONTS.regular, color: '#333' },
  yesNoButtonsRow: { flexDirection: 'row', gap: 10 },
  smallOptionBtn: { backgroundColor: '#f9f9f9', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#BDC3C7' },
  selectedBtn: { backgroundColor: '#1A3C40', borderColor: '#1A3C40' },
  optionText: { fontSize: 18, fontFamily: FONTS.regular, color: '#333' },
  selectedText: { color: '#fff', fontFamily: FONTS.extraBold },
  ratingWrapper: { alignItems: 'center', width: '100%', marginTop: 20 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  rateCircle: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BDC3C7' },
  rateText: { fontSize: 18, fontFamily: FONTS.regular, color: '#000' },
  selectedRate: { backgroundColor: '#1A3C40', borderColor: '#1A3C40' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginTop: 15 },
  subText: { fontSize: 14, color: '#666', fontFamily: FONTS.bold },
  socialContainer: { width: '100%', alignItems: 'center' },
  socialInputRow: { flexDirection: 'row-reverse', width: '100%', backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, alignItems: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: '#BDC3C7' },
  iconPlaceholder: { padding: 10 },
  socialInput: { flex: 1, paddingVertical: 18, fontSize: 16, fontFamily: FONTS.regular, textAlign: 'right', color: '#333' },
  disclaimerText: { fontSize: 12, fontFamily: FONTS.regular, color: '#777', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  footer: { width: '100%', alignItems: 'center', paddingVertical: 20, backgroundColor: '#E0E7E9' },
  nextBtn: { backgroundColor: '#fff', paddingVertical: 15, width: '70%', borderRadius: 30, borderWidth: 1.5, borderColor: '#1A3C40', alignItems: 'center', marginBottom: 10 },
  nextBtnText: { fontFamily: FONTS.bold, fontSize: 18, color: '#1A3C40' },
  backBtn: { padding: 5 },
  backLink: { textDecorationLine: 'underline', color: '#777', fontSize: 16, fontFamily: FONTS.regular }
});