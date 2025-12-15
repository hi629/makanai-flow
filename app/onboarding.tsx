import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useThemeColor } from '@/hooks/use-theme-color';

const CUISINE_OPTIONS = [
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
  { code: 'IN', flag: '🇮🇳', name: 'India' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
  { code: 'KR', flag: '🇰🇷', name: 'Korea' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'US', flag: '🇺🇸', name: 'USA' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: 'GR', flag: '🇬🇷', name: 'Greece' },
];

export default function OnboardingScreen() {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const toggleCuisine = (code: string) => {
    setSelectedCuisines((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, code];
    });
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(
        'preferred_cuisines',
        JSON.stringify(selectedCuisines)
      );
      await AsyncStorage.setItem('onboarding_complete', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const isSelected = (code: string) => selectedCuisines.includes(code);
  const canContinue = selectedCuisines.length >= 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: textColor }]}>MAKANAI</Text>
          <Text style={[styles.tagline, { color: textColor, opacity: 0.6 }]}>
            From fridge to plate, anywhere.
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={[styles.question, { color: textColor }]}>
            よく作る（食べたい）国の料理は？
          </Text>
          <Text style={[styles.hint, { color: textColor, opacity: 0.5 }]}>
            1〜3つ選んでください
          </Text>
        </View>

        <View style={styles.grid}>
          {CUISINE_OPTIONS.map((cuisine) => (
            <TouchableOpacity
              key={cuisine.code}
              style={[
                styles.cuisineButton,
                isSelected(cuisine.code) && styles.cuisineButtonSelected,
                {
                  borderColor: isSelected(cuisine.code)
                    ? '#FF6B35'
                    : textColor + '20',
                },
              ]}
              onPress={() => toggleCuisine(cuisine.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{cuisine.flag}</Text>
              <Text
                style={[
                  styles.cuisineName,
                  { color: textColor },
                  isSelected(cuisine.code) && styles.cuisineNameSelected,
                ]}
              >
                {cuisine.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.selectedContainer}>
          {selectedCuisines.length > 0 && (
            <Text style={[styles.selectedText, { color: textColor, opacity: 0.6 }]}>
              選択中:{' '}
              {selectedCuisines
                .map((code) => CUISINE_OPTIONS.find((c) => c.code === code)?.flag)
                .join(' ')}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!canContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>はじめる</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  questionContainer: {
    marginBottom: 32,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  cuisineButton: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cuisineButtonSelected: {
    backgroundColor: '#FF6B3515',
  },
  flag: {
    fontSize: 36,
    marginBottom: 4,
  },
  cuisineName: {
    fontSize: 12,
    fontWeight: '500',
  },
  cuisineNameSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  selectedContainer: {
    marginTop: 24,
    alignItems: 'center',
    minHeight: 24,
  },
  selectedText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#FF6B3540',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

