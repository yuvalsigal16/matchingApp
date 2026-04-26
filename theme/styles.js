import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

// פלטת צבעים לפי צילומי המסך
const COLORS = {
  primaryTeal: '#86B3B1',
  secondaryPink: '#E5A5B1',
  background: '#F0F4F4',
  textDark: '#333',
  white: '#FFFFFF',
};

const Stack = createStackNavigator();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: COLORS.textDark,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  menuCard: {
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    elevation: 3, // צל לאנדרואיד
    shadowColor: '#000', // צל ל-iOS
  },
  menuCardText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: COLORS.secondaryPink,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  nextButton: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.textDark,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});
