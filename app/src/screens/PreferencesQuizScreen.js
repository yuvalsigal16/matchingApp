import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INTEREST_OPTIONS = ['אקסטרים', 'טבע', 'תרבות', 'קולינריה', 'שופינג', 'בטן גב', 'מוזיקה', 'מסיבות'];

export default function PreferencesQuizScreen({ navigation }) {
  const [prefStep, setPrefStep] = useState(1);
  const [tripData, setTripData] = useState({
    tripName: '',
    destination: '',
    startDate: '',
    endDate: '',
    recommendPeriod: false,
    preferredGender: '',
    ageRange: 25,
    interests: []
  });

  const nextStep = () => {
    if (prefStep === 2 && !tripData.destination.trim()) {
      alert('חובה להזין יעד לטיול!');
      return;
    }
    setPrefStep(prev => prev + 1);
  };

  const prevStep = () => setPrefStep(prev => (prev > 1 ? prev - 1 : 1));

  const toggleInterest = (interest) => {
    const current = tripData.interests;
    const newList = current.includes(interest) 
      ? current.filter(i => i !== interest) 
      : [...current, interest];
    setTripData({...tripData, interests: newList});
  };

  const renderStepContent = () => {
    switch (prefStep) {
      case 1:
        return (
          <View style={styles.centerContent}>
            <Text style={styles.mainTitle}>שאלון העדפות טיול</Text>
            <View style={styles.imagePlaceholder}><Text style={{fontSize: 80}}>🌍</Text></View>
            <Text style={styles.subTitle}>בוא נתכנן את הטיול המשלם שלך!</Text>
            <TouchableOpacity style={styles.bigBtn} onPress={nextStep}>
              <Text style={styles.bigBtnText}>לתחילת השאלון</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.label}>שם הטיול שלי:</Text>
            <TextInput 
              style={styles.input} 
              placeholder="למשל: טיול שחרור לתאילנד" 
              textAlign="right"
              onChangeText={(val) => setTripData({...tripData, tripName: val})}
              value={tripData.tripName}
            />
            
            <Text style={styles.sectionLabel}>הקווים הכלליים של החופשה</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="יעד (חובה)" 
              textAlign="right" 
              onChangeText={(val) => setTripData({...tripData, destination: val})}
              value={tripData.destination}
            />

            <TextInput 
              style={styles.input} 
              placeholder="תאריך יציאה (DD/MM/YY)" 
              textAlign="right"
              onChangeText={(val) => setTripData({...tripData, startDate: val})}
              value={tripData.startDate}
            />

            <TextInput 
              style={styles.input} 
              placeholder="תאריך חזרה (DD/MM/YY)" 
              textAlign="right"
              onChangeText={(val) => setTripData({...tripData, endDate: val})}
              value={tripData.endDate}
            />

            <TouchableOpacity 
              style={styles.checkboxRow} 
              onPress={() => setTripData({...tripData, recommendPeriod: !tripData.recommendPeriod})}
            >
              <Text style={{marginRight: 10, fontSize: 16}}>תמליץ לי על תקופה טובה לטיסה</Text>
              <View style={[styles.miniSquare, tripData.recommendPeriod && styles.checkedSquare]}>
                {tripData.recommendPeriod && <Text style={{color: '#fff', fontSize: 14}}>✓</Text>}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>בוא נבחר פרטנר</Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.formContainer}>
            <Text style={styles.stepTitle}>הפרטנר המושלם עבורי</Text>
            
            <Text style={styles.label}>מגדר מועדף:</Text>
            <View style={styles.genderRow}>
              {['גבר', 'אישה', 'הכל'].map(g => (
                <TouchableOpacity 
                  key={g}
                  style={[styles.smallBtn, tripData.preferredGender === g && styles.selectedBtn]}
                  onPress={() => setTripData({...tripData, preferredGender: g})}
                >
                  <Text style={[styles.optionText, tripData.preferredGender === g && styles.selectedText]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>גיל מועדף: {tripData.ageRange}</Text>
            <View style={styles.sliderLine}>
              <View style={[styles.sliderDot, { left: `${(tripData.ageRange - 18) * 1.5}%` }]} />
              <TextInput 
                keyboardType="numeric"
                style={styles.ageInput}
                onChangeText={(val) => setTripData({...tripData, ageRange: val})}
                placeholder="הקלד גיל"
                textAlign="center"
              />
            </View>
            
            <Text style={styles.label}>תחומי עניין:</Text>
            <View style={styles.interestsGrid}>
              {INTEREST_OPTIONS.map(opt => (
                <TouchableOpacity 
                  key={opt} 
                  style={[styles.tag, tripData.interests.includes(opt) && styles.selectedBtn]}
                  onPress={() => toggleInterest(opt)}
                >
                  <Text style={[styles.tagText, tripData.interests.includes(opt) && styles.selectedText]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => alert('עובר לגלגל המזל!')}>
              <Text style={styles.nextBtnText}>מוכנים למצוא התאמות</Text>
            </TouchableOpacity>
          </View>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>{renderStepContent()}</ScrollView>
      {prefStep > 1 && (
        <TouchableOpacity onPress={prevStep} style={styles.backPos}><Text style={styles.backText}>חזרה</Text></TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E7E9' },
  scrollContent: { flexGrow: 1, padding: 20, alignItems: 'center' },
  centerContent: { alignItems: 'center', marginTop: 50 },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A3C40' },
  imagePlaceholder: { marginVertical: 30, width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc' },
  subTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  bigBtn: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, borderWidth: 1.5, borderColor: '#1A3C40' },
  bigBtnText: { fontSize: 18, fontWeight: 'bold' },
  formContainer: { width: '100%', marginTop: 10 },
  sectionLabel: { fontSize: 18, textAlign: 'right', marginBottom: 15, fontWeight: 'bold' },
  label: { textAlign: 'right', fontSize: 16, marginBottom: 8, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ccc', textAlign: 'right' },
  checkboxRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 25, alignSelf: 'flex-end' },
  miniSquare: { width: 24, height: 24, borderWidth: 1, borderColor: '#1A3C40', backgroundColor: '#fff', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  checkedSquare: { backgroundColor: '#1A3C40' },
  nextBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 25, borderWidth: 1.5, borderColor: '#1A3C40', alignItems: 'center' },
  nextBtnText: { fontWeight: 'bold', fontSize: 16 },
  genderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20 },
  smallBtn: { backgroundColor: '#fff', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', width: '30%', alignItems: 'center' },
  selectedBtn: { backgroundColor: '#1A3C40', borderColor: '#1A3C40' },
  optionText: { fontSize: 16 },
  selectedText: { color: '#fff', fontWeight: 'bold' },
  sliderLine: { width: '100%', height: 6, backgroundColor: '#ccc', marginVertical: 20, borderRadius: 3 },
  sliderDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A3C40', position: 'absolute', top: -9 },
  ageInput: { marginTop: 10, fontSize: 16, fontWeight: 'bold' },
  interestsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  tag: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  tagText: { fontSize: 14 },
  backPos: { position: 'absolute', bottom: 30, left: 30 },
  backText: { textDecorationLine: 'underline', color: '#555', fontSize: 16 }
});