import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColor } from '@/hooks/use-theme-color';

type TrainingDay = {
  dayLabel: string;
  focus: string;
  totalMinutes: number;
  difficulty: 'ビギナー' | 'スタンダード' | 'アドバンス';
};

const defaultPlan: TrainingDay[] = [
  { dayLabel: '月曜日', focus: '上半身プッシュ', totalMinutes: 35, difficulty: 'スタンダード' },
  { dayLabel: '火曜日', focus: '下半身（スクワット系）', totalMinutes: 30, difficulty: 'ビギナー' },
  { dayLabel: '水曜日', focus: '体幹・バランス', totalMinutes: 28, difficulty: 'スタンダード' },
  { dayLabel: '木曜日', focus: '上半身プル', totalMinutes: 32, difficulty: 'スタンダード' },
  { dayLabel: '金曜日', focus: 'ヒップ・ハムストリング', totalMinutes: 34, difficulty: 'アドバンス' },
  { dayLabel: '土曜日', focus: '全身サーキット', totalMinutes: 25, difficulty: 'ビギナー' },
  { dayLabel: '日曜日', focus: 'ストレッチ・リカバリー', totalMinutes: 20, difficulty: 'ビギナー' },
];

const difficultyColors: Record<TrainingDay['difficulty'], string> = {
  ビギナー: '#42a5f5',
  スタンダード: '#f9a825',
  アドバンス: '#ef5350',
};

export default function WeeklyPlanScreen() {
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  const todayLabel = useMemo(() => {
    const today = new Date();
    const weekday = today.getDay();
    const labels = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    return labels[weekday];
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>週間トレーニングプラン</Text>
          <Text style={[styles.subtitle, { color: textColor, opacity: 0.65 }]}>AIが提案した7日分のメニュー</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryCta} activeOpacity={0.85}>
            <Text style={styles.primaryCtaText}>今日のトレーニングへ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryCta} activeOpacity={0.85}>
            <Text style={styles.secondaryCtaText}>今週を作り直す</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionLabel, { color: textColor }]}>7日間のプラン</Text>
          <Text style={[styles.weekHint, { color: textColor, opacity: 0.6 }]}>曜日ごとに焦点と合計時間を確認できます</Text>
        </View>

        <View style={{ gap: 12 }}>
          {defaultPlan.map((day) => (
            <View key={day.dayLabel} style={[styles.card, { backgroundColor: cardColor }]}> 
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.dayLabel, { color: textColor }]}>{day.dayLabel}</Text>
                  <Text style={[styles.focus, { color: textColor, opacity: 0.7 }]}>{day.focus}</Text>
                </View>
                <View style={[styles.difficultyPill, { backgroundColor: `${difficultyColors[day.difficulty]}22` }]}>
                  <View style={[styles.dot, { backgroundColor: difficultyColors[day.difficulty] }]} />
                  <Text style={[styles.difficultyText, { color: difficultyColors[day.difficulty] }]}>
                    {day.difficulty}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: textColor, opacity: 0.6 }]}>合計時間</Text>
                  <Text style={[styles.metaValue, { color: textColor }]}>{day.totalMinutes}分</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: textColor, opacity: 0.6 }]}>難易度</Text>
                  <Text style={[styles.metaValue, { color: textColor }]}>{day.difficulty}</Text>
                </View>
              </View>

              {day.dayLabel === todayLabel && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>今日はここからスタート</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryCta: {
    flex: 1,
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCtaText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryCta: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryCtaText: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
  listHeader: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekHint: {
    fontSize: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  focus: {
    marginTop: 4,
    fontSize: 14,
  },
  difficultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyText: {
    fontWeight: '700',
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  todayBadge: {
    backgroundColor: '#0a7ea415',
    padding: 10,
    borderRadius: 12,
  },
  todayBadgeText: {
    color: '#0a7ea4',
    fontWeight: '700',
    textAlign: 'center',
  },
});
