import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDailyLogs } from '@/lib/database';

type CompletionLog = {
  date: string;
  completed: boolean;
};

export default function HistoryScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  const [logs, setLogs] = useState<CompletionLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadLogs = () => {
        try {
          const dbLogs = getDailyLogs(7);
          const completionLogs: CompletionLog[] = dbLogs.map(log => ({
            date: log.date,
            completed: log.completed,
          }));
          
          // Ensure we have 7 days of logs (fill missing days)
          const today = new Date();
          const filledLogs: CompletionLog[] = [];
          for (let i = 0; i < 7; i++) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);
            const dateStr = day.toISOString().slice(0, 10);
            const existingLog = completionLogs.find(l => l.date === dateStr);
            filledLogs.push({
              date: dateStr,
              completed: existingLog?.completed || false,
            });
          }
          
          setLogs(filledLogs);
        } catch (error) {
          console.warn('Failed to load log', error);
        }
      };

      loadLogs();
    }, [])
  );

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
    <View style={[styles.container, { backgroundColor, paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: textColor }]}>KAIZEN</Text>
        <Text style={[styles.subtitle, { color: textColor + '70' }]}>履歴・達成状況</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Card */}
        <View style={[styles.card, { borderColor: textColor + '15' }]}>
          <View style={styles.cardHeader}>
            <View style={styles.streakIcon}>
              <IconSymbol name="flame" size={24} color="#FF6B35" />
            </View>
            <Text style={[styles.cardTitle, { color: textColor }]}>連続達成日数</Text>
          </View>

          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={[styles.streakLabel, { color: textColor + '60' }]}>日連続</Text>
        </View>

        {/* Weekly Stats Card */}
        <View style={[styles.card, { borderColor: textColor + '15' }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>過去7日間の記録</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, styles.doneDot]} />
              <Text style={[styles.statText, { color: textColor }]}>
                完了 <Text style={styles.statNumber}>{completionStats.done}</Text>日
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, styles.pendingDot]} />
              <Text style={[styles.statText, { color: textColor }]}>
                未完了 <Text style={styles.statNumber}>{completionStats.pending}</Text>日
              </Text>
            </View>
          </View>

          <View style={styles.weekGrid}>
            {sortedLogs.map((item) => (
              <View key={item.date} style={styles.dayColumn}>
                <Text style={[styles.weekdayText, { color: textColor + '60' }]}>
                  {weekdayLabel(item.date)}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    item.completed ? styles.dayCircleDone : styles.dayCirclePending,
                  ]}
                >
                  <IconSymbol
                    name={item.completed ? 'checkmark' : 'minus'}
                    size={16}
                    color={item.completed ? '#fff' : '#ccc'}
                  />
                </View>
                <Text style={[styles.dateText, { color: textColor }]}>
                  {dayLabel(item.date)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tips Card */}
        <View style={[styles.tipCard, { borderColor: '#FF6B35' }]}>
          <Text style={styles.tipTitle}>💡 継続のコツ</Text>
          <Text style={styles.tipText}>
            毎日同じ時間にトレーニングすることで習慣化しやすくなります。
            小さな達成でも記録をつけて、モチベーションを維持しましょう！
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B3520',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FF6B35',
    textAlign: 'center',
    lineHeight: 80,
  },
  streakLabel: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: -8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  doneDot: {
    backgroundColor: '#FF6B35',
  },
  pendingDot: {
    backgroundColor: '#E5E5E5',
  },
  statText: {
    fontSize: 15,
  },
  statNumber: {
    fontWeight: '700',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#FF6B35',
  },
  dayCirclePending: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FF6B3510',
    borderWidth: 2,
    gap: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
});
