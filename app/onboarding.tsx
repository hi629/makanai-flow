import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';
import { getProfile, saveProfile, setOnboardingComplete, type UserProfile } from '@/lib/database';

const GENDER_OPTIONS = [
  { key: 'male', label: '男性' },
  { key: 'female', label: '女性' },
  { key: 'other', label: 'その他' },
];

const GOAL_OPTIONS = [
  { key: '筋肥大', label: '筋肥大', description: '筋肉量を増やしたい' },
  { key: '体力向上', label: '体力向上', description: 'スタミナをつけたい' },
  { key: '体型維持', label: '体型維持', description: '今の体型をキープしたい' },
];

const ENVIRONMENT_OPTIONS = [
  { key: '自宅（自重）', label: '自宅（自重）', description: '器具なしで自宅トレーニング' },
  { key: 'ジム（マシンあり）', label: 'ジム', description: 'マシンや器具が使える環境' },
];

const SESSION_OPTIONS = [
  { key: 20, label: '20分', description: 'サクッと短時間で' },
  { key: 40, label: '40分', description: 'バランスよく' },
  { key: 60, label: '60分', description: 'しっかりと' },
];

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [environment, setEnvironment] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null);

  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const loadExistingProfile = () => {
      try {
        const saved = getProfile();
        if (saved) {
          setGender(saved.gender ?? '');
          setAge(saved.age ? String(saved.age) : '');
          setHeight(saved.height ? String(saved.height) : '');
          setWeight(saved.weight ? String(saved.weight) : '');
          setGoal(saved.goal ?? '');
          setEnvironment(saved.environment ?? '');
          setSessionMinutes(saved.sessionMinutes ?? null);
        }
      } catch (error) {
        console.warn('プロフィールの読み込みに失敗しました', error);
      }
    };

    loadExistingProfile();
  }, []);

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 150);
  };

  const numericAge = useMemo(() => Number(age), [age]);
  const numericHeight = useMemo(() => Number(height), [height]);
  const numericWeight = useMemo(() => Number(weight), [weight]);

  const isCurrentStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return gender !== '';
      case 2:
        return !Number.isNaN(numericAge) && numericAge > 0 && numericAge < 120;
      case 3:
        return !Number.isNaN(numericHeight) && numericHeight > 50 && numericHeight < 250;
      case 4:
        return !Number.isNaN(numericWeight) && numericWeight > 20 && numericWeight < 300;
      case 5:
        return goal !== '';
      case 6:
        return environment !== '';
      case 7:
        return sessionMinutes !== null;
      default:
        return false;
    }
  }, [currentStep, gender, numericAge, numericHeight, numericWeight, goal, environment, sessionMinutes]);

  const handleNext = () => {
    if (!isCurrentStepValid) return;
    if (currentStep < TOTAL_STEPS) {
      animateTransition(() => setCurrentStep(currentStep + 1));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      animateTransition(() => setCurrentStep(currentStep - 1));
    }
  };

  const handleComplete = () => {
    if (!isCurrentStepValid || sessionMinutes === null) return;

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
      saveProfile(profile);
      setOnboardingComplete();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(currentStep / TOTAL_STEPS) * 100}%` },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: textColor + '80' }]}>
        {currentStep} / {TOTAL_STEPS}
      </Text>
    </View>
  );

  const renderOptionButton = (
    option: { key: string | number; label: string; description?: string },
    selected: string | number | null,
    onSelect: (key: string | number) => void,
    large?: boolean
  ) => {
    const isSelected = selected === option.key;
    return (
      <TouchableOpacity
        key={option.key}
        style={[
          large ? styles.largeOptionButton : styles.optionButton,
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
        {option.description && (
          <Text style={[styles.optionDescription, { color: textColor + '60' }]}>
            {option.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderNumberInput = (
    value: string,
    unit: string,
    onChange: (text: string) => void,
    placeholder: string
  ) => (
    <View style={styles.numberInputContainer}>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={textColor + '40'}
        style={[
          styles.numberInput,
          { color: textColor, borderColor: textColor + '20' },
        ]}
        autoFocus
      />
      <Text style={[styles.unitLabel, { color: textColor }]}>{unit}</Text>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              性別を教えてください
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              トレーニングメニューの最適化に使用します
            </Text>
            <View style={styles.optionsContainer}>
              {GENDER_OPTIONS.map((option) =>
                renderOptionButton(option, gender, (key) => setGender(String(key)), true)
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              年齢を教えてください
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              適切な運動強度を提案するために使用します
            </Text>
            {renderNumberInput(age, '歳', setAge, '25')}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              身長を教えてください
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              体格に合わせた提案をします
            </Text>
            {renderNumberInput(height, 'cm', setHeight, '170')}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              体重を教えてください
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              消費カロリーの計算に使用します
            </Text>
            {renderNumberInput(weight, 'kg', setWeight, '65')}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              目標を教えてください
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              目標に合わせたメニューを提案します
            </Text>
            <View style={styles.optionsContainer}>
              {GOAL_OPTIONS.map((option) =>
                renderOptionButton(option, goal, (key) => setGoal(String(key)), true)
              )}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              トレーニング環境は？
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              使える器具に合わせたメニューを提案します
            </Text>
            <View style={styles.optionsContainer}>
              {ENVIRONMENT_OPTIONS.map((option) =>
                renderOptionButton(option, environment, (key) => setEnvironment(String(key)), true)
              )}
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: textColor }]}>
              1回あたりの時間は？
            </Text>
            <Text style={[styles.stepSubtitle, { color: textColor + '70' }]}>
              時間内に収まるメニューを提案します
            </Text>
            <View style={styles.optionsContainer}>
              {SESSION_OPTIONS.map((option) =>
                renderOptionButton(option, sessionMinutes, (key) => setSessionMinutes(Number(key)), true)
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, paddingTop: Math.max(insets.top, 16) },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={24}
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: textColor }]}>KAIZEN</Text>
          {renderProgressBar()}
        </View>

        <Animated.View style={[styles.contentArea, { opacity: fadeAnim }]}>
          {renderStepContent()}
        </Animated.View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.buttonRow}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: textColor + '30' }]}
                onPress={handleBack}
                activeOpacity={0.8}
              >
                <Text style={[styles.backButtonText, { color: textColor }]}>
                  戻る
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.nextButton,
                currentStep === 1 && styles.nextButtonFull,
                !isCurrentStepValid && styles.nextButtonDisabled,
              ]}
              onPress={currentStep === TOTAL_STEPS ? handleComplete : handleNext}
              disabled={!isCurrentStepValid}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === TOTAL_STEPS ? '保存してはじめる' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stepContent: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  largeOptionButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#FF6B3515',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  numberInput: {
    width: 140,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  unitLabel: {
    fontSize: 24,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: '#FF6B3540',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
