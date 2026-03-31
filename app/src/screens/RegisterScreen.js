import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const RegisterScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ברוכים הבאים</Text>
        <Text style={styles.subtitle}>בואו נמצא את ההתאמה המושלמת בשבילכם</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="שם משתמש" placeholderTextColor="#888" />
        <TextInput style={styles.input} placeholder="סיסמה" placeholderTextColor="#888" secureTextEntry={true} />
        <TextInput style={styles.input} placeholder="אימייל" placeholderTextColor="#888" keyboardType="email-address" />
      </View>

      <TouchableOpacity 
        style={styles.registerButton}
        onPress={() => navigation.navigate('QuizStart')}
      >
        <Text style={styles.buttonText}>הירשם</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E7E9', alignItems: 'center', paddingTop: 50 },
  header: { alignItems: 'center', marginBottom: 40, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#000', marginBottom: 10 },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#444' },
  inputContainer: { width: '85%', gap: 15 },
  input: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
    textAlign: 'right',
    fontSize: 16,
  },
  registerButton: {
    marginTop: 30,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#1A3C40',
  },
  buttonText: { fontSize: 18, color: '#1A3C40', fontWeight: 'bold' },
});

export default RegisterScreen;