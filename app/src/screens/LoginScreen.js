import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const SocialButton = ({ title }) => (
    <TouchableOpacity style={styles.socialButton}>
      <Text style={styles.socialButtonText}>Continue with {title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.signInTitle}>Sign in</Text>
        <Text style={styles.signInSubtitle}>Continue with</Text>
      </View>

      <View style={styles.buttonGroup}>
        <SocialButton title="Facebook" />
        <SocialButton title="Instagram" />
        <SocialButton title="Google" />
        <SocialButton title="Apple" />
      </View>

      <TouchableOpacity
        style={styles.registerLink}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.registerText}>אין לך משתמש? הירשם</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E7E9', alignItems: 'center', paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 50 },
  signInTitle: { fontSize: 36, fontWeight: 'bold', color: '#000' },
  signInSubtitle: { fontSize: 16, color: '#555', marginTop: 10 },
  buttonGroup: { width: '85%', gap: 15 },
  socialButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  socialButtonText: { fontSize: 16, fontWeight: '500', color: '#333' },
  registerLink: { marginTop: 40, borderBottomWidth: 1, borderBottomColor: '#1A3C40' },
  registerText: { fontSize: 16, color: '#1A3C40', fontWeight: 'bold' },
});

export default LoginScreen;