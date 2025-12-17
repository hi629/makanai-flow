import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const trainingPlan = [
  {
    id: 'squat',
    name: 'スクワット',
    sets: 3,
    reps: 12,
    rest: 90,
    focus: '下半身・体幹',
    cue: '膝とつま先を同じ向きに、最後まで呼吸を止めない',
  },
  {
    id: 'pushup',
    name: 'プッシュアップ',
    sets: 3,
    reps: 10,
    rest: 75,
    focus: '胸・腕',
    cue: '肩をすくめずに、降ろす時にゆっくり3秒',
  },
  {
    id: 'row',
    name: 'ワンハンドロー',
    sets: 3,
    reps: 12,
    rest: 60,
    focus: '背中',
    cue: '腰を丸めず、引いた時に肩甲骨を寄せる',
  },
  {
    id: 'plank',
    name: 'プランク',
    sets: 3,
    reps: 40,
    rest: 60,
    focus: '体幹',
    cue: 'お腹を軽く引き込み、腰が落ちない高さをキープ',
  },
] as const;

type TrainingId = (typeof trainingPlan)[number]['id'];

type CompletionState = Record<TrainingId, boolean>;

export default function TrainingScreen() {
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const insets = useSafeAreaInsets();

  const [completed, setCompleted] = useState<CompletionState>(() =>
    trainingPlan.reduce<CompletionState>((acc, item) => {
      acc[item.id] = false;
      return acc;
    }, {} as CompletionState)
  );

  const finishedCount = useMemo(
    () => Object.values(completed).filter(Boolean).length,
    [completed]
  );
  const allFinished = finishedCount === trainingPlan.length;

  const toggleCompletion = (id: TrainingId) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor }]}>今日のトレーニング</Text>
          <Text style={styles.subtitle}>目的: 実行に集中</Text>
        </View>
        <View style={[styles.badge, { borderColor: tint }]}> 
          <Text style={[styles.badgeText, { color: tint }]}>完了 {finishedCount}/{trainingPlan.length}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}> 
        <Text style={styles.cardTitle}>ウォームアップメモ</Text>
        <Text style={styles.helperText}>肩周り・股関節を各30秒ずつ動かしてから始めるとフォームが安定します。</Text>
        <View style={styles.focusPill}>
          <Text style={[styles.pillText, { color: tint }]}>呼吸を止めない / 休憩はタイマーで固定</Text>
        </View>
      </View>

      {trainingPlan.map((exercise) => {
        const isDone = completed[exercise.id];
        return (
          <View key={exercise.id} style={[styles.card, { backgroundColor: cardColor }]}> 
            <View style={styles.exerciseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exerciseName, { color: textColor }]}>{exercise.name}</Text>
                <Text style={styles.exerciseFocus}>{exercise.focus}</Text>
              </View>
              <View style={[styles.setBadge, { borderColor: tint }]}> 
                <Text style={[styles.setBadgeText, { color: tint }]}>
                  {exercise.sets} × {exercise.reps}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>休憩 {exercise.rest} 秒</Text>
              <Text style={styles.metaText}>セット完了で押す</Text>
            </View>

            <Text style={styles.cueText}>{exercise.cue}</Text>

            <TouchableOpacity
              onPress={() => toggleCompletion(exercise.id)}
              style={[styles.exerciseButton, isDone && styles.exerciseButtonDone, { borderColor: tint }]}
            >
              <Text style={[styles.exerciseButtonText, isDone && styles.exerciseButtonTextDone]}>
                {isDone ? '完了済み' : '実行した'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity
        disabled={!allFinished}
        style={[
          styles.primaryButton,
          { backgroundColor: allFinished ? tint : '#d1d5db' },
        ]}
      >
        <Text style={styles.primaryButtonText}>今日は完了</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    color: '#4b5563',
    lineHeight: 20,
  },
  focusPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  pillText: {
    fontWeight: '600',
    fontSize: 13,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseFocus: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },
  setBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  setBadgeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: '#6b7280',
    fontSize: 13,
  },
  cueText: {
    lineHeight: 20,
    color: '#374151',
  },
  exerciseButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  exerciseButtonDone: {
    backgroundColor: '#ecfdf3',
    borderColor: '#10b981',
  },
  exerciseButtonText: {
    fontWeight: '700',
    color: '#111827',
  },
  exerciseButtonTextDone: {
    color: '#065f46',
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});

