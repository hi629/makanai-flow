import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { generateTrainingPlan, type UserProfileForAI } from '@/lib/ai';
import {
  getProfile as getDBProfile,
  getWeeklyPlan as getDBWeeklyPlan,
  saveWeeklyPlan as saveDBWeeklyPlan,
  type DayPlan as DBDayPlan
} from '@/lib/database';

type DayPlan = {
  dayOfWeek: string;
  date: string;
  bodyPart: string;
  totalMinutes: number;
  difficulty: 'easy' | 'normal' | 'hard';
  isRestDay: boolean;
};

type UserProfile = {
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  environment: string;
  sessionMinutes: number;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const DIFFICULTY_LABELS = {
  easy: '初級',
  normal: '中級',
  hard: '上級',
};

const DIFFICULTY_COLORS = {
  easy: '#10B981',
  normal: '#FF6B35',
  hard: '#EF4444',
};

const generateWeeklyPlan = (profile: UserProfile | null): DayPlan[] => {
  const today = new Date();
  const plans: DayPlan[] = [];

  const getBodyParts = (goal: string, environment: string): string[] => {
    if (environment === 'ジム（マシンあり）') {
      switch (goal) {
        case '筋肥大':
          return ['胸・三頭筋', '背中・二頭筋', '脚・臀部', '肩・僧帽筋', '腕・腹筋', '全身', '脚・背中'];
        case '体力向上':
          return ['全身サーキット', '上半身', '下半身・コア', 'HIIT', '有酸素+筋トレ', '全身', '上半身・コア'];
        case '体型維持':
          return ['上半身', '下半身', '体幹・腹筋', '全身軽め', '上半身', '下半身', '有酸素'];
        default:
          return ['全身', '上半身', '下半身', '体幹', '全身', '上半身', '下半身'];
      }
    } else {
      switch (goal) {
        case '筋肥大':
          return ['プッシュ系', 'プル系', '脚・臀部', '上半身', 'コア強化', '全身', '脚・プッシュ'];
        case '体力向上':
          return ['全身HIIT', '上半身サーキット', '下半身サーキット', 'バーピー系', '体幹HIIT', '全身', '有酸素'];
        case '体型維持':
          return ['軽めプッシュ', '軽めプル', 'スクワット系', 'プランク系', '全身軽め', 'ストレッチ', '軽め全身'];
        default:
          return ['プッシュ系', 'プル系', '脚・体幹', '全身HIIT', 'コア強化', '上半身', '下半身'];
      }
    }
  };

  const getDifficulties = (age: number, goal: string): ('easy' | 'normal' | 'hard')[] => {
    let baseDifficulties: ('easy' | 'normal' | 'hard')[];

    if (goal === '筋肥大') {
      baseDifficulties = ['normal', 'hard', 'normal', 'hard', 'normal', 'easy', 'hard'];
    } else if (goal === '体力向上') {
      baseDifficulties = ['hard', 'normal', 'hard', 'normal', 'hard', 'easy', 'normal'];
    } else {
      baseDifficulties = ['easy', 'normal', 'easy', 'normal', 'easy', 'easy', 'normal'];
    }

    if (age >= 40) {
      return baseDifficulties.map((d) => {
        if (d === 'hard') return 'normal';
        if (d === 'normal') return 'easy';
        return 'easy';
      });
    }

    return baseDifficulties;
  };

  // 休息日は曜日で判定（火曜日=2、日曜日=0）
  const REST_WEEKDAYS = [0, 2]; // 日曜日と火曜日が休息日

  // 曜日ごとのトレーニング部位を設定（水曜日=脚の日）
  const getBodyPartForWeekday = (weekday: number, environment: string, goal: string): string => {
    if (environment === 'ジム（マシンあり）') {
      // 月=1, 水=3, 木=4, 金=5, 土=6
      const gymParts: Record<number, string> = {
        1: '胸・三頭筋',    // 月曜日
        3: '脚・臀部',      // 水曜日（脚の日）
        4: '背中・二頭筋',  // 木曜日
        5: '肩・腹筋',      // 金曜日
        6: '全身',          // 土曜日
      };
      return gymParts[weekday] || '全身';
    } else {
      const homeParts: Record<number, string> = {
        1: 'プッシュ系',    // 月曜日
        3: '脚・体幹',      // 水曜日（脚の日）
        4: 'プル系',        // 木曜日
        5: '全身HIIT',      // 金曜日
        6: 'コア強化',      // 土曜日
      };
      return homeParts[weekday] || '全身';
    }
  };

  const difficulties = getDifficulties(profile?.age || 30, profile?.goal || '体型維持');

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const weekday = date.getDay();
    const dayOfWeek = WEEKDAYS[weekday];
    const isRestDay = REST_WEEKDAYS.includes(weekday);

    plans.push({
      dayOfWeek,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      bodyPart: isRestDay ? '休息日' : getBodyPartForWeekday(weekday, profile?.environment || '自宅（自重）', profile?.goal || '体型維持'),
      totalMinutes: isRestDay ? 0 : (profile?.sessionMinutes || 40),
      difficulty: isRestDay ? 'easy' : difficulties[i],
      isRestDay,
    });
  }

  return plans;
};

