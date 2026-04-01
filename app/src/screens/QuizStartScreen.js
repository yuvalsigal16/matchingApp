import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QuizStartScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>שאלון היכרות</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.imagePlaceholder}>
          <Text>🤝</Text>
        </View>
        <Text style={styles.mainText}>בוא נכיר אותך!</Text>
      </View>

      <TouchableOpacity
        style={styles.quizButton}
        onPress={() => navigation.navigate('Quiz')}      >
        <Text style={styles.buttonText}>לתחילת השאלון</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E7E9', alignItems: 'center', justifyContent: 'space-around' },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 20 },
  content: { alignItems: 'center' },
  imagePlaceholder: { width: 150, height: 150, backgroundColor: '#fff', borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  mainText: { fontSize: 24, fontWeight: 'bold' },
  quizButton: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, borderWidth: 1, borderColor: '#1A3C40' },
  buttonText: { fontSize: 18, color: '#1A3C40', fontWeight: 'bold' },
});

export default QuizStartScreen;
