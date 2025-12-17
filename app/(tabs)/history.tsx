import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

type CompletionLog = {
  date: string; // YYYY-MM-DD
  completed: boolean;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const generateSeedLog = (): CompletionLog[] => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(today);
    day.setDate(today.getDate() - idx);
    return {
      date: formatDate(day),
      completed: idx === 0 || idx === 1 || idx === 3 || idx === 4,
    };
  });
};

export default function HistoryScreen() {
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<CompletionLog[]>(generateSeedLog());

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const stored = await AsyncStorage.getItem('daily_completion_log');
        if (stored) {
          const parsed = JSON.parse(stored) as CompletionLog[];
          setLogs(parsed);
        } else {
          const seed = generateSeedLog();
          setLogs(seed);
          await AsyncStorage.setItem('daily_completion_log', JSON.stringify(seed));
        }
      } catch (error) {
        console.warn('Failed to load log', error);
      }
    };

    loadLogs();
  }, []);

  const sortedLogs = useMemo(
    () =>
      [...logs].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 7),
    [logs]
  );

  const streak = useMemo(() => {
    const today = new Date();
    let count = 0;

    for (const item of sortedLogs) {
      const current = new Date(item.date);
      const diffDays = Math.floor(
        (today.setHours(0, 0, 0, 0) - current.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      );

      if (diffDays === count && item.completed) {
        count += 1;
      } else if (diffDays > count) {
        break;
      }
    }

    return count;
  }, [sortedLogs]);

  const completionStats = useMemo(() => {
    const done = sortedLogs.filter((item) => item.completed).length;
    const pending = sortedLogs.length - done;
    return { done, pending };
  }, [sortedLogs]);

  const toggleToday = async () => {
    const todayKey = formatDate(new Date());
    const updated = logs.map((item) =>
      item.date === todayKey ? { ...item, completed: !item.completed } : item
    );
    setLogs(updated);
    await AsyncStorage.setItem('daily_completion_log', JSON.stringify(updated));
  };

  const isTodayDone = logs.find((item) => item.date === formatDate(new Date()))?.completed;

  const dayLabel = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const weekdayLabel = (dateString: string) => {
    const date = new Date(dateString);
    const week = ['日', '月', '火', '水', '木', '金', '土'];
    return week[date.getDay()];
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>履歴・達成状況</Text>
        <View style={styles.badge}>
          <IconSymbol name="clock.arrow.circlepath" color="#fff" size={16} />
          <Text style={styles.badgeText}>過去7日</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>連続達成日数</Text>
          <IconSymbol name="flame" size={18} color="#f97316" />
        </View>
        <Text style={styles.streakNumber}>{streak} 日</Text>
        <Text style={styles.helperText}>今日を含む連続記録を表示します</Text>
        <TouchableOpacity
          style={[styles.primaryButton, isTodayDone && styles.primaryButtonDisabled]}
          onPress={toggleToday}
        >
          <IconSymbol name={isTodayDone ? 'checkmark' : 'play.fill'} size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {isTodayDone ? '今日の達成を解除' : '今日の記録をつける'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>過去7日間の記録</Text>
          <Text style={styles.helperText}>完了 / 未完了をシンプルに表示</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={[styles.dot, styles.doneDot]} />
            <Text style={styles.summaryText}>完了 {completionStats.done}日</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.dot, styles.pendingDot]} />
            <Text style={styles.summaryText}>未完了 {completionStats.pending}日</Text>
          </View>
        </View>

        <View style={styles.weekRow}>
          {sortedLogs.map((item) => (
            <View key={item.date} style={styles.dayColumn}>
              <Text style={styles.weekdayLabel}>{weekdayLabel(item.date)}</Text>
              <View
                style={[
                  styles.dayCircle,
                  item.completed ? styles.dayCircleDone : styles.dayCirclePending,
                ]}
              >
                <IconSymbol
                  name={item.completed ? 'checkmark' : 'minus'}
                  size={14}
                  color={item.completed ? '#fff' : '#6b7280'}
                />
              </View>
              <Text style={styles.dayLabel}>{dayLabel(item.date)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    color: '#6b7280',
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0a7ea4',
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#059669',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    fontWeight: '600',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  doneDot: {
    backgroundColor: '#0a7ea4',
  },
  pendingDot: {
    backgroundColor: '#d1d5db',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weekdayLabel: {
    color: '#6b7280',
    fontWeight: '600',
  },
  dayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayCircleDone: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
    shadowColor: '#0a7ea4',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dayCirclePending: {
    backgroundColor: '#f8fafc',
  },
  dayLabel: {
    fontWeight: '700',
  },
});