export default function WeeklyScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  const [weeklyPlan, setWeeklyPlan] = useState<DayPlan[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [futurePlans, setFuturePlans] = useState<DayPlan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to get today's date string in the same format as plans
  const getTodayDateStr = () => {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}`;
  };

  useFocusEffect(
    useCallback(() => {
    const loadData = () => {
      try {
        const dbProfile = getDBProfile();
        if (dbProfile) {
          // Convert DBUserProfile to local UserProfile
          const userProfile: UserProfile = {
            gender: dbProfile.gender,
            age: dbProfile.age,
            height: dbProfile.height,
            weight: dbProfile.weight,
            goal: dbProfile.goal,
            environment: dbProfile.environment,
            sessionMinutes: dbProfile.sessionMinutes,
          };
          setProfile(userProfile);
        }

        const savedPlans = getDBWeeklyPlan();
        const todayDateStr = getTodayDateStr();
        
        if (savedPlans.length > 0) {
          // Convert DBDayPlan to local DayPlan
          const plans: DayPlan[] = savedPlans.map(p => ({
            dayOfWeek: p.dayOfWeek,
            date: p.date,
            bodyPart: p.bodyPart,
            totalMinutes: p.totalMinutes,
            difficulty: 'normal' as const,
            isRestDay: p.isRestDay,
          }));
          
          // Find today's plan
          const todayIndex = plans.findIndex(p => p.date === todayDateStr);
          
          if (todayIndex >= 0) {
            // Today exists in the plan
            setTodayPlan(plans[todayIndex]);
            // Get future plans (after today)
            setFuturePlans(plans.slice(todayIndex + 1));
            setWeeklyPlan(plans);
          } else {
            // Plan is outdated, regenerate
            const newPlan = generateWeeklyPlan(dbProfile ? {
              gender: dbProfile.gender,
              age: dbProfile.age,
              height: dbProfile.height,
              weight: dbProfile.weight,
              goal: dbProfile.goal,
              environment: dbProfile.environment,
              sessionMinutes: dbProfile.sessionMinutes,
            } : null);
            setWeeklyPlan(newPlan);
            setTodayPlan(newPlan[0]);
            setFuturePlans(newPlan.slice(1));
            // Save to DB
            const dbPlans: DBDayPlan[] = newPlan.map(p => ({
              date: p.date,
              dayOfWeek: p.dayOfWeek,
              bodyPart: p.bodyPart,
              totalMinutes: p.totalMinutes,
              isRestDay: p.isRestDay,
            }));
            saveDBWeeklyPlan(dbPlans);
          }
        } else {
          const userProfile = dbProfile ? {
            gender: dbProfile.gender,
            age: dbProfile.age,
            height: dbProfile.height,
            weight: dbProfile.weight,
            goal: dbProfile.goal,
            environment: dbProfile.environment,
            sessionMinutes: dbProfile.sessionMinutes,
          } : null;
          const newPlan = generateWeeklyPlan(userProfile);
          setWeeklyPlan(newPlan);
          setTodayPlan(newPlan[0]);
          setFuturePlans(newPlan.slice(1));
          // Save to DB
          const dbPlans: DBDayPlan[] = newPlan.map(p => ({
            date: p.date,
            dayOfWeek: p.dayOfWeek,
            bodyPart: p.bodyPart,
            totalMinutes: p.totalMinutes,
            isRestDay: p.isRestDay,
          }));
          saveDBWeeklyPlan(dbPlans);
        }
      } catch (error) {
        console.warn('Failed to load data', error);
        const fallback = generateWeeklyPlan(null);
        setWeeklyPlan(fallback);
        setTodayPlan(fallback[0]);
        setFuturePlans(fallback.slice(1));
      }
    };

    loadData();
  }, []));  // useFocusEffect end

  const regeneratePlan = async () => {
    if (!profile) {
      Alert.alert(
        'プロフィール未設定',
        'AIがあなたに最適なプランを作成するには、プロフィールの設定が必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'プロフィールを設定',
            onPress: () => router.push('/onboarding'),
          },
        ]
      );
      return;
    }

    setIsGenerating(true);

    try {
      // AIを使ってプランを生成
      const aiProfile: UserProfileForAI = {
        gender: profile.gender,
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        goal: profile.goal,
        environment: profile.environment,
        sessionMinutes: profile.sessionMinutes,
      };

      const aiPlans = await generateTrainingPlan(aiProfile);

      // Convert to local DayPlan format
      const newPlan: DayPlan[] = aiPlans.map(p => ({
        dayOfWeek: p.dayOfWeek,
        date: p.date,
        bodyPart: p.bodyPart,
        totalMinutes: p.totalMinutes,
        difficulty: 'normal' as const,
        isRestDay: p.isRestDay,
      }));

      setWeeklyPlan(newPlan);
      setTodayPlan(newPlan[0]);
      setFuturePlans(newPlan.slice(1));

      // Save to DB
      const dbPlans: DBDayPlan[] = newPlan.map(p => ({
        date: p.date,
        dayOfWeek: p.dayOfWeek,
        bodyPart: p.bodyPart,
        totalMinutes: p.totalMinutes,
        isRestDay: p.isRestDay,
      }));
      saveDBWeeklyPlan(dbPlans);

      Alert.alert('完了', 'AIがあなた専用のプランを作成しました！');
    } catch (error) {
      console.error('AI plan generation failed:', error);
      
      // フォールバック: 固定ロジックでプランを生成
      const fallbackPlan = generateWeeklyPlan(profile);
      setWeeklyPlan(fallbackPlan);
      setTodayPlan(fallbackPlan[0]);
      setFuturePlans(fallbackPlan.slice(1));

      const dbPlans: DBDayPlan[] = fallbackPlan.map(p => ({
        date: p.date,
        dayOfWeek: p.dayOfWeek,
        bodyPart: p.bodyPart,
        totalMinutes: p.totalMinutes,
        isRestDay: p.isRestDay,
      }));
      saveDBWeeklyPlan(dbPlans);

      Alert.alert(
        'AI生成に失敗',
        'デフォルトのプランを作成しました。ネットワーク接続を確認してください。'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartTodayTraining = () => {
    router.push('/');
  };

  const getGoalLabel = (goal: string): string => {
    switch (goal) {
      case '筋肥大':
        return '💪 筋肥大';
      case '体力向上':
        return '🏃 体力向上';
      case '体型維持':
        return '⚖️ 体型維持';
      default:
        return goal;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: textColor }]}>KAIZEN</Text>
        <Text style={[styles.subtitle, { color: textColor + '70' }]}>週間プラン</Text>
      </View>

      {profile && (
        <View style={styles.profileSummary}>
          <View style={styles.profileBadge}>
            <Text style={styles.profileText}>{getGoalLabel(profile.goal)}</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileText}>{profile.sessionMinutes}分/回</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileText}>
              {profile.environment === 'ジム（マシンあり）' ? '🏋️ ジム' : '🏠 自宅'}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.aiBadgeContainer}>
          <View style={styles.aiBadge}>
            <IconSymbol name="sparkles" size={14} color="#FF6B35" />
            <Text style={styles.aiBadgeText}>AIがあなた専用のプランを作成</Text>
          </View>
        </View>

        {todayPlan && (
          <View style={styles.todayCard}>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>TODAY</Text>
            </View>
            <View style={styles.todayContent}>
              <View style={styles.todayHeader}>
                <Text style={styles.todayDay}>{todayPlan.dayOfWeek}曜日</Text>
                <Text style={styles.todayDate}>{todayPlan.date}</Text>
              </View>
              <Text style={styles.todayBodyPart}>{todayPlan.bodyPart}</Text>
              {!todayPlan.isRestDay && (
                <View style={styles.todayMeta}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="clock" size={16} color="#fff" />
                    <Text style={styles.metaText}>{todayPlan.totalMinutes}分</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: '#ffffff30' }]}>
                    <Text style={styles.difficultyTextWhite}>
                      {DIFFICULTY_LABELS[todayPlan.difficulty]}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.todayButton}
              onPress={handleStartTodayTraining}
              activeOpacity={0.9}
            >
              <Text style={styles.todayButtonText}>
                {todayPlan.isRestDay ? '休息日を確認' : '今日のトレーニングへ'}
              </Text>
              <IconSymbol name="chevron.right" size={18} color="#FF6B35" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: textColor }]}>今週のスケジュール</Text>

        <View style={styles.weekList}>
          {futurePlans.map((day) => (
            <View
              key={day.date}
              style={[
                styles.dayCard,
                { borderColor: textColor + '15' },
                day.isRestDay && styles.dayCardRest,
              ]}
            >
              <View style={styles.dayLeft}>
                <Text style={[styles.dayOfWeek, { color: textColor }]}>{day.dayOfWeek}</Text>
                <Text style={[styles.dayDate, { color: textColor + '60' }]}>{day.date}</Text>
              </View>

              <View style={styles.dayCenter}>
                <Text
                  style={[
                    styles.bodyPart,
                    { color: day.isRestDay ? textColor + '50' : textColor },
                  ]}
                >
                  {day.bodyPart}
                </Text>
                {!day.isRestDay && (
                  <Text style={[styles.timeText, { color: textColor + '60' }]}>
                    {day.totalMinutes}分
                  </Text>
                )}
              </View>

              <View style={styles.dayRight}>
                {!day.isRestDay && (
                  <View
                    style={[
                      styles.difficultyDot,
                      { backgroundColor: DIFFICULTY_COLORS[day.difficulty] },
                    ]}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.regenerateButton, { borderColor: textColor + '30' }]}
          onPress={regeneratePlan}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.regenerateText}>AIが生成中...</Text>
            </>
          ) : (
            <>
              <IconSymbol name="sparkles" size={18} color="#FF6B35" />
              <Text style={styles.regenerateText}>AIで再生成</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.legend}>
          <Text style={[styles.legendTitle, { color: textColor + '60' }]}>難易度</Text>
          <View style={styles.legendItems}>
            {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
              <View key={key} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: DIFFICULTY_COLORS[key as keyof typeof DIFFICULTY_COLORS] },
                  ]}
                />
                <Text style={[styles.legendText, { color: textColor + '70' }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 生成中のローディングオーバーレイ */}
      <Modal
        visible={isGenerating}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>AIがプランを生成中...</Text>
            <Text style={styles.loadingSubText}>しばらくお待ちください</Text>
          </View>
        </View>
      </Modal>
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
  profileSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B3515',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  profileText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 20,
  },
  aiBadgeContainer: {
    alignItems: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B3510',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B3530',
  },
  aiBadgeText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '600',
  },
  todayCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  todayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  todayContent: {
    gap: 8,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayDay: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  todayDate: {
    color: '#ffffff90',
    fontSize: 15,
  },
  todayBodyPart: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  todayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyTextWhite: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  todayButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  todayButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  weekList: {
    gap: 12,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
  },
  dayCardRest: {
    opacity: 0.6,
  },
  dayLeft: {
    width: 50,
    alignItems: 'center',
  },
  dayOfWeek: {
    fontSize: 16,
    fontWeight: '700',
  },
  dayDate: {
    fontSize: 12,
  },
  dayCenter: {
    flex: 1,
    gap: 4,
  },
  bodyPart: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
  },
  dayRight: {
    width: 24,
    alignItems: 'center',
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
  },
  regenerateText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  legend: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  legendTitle: {
    fontSize: 13,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingSubText: {
    color: '#ffffff70',
    fontSize: 14,
  },
});

