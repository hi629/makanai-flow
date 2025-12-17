import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

type UserProfile = {
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  environment: string;
  sessionMinutes: number;
};

const GENDER_OPTIONS = [
  { key: 'male', label: '男性' },
  { key: 'female', label: '女性' },
  { key: 'other', label: 'その他' },
];

const GOAL_OPTIONS = [
  { key: '筋肥大', label: '筋肥大' },
  { key: '体力向上', label: '体力向上' },
  { key: '体型維持', label: '体型維持' },
];

const ENVIRONMENT_OPTIONS = [
  { key: '自宅（自重）', label: '自宅（自重）' },
  { key: 'ジム（マシンあり）', label: 'ジム（マシンあり）' },
];

const SESSION_OPTIONS = [
  { key: 20, label: '20分' },
  { key: 40, label: '40分' },
  { key: 60, label: '60分' },
];

export default function OnboardingScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [environment, setEnvironment] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem('user_profile');
        if (saved) {
          const parsed: UserProfile = JSON.parse(saved);
          setGender(parsed.gender ?? '');
          setAge(parsed.age ? String(parsed.age) : '');
          setHeight(parsed.height ? String(parsed.height) : '');
          setWeight(parsed.weight ? String(parsed.weight) : '');
          setGoal(parsed.goal ?? '');
          setEnvironment(parsed.environment ?? '');
          setSessionMinutes(parsed.sessionMinutes ?? null);
        }
      } catch (error) {
        console.warn('プロフィールの読み込みに失敗しました', error);
      }
    };

    loadProfile();
  }, []);

  const numericAge = useMemo(() => Number(age), [age]);
  const numericHeight = useMemo(() => Number(height), [height]);
  const numericWeight = useMemo(() => Number(weight), [weight]);

  const isValid = useMemo(() => {
    return (
      gender !== '' &&
      goal !== '' &&
      environment !== '' &&
      sessionMinutes !== null &&
      !Number.isNaN(numericAge) &&
      !Number.isNaN(numericHeight) &&
      !Number.isNaN(numericWeight) &&
      numericAge > 0 &&
      numericHeight > 0 &&
      numericWeight > 0
    );
  }, [
    environment,
    gender,
    goal,
    numericAge,
    numericHeight,
    numericWeight,
    sessionMinutes,
  ]);

  const handleComplete = async () => {
    if (!isValid || sessionMinutes === null) return;

    const profile: UserProfile = {
      gender,
      age: numericAge,
      height: numericHeight,
      weight: numericWeight,
      goal,
      environment,
      sessionMinutes,
    };

    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      await AsyncStorage.setItem('onboarding_complete', 'true');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const renderOptionRow = (
    options: { key: string | number; label: string }[],
    selected: string | number | null,
    onSelect: (key: string | number) => void
  ) => (
    <View style={styles.optionRow}>
      {options.map((option) => {
        const isSelected = selected === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              isSelected && styles.optionButtonSelected,
              { borderColor: isSelected ? '#FF6B35' : textColor + '20' },
            ]}
            onPress={() => onSelect(option.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.optionLabel,
                { color: isSelected ? '#FF6B35' : textColor },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderNumberField = (
    label: string,
    value: string,
    unit: string,
    onChange: (text: string) => void
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.inputWithUnit}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          style={[styles.input, { color: textColor, borderColor: textColor + '20' }]}
        />
        <Text style={[styles.unitLabel, { color: textColor }]}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor, paddingTop: Math.max(insets.top, 16) }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.logo, { color: textColor }]}>MAKANAI</Text>
            <Text style={[styles.tagline, { color: textColor, opacity: 0.6 }]}>AI生成のための基本情報</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>プロフィール</Text>
            <Text style={[styles.hint, { color: textColor, opacity: 0.6 }]}>必須項目を入力してください</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>性別</Text>
            {renderOptionRow(GENDER_OPTIONS, gender, (key) => setGender(String(key)))}
          </View>

          {renderNumberField('年齢', age, '歳', setAge)}
          {renderNumberField('身長', height, 'cm', setHeight)}
          {renderNumberField('体重', weight, 'kg', setWeight)}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>目標</Text>
            {renderOptionRow(GOAL_OPTIONS, goal, (key) => setGoal(String(key)))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>トレーニング環境</Text>
            {renderOptionRow(
              ENVIRONMENT_OPTIONS,
              environment,
              (key) => setEnvironment(String(key))
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>1回あたりの時間</Text>
            {renderOptionRow(SESSION_OPTIONS, sessionMinutes, (key) =>
              setSessionMinutes(Number(key))
            )}
          </View>
        </ScrollView>

        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24), borderTopColor: textColor + '10' }]}
        >
          <TouchableOpacity
            style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
            onPress={handleComplete}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>保存してはじめる</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    marginTop: 6,
  },
  section: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 90,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#FF6B3515',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
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
    fontWeight: '700',
  },
});
