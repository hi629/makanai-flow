import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getDailyLogs,
  getProfile,
  getTodayLog,
  getWeeklyPlan,
  saveDailyLog,
  saveFeedback,
  saveWeeklyPlan,
  type DayPlan as DBDayPlan,
} from '@/lib/database';

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest: number;
};

// 初心者向けエクササイズ説明
const EXERCISE_GUIDE: Record<string, { shortDesc: string; howTo: string; tips: string }> = {
  // 自重系
  pushup: {
    shortDesc: '胸を押す',
    howTo: '両手を肩幅より少し広めに床につき、体をまっすぐに保ちながら腕を曲げて体を下ろし、押し上げます。',
    tips: '腰が落ちないように！きつい場合は膝をついてOK',
  },
  pike: {
    shortDesc: '肩を押す',
    howTo: 'お尻を高く上げた逆V字の姿勢から、頭を床に近づけるように腕を曲げ、押し上げます。',
    tips: '肩を鍛える種目。頭を床に近づけるイメージで',
  },
  dips: {
    shortDesc: '二の腕を押す',
    howTo: '椅子の端に手をつき、お尻を前に出して腕で体を支え、肘を曲げて体を下ろし、押し上げます。',
    tips: '二の腕の裏側に効きます。肘は後ろに曲げる',
  },
  invrow: {
    shortDesc: '背中を引く',
    howTo: 'テーブルの下に仰向けで入り、端を掴んで胸をテーブルに引き寄せます。',
    tips: '背中を鍛える種目。体はまっすぐキープ',
  },
  superman: {
    shortDesc: '背中を伸ばす',
    howTo: 'うつ伏せになり、両腕と両脚を同時に床から持ち上げて数秒キープします。',
    tips: '背中とお尻に力を入れて。首は自然な位置に',
  },
  backext: {
    shortDesc: '背中を起こす',
    howTo: 'うつ伏せで手を頭の後ろに組み、上半身を床から持ち上げてゆっくり戻します。',
    tips: '急に上げすぎない。腰に負担がかからない範囲で',
  },
  squat: {
    shortDesc: '太ももを使う',
    howTo: '足を肩幅に開き、お尻を後ろに引きながら膝を曲げて腰を落とし、立ち上がります。',
    tips: '膝がつま先より前に出すぎないように。太ももが床と平行になるまで',
  },
  lunge: {
    shortDesc: '片足で踏み込む',
    howTo: '片足を大きく前に踏み出し、後ろ足の膝が床に近づくまで腰を落とし、元に戻ります。',
    tips: '前膝は90度。上半身はまっすぐキープ',
  },
  plank: {
    shortDesc: '体幹をキープ',
    howTo: '肘を肩の真下につき、つま先と肘で体を支え、頭からかかとまで一直線をキープします。',
    tips: 'お腹に力を入れて腰が落ちないように。秒数は目安',
  },
  burpee: {
    shortDesc: '全身を動かす',
    howTo: '立った状態→しゃがんで手を床→足を後ろへ→腕立て→足を戻す→ジャンプ、を繰り返します。',
    tips: '全身運動！無理せず自分のペースで',
  },
  jumpsquat: {
    shortDesc: 'ジャンプで鍛える',
    howTo: 'スクワットの姿勢から、立ち上がる時にジャンプし、着地したらすぐにスクワットに入ります。',
    tips: '着地は柔らかく。膝を痛めないように注意',
  },
  mtclimb: {
    shortDesc: '膝を引きつける',
    howTo: '腕立ての姿勢から、左右の膝を交互に胸に引きつけます。',
    tips: '腰を上げすぎない。リズミカルに',
  },
  crunch: {
    shortDesc: 'お腹を縮める',
    howTo: '仰向けで膝を曲げ、手を頭の後ろに。肩甲骨が浮く程度まで上体を起こし、戻します。',
    tips: '首を引っ張らない。おへそを見るイメージ',
  },
  legrise: {
    shortDesc: '脚を持ち上げる',
    howTo: '仰向けで両脚を伸ばし、床から脚を持ち上げて90度まで上げ、ゆっくり戻します。',
    tips: '腰が浮かないように！きつい場合は膝を曲げてOK',
  },
  calf: {
    shortDesc: 'ふくらはぎを鍛える',
    howTo: '壁に手をついて立ち、かかとを上げてつま先立ちになり、ゆっくり戻します。',
    tips: 'ふくらはぎを意識。段差を使うとより効果的',
  },
  // ジム系
  bench: {
    shortDesc: '胸を押す',
    howTo: 'ベンチに仰向けになり、バーを肩幅より広めに握り、胸に下ろして押し上げます。',
    tips: '足は床につけて安定させる。補助者がいると安心',
  },
  incline: {
    shortDesc: '胸の上部を押す',
    howTo: '傾斜のついたベンチで、ダンベルを胸の横から上に押し上げます。',
    tips: '胸の上部を鍛える種目。肘は下ろしすぎない',
  },
  tricep: {
    shortDesc: '二の腕を伸ばす',
    howTo: 'ケーブルマシンで、肘を固定したまま腕を下に伸ばし、ゆっくり戻します。',
    tips: '肘は動かさない。二の腕の裏側を意識',
  },
  latpull: {
    shortDesc: '背中を引く',
    howTo: 'バーを肩幅より広めに握り、胸を張りながらバーを鎖骨に引きつけます。',
    tips: '背中で引くイメージ。腕の力だけで引かない',
  },
  row: {
    shortDesc: '背中を引く',
    howTo: '座った状態でハンドルを握り、胸を張りながら肘を引いてお腹に近づけます。',
    tips: '肩甲骨を寄せる。背中の筋肉を使う',
  },
  curl: {
    shortDesc: '腕を曲げる',
    howTo: 'ダンベルを持ち、肘を固定したまま腕を曲げてダンベルを肩に近づけます。',
    tips: '反動を使わない。ゆっくり戻すのがポイント',
  },
  legpress: {
    shortDesc: '脚を押す',
    howTo: 'シートに座り、足を肩幅でプレートにつけ、膝を曲げて伸ばす動作を繰り返します。',
    tips: '膝を完全に伸ばし切らない。腰を浮かせない',
  },
  shoulder: {
    shortDesc: '肩を押し上げる',
    howTo: 'ダンベルを肩の高さに構え、頭上に押し上げて戻します。',
    tips: '腰を反らさない。まっすぐ上に押す',
  },
};

type DayPlan = {
  dayOfWeek: string;
  date: string;
  bodyPart: string;
  totalMinutes: number;
  isRestDay: boolean;
};

type Feedback = 'hard' | 'normal' | 'easy' | null;

// 種目データベース
const EXERCISE_DB: Record<string, Exercise[]> = {
  '胸・三頭筋': [
    { id: 'bench', name: 'ベンチプレス', sets: 3, reps: 10, rest: 90 },
    { id: 'incline', name: 'インクラインダンベル', sets: 3, reps: 12, rest: 60 },
    { id: 'tricep', name: 'トライセプスプッシュダウン', sets: 3, reps: 15, rest: 45 },
  ],
  '背中・二頭筋': [
    { id: 'latpull', name: 'ラットプルダウン', sets: 3, reps: 12, rest: 60 },
    { id: 'row', name: 'シーテッドロウ', sets: 3, reps: 12, rest: 60 },
    { id: 'curl', name: 'ダンベルカール', sets: 3, reps: 12, rest: 45 },
  ],
  '脚・臀部': [
    { id: 'squat', name: 'スクワット', sets: 4, reps: 10, rest: 90 },
    { id: 'legpress', name: 'レッグプレス', sets: 3, reps: 12, rest: 60 },
    { id: 'lunge', name: 'ランジ', sets: 3, reps: 10, rest: 60 },
  ],
  'プッシュ系': [
    { id: 'pushup', name: 'Push-up', sets: 3, reps: 12, rest: 60 },
    { id: 'pike', name: 'Pike Push-up', sets: 3, reps: 10, rest: 60 },
    { id: 'dips', name: 'Chair Dips', sets: 3, reps: 12, rest: 45 },
  ],
  'プル系': [
    { id: 'invrow', name: 'Inverted Row', sets: 3, reps: 12, rest: 60 },
    { id: 'superman', name: 'Superman Hold', sets: 3, reps: 15, rest: 45 },
    { id: 'backext', name: 'Back Extension', sets: 3, reps: 15, rest: 45 },
  ],
  '脚・体幹': [
    { id: 'squat', name: 'Squat', sets: 4, reps: 15, rest: 60 },
    { id: 'lunge', name: 'Lunge', sets: 3, reps: 12, rest: 60 },
    { id: 'plank', name: 'Plank', sets: 3, reps: 45, rest: 45 },
  ],
  '全身HIIT': [
    { id: 'burpee', name: 'Burpee', sets: 4, reps: 10, rest: 30 },
    { id: 'jumpsquat', name: 'Jump Squat', sets: 3, reps: 15, rest: 30 },
    { id: 'mtclimb', name: 'Mountain Climber', sets: 3, reps: 20, rest: 30 },
  ],
  'コア強化': [
    { id: 'plank', name: 'Plank', sets: 3, reps: 60, rest: 45 },
    { id: 'crunch', name: 'Crunch', sets: 3, reps: 20, rest: 30 },
    { id: 'legrise', name: 'Leg Raise', sets: 3, reps: 15, rest: 45 },
  ],
  '全身': [
    { id: 'squat', name: 'Squat', sets: 3, reps: 12, rest: 60 },
    { id: 'pushup', name: 'Push-up', sets: 3, reps: 12, rest: 60 },
    { id: 'plank', name: 'Plank', sets: 3, reps: 45, rest: 45 },
  ],
  '上半身': [
    { id: 'pushup', name: 'Push-up', sets: 3, reps: 15, rest: 60 },
    { id: 'row', name: 'Dumbbell Row', sets: 3, reps: 10, rest: 60 },
    { id: 'shoulder', name: 'Shoulder Press', sets: 3, reps: 12, rest: 60 },
  ],
  '下半身': [
    { id: 'squat', name: 'Squat', sets: 4, reps: 12, rest: 60 },
    { id: 'lunge', name: 'Lunge', sets: 3, reps: 10, rest: 60 },
    { id: 'calf', name: 'Calf Raise', sets: 3, reps: 20, rest: 30 },
  ],
};

const getExercisesForBodyPart = (bodyPart: string): Exercise[] => {
  return EXERCISE_DB[bodyPart] || EXERCISE_DB['全身'];
};

export default function TodayScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();

  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadData = () => {
        try {
          // 今日の完了状態を確認
          const todayLog = getTodayLog();
          if (todayLog?.completed) {
            setIsCompleted(true);
          } else {
            setIsCompleted(false);
          }
          
          // Day番号を計算（ログの長さ + 1）
          const logs = getDailyLogs(30);
          setDayNumber(logs.length + 1);

          const savedPlans = getWeeklyPlan();
          const today = new Date();
          const todayDateStr = `${today.getMonth() + 1}/${today.getDate()}`;

          if (savedPlans.length > 0) {
            // プランの日付が今日と一致するか確認
            const todayPlanData = savedPlans.find(p => p.date === todayDateStr);
            if (todayPlanData) {
              setTodayPlan(todayPlanData);

              if (!todayPlanData.isRestDay) {
                const exerciseList = getExercisesForBodyPart(todayPlanData.bodyPart);
                setExercises(exerciseList);
              }
            } else {
              // プランが古い場合は再生成
              regenerateAndSetPlan();
            }
          } else {
            // プランがない場合は再生成
            regenerateAndSetPlan();
          }
        } catch (error) {
          console.warn('Failed to load data', error);
          // エラー時はデフォルトのトレーニングを設定
          setDefaultTraining();
        }
    };

    const regenerateAndSetPlan = () => {
      const today = new Date();
      const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
      const REST_WEEKDAYS = [0, 2]; // 日曜日と火曜日が休息日

      // ユーザープロフィールを読み込み
      let sessionMinutes = 40;
      let environment = '自宅（自重）';
      const profile = getProfile();
      if (profile) {
        sessionMinutes = profile.sessionMinutes || 40;
        environment = profile.environment || '自宅（自重）';
      }

      // 曜日ごとのトレーニング部位を取得
      const getBodyPartForWeekday = (weekday: number): string => {
        if (environment === 'ジム（マシンあり）') {
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

      const todayWeekday = today.getDay();
      const isRestDay = REST_WEEKDAYS.includes(todayWeekday);
      const bodyPart = isRestDay ? '休息日' : getBodyPartForWeekday(todayWeekday);

      const defaultPlan: DayPlan = {
        dayOfWeek: WEEKDAYS[todayWeekday],
        date: `${today.getMonth() + 1}/${today.getDate()}`,
        bodyPart,
        totalMinutes: isRestDay ? 0 : sessionMinutes,
        isRestDay,
      };

      setTodayPlan(defaultPlan);
      if (!isRestDay) {
        setExercises(getExercisesForBodyPart(bodyPart));
      }

      // 新しい週間プランを生成して保存
      const newPlans: DBDayPlan[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const weekday = date.getDay();
        const dayIsRestDay = REST_WEEKDAYS.includes(weekday);

        newPlans.push({
          dayOfWeek: WEEKDAYS[weekday],
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          bodyPart: dayIsRestDay ? '休息日' : getBodyPartForWeekday(weekday),
          totalMinutes: dayIsRestDay ? 0 : sessionMinutes,
          isRestDay: dayIsRestDay,
        });
      }

      saveWeeklyPlan(newPlans);
    };

    const setDefaultTraining = () => {
      const today = new Date();
      const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
      const defaultPlan: DayPlan = {
        dayOfWeek: WEEKDAYS[today.getDay()],
        date: `${today.getMonth() + 1}/${today.getDate()}`,
        bodyPart: '上半身',
        totalMinutes: 40,
        isRestDay: false,
      };
      setTodayPlan(defaultPlan);
      setExercises(getExercisesForBodyPart('上半身'));
    };

      loadData();
    }, [])
  );

  const allFinished = useMemo(() => {
    return exercises.length > 0 && completedIds.size === exercises.length;
  }, [exercises, completedIds]);

  const toggleExercise = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleComplete = () => {
    // フィードバックを保存
    if (feedback) {
      try {
        saveFeedback(feedback);
      } catch (error) {
        console.warn('Failed to save feedback', error);
      }
    }

    setIsCompleted(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      saveDailyLog({ date: today, completed: true, feedback: feedback || undefined });
    } catch (error) {
      console.warn('Failed to save completion', error);
    }
  };

  const resetToday = () => {
    setIsCompleted(false);
    setCompletedIds(new Set());

    // 今日の完了状態をリセット
    try {
      const today = new Date().toISOString().slice(0, 10);
      saveDailyLog({ date: today, completed: false });
    } catch (error) {
      console.warn('Failed to reset', error);
    }
  };

  // 完了画面
  if (isCompleted) {
    return (
      <View style={[styles.container, styles.centeredContainer, { backgroundColor, paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.completedContent}>
          <View style={styles.completedIcon}>
            <IconSymbol name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={[styles.completedTitle, { color: textColor }]}>完了！</Text>
          <Text style={[styles.completedSubtitle, { color: textColor + '70' }]}>
            お疲れ様でした{'\n'}明日も頑張りましょう
          </Text>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: textColor + '30' }]}
            onPress={resetToday}
            activeOpacity={0.8}
          >
            <Text style={[styles.resetButtonText, { color: textColor }]}>もう一度やる</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 休息日画面
  if (todayPlan?.isRestDay) {
    return (
      <View style={[styles.container, styles.centeredContainer, { backgroundColor, paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.restContent}>
          <Text style={styles.restEmoji}>🧘</Text>
          <Text style={[styles.restTitle, { color: textColor }]}>Rest Day</Text>
          <Text style={[styles.restSubtitle, { color: textColor + '60' }]}>
            今日は休息日です{'\n'}体を休めて明日に備えましょう
          </Text>
        </View>
      </View>
    );
  }

  // メイントレーニング画面
  return (
    <View style={[styles.container, { backgroundColor, paddingTop: Math.max(insets.top, 16) }]}>
      {/* ① ヘッダー（最小） */}
      <View style={styles.header}>
        <Text style={[styles.headerTop, { color: textColor + '60' }]}>
          Today • Day {dayNumber}
        </Text>
        <Text style={[styles.headerBodyPart, { color: textColor }]}>
          {todayPlan?.bodyPart || 'Upper Body'}
        </Text>
        <Text style={[styles.headerTime, { color: textColor + '50' }]}>
          約{todayPlan?.totalMinutes || 40}分
        </Text>
      </View>

      {/* ② 種目リスト（メイン） */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exercises.map((exercise) => {
          const isDone = completedIds.has(exercise.id);
          const isExpanded = expandedIds.has(exercise.id);
          const guide = EXERCISE_GUIDE[exercise.id];
          
          return (
            <View
              key={exercise.id}
              style={[
                styles.exerciseCard,
                { borderColor: isDone ? '#10B981' : textColor + '12' },
                isDone && styles.exerciseCardDone,
              ]}
            >
              <View style={styles.exerciseRow}>
                {/* 左側：種目情報（タップで完了） */}
                <TouchableOpacity
                  style={styles.exerciseMain}
                  onPress={() => toggleExercise(exercise.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.exerciseName,
                      { color: textColor },
                      isDone && styles.exerciseNameDone,
                    ]}
                  >
                    {exercise.name}
                  </Text>
                  {guide && (
                    <Text style={[styles.shortDesc, { color: textColor + '60' }]}>
                      {guide.shortDesc}
                    </Text>
                  )}
                  <Text style={[styles.exerciseDetails, { color: textColor + '70' }]}>
                    {exercise.sets} sets × {exercise.reps} {exercise.id === 'plank' ? 'sec' : 'reps'}
                  </Text>
                  <Text style={[styles.exerciseRest, { color: textColor + '50' }]}>
                    Rest {exercise.rest} sec
                  </Text>
                </TouchableOpacity>

                {/* 右側：アイコン群 */}
                <View style={styles.iconGroup}>
                  {/* Info アイコン */}
                  {guide && (
                    <TouchableOpacity
                      style={[
                        styles.infoButton,
                        isExpanded && styles.infoButtonActive,
                      ]}
                      onPress={() => toggleExpand(exercise.id)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        name="info.circle"
                        size={22}
                        color={isExpanded ? '#fff' : '#FF6B35'}
                      />
                    </TouchableOpacity>
                  )}

                  {/* チェックボックス */}
                  <TouchableOpacity
                    style={[
                      styles.checkBox,
                      { borderColor: isDone ? '#10B981' : textColor + '25' },
                      isDone && styles.checkBoxDone,
                    ]}
                    onPress={() => toggleExercise(exercise.id)}
                    activeOpacity={0.7}
                  >
                    {isDone && <IconSymbol name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 展開された説明 */}
              {isExpanded && guide && (
                <View style={styles.guideContent}>
                  <Text style={[styles.guideText, { color: textColor + '80' }]}>
                    {guide.howTo}
                  </Text>
                  <View style={[styles.guideTipBox, { backgroundColor: '#FF6B3510' }]}>
                    <Text style={styles.guideTipText}>💡 {guide.tips}</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* ⑤ オプション：フィードバック（折りたたみ） */}
        <TouchableOpacity
          style={[styles.feedbackToggle, { borderColor: textColor + '15' }]}
          onPress={() => setShowFeedback(!showFeedback)}
          activeOpacity={0.7}
        >
          <Text style={[styles.feedbackToggleText, { color: textColor + '60' }]}>
            今日の感想を残す（任意）
          </Text>
          <IconSymbol
            name={showFeedback ? 'chevron.up' : 'chevron.down'}
            size={16}
            color={textColor + '40'}
          />
        </TouchableOpacity>

        {showFeedback && (
          <View style={styles.feedbackOptions}>
            {[
              { key: 'hard', label: 'きつかった', emoji: '😮‍💨' },
              { key: 'normal', label: '普通', emoji: '😊' },
              { key: 'easy', label: '余裕', emoji: '💪' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.feedbackButton,
                  { borderColor: feedback === option.key ? '#FF6B35' : textColor + '15' },
                  feedback === option.key && styles.feedbackButtonActive,
                ]}
                onPress={() => setFeedback(option.key as Feedback)}
                activeOpacity={0.7}
              >
                <Text style={styles.feedbackEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.feedbackLabel,
                    { color: feedback === option.key ? '#FF6B35' : textColor + '70' },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ④ CTA（固定） */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[styles.completeButton, !allFinished && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={!allFinished}
          activeOpacity={0.85}
        >
          <Text style={styles.completeButtonText}>今日は完了</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    justifyContent: 'center',
  },

  // ヘッダー
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 6,
  },
  headerTop: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerBodyPart: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  headerTime: {
    fontSize: 15,
    marginTop: 2,
  },

  // 種目リスト
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  exerciseCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  exerciseCardDone: {
    backgroundColor: '#10B98108',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseMain: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
  },
  shortDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseNameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  exerciseDetails: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseRest: {
    fontSize: 12,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonActive: {
    backgroundColor: '#FF6B35',
  },
  guideContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 10,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 22,
  },
  guideTipBox: {
    padding: 10,
    borderRadius: 8,
  },
  guideTipText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#FF6B35',
  },
  checkBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },

  // フィードバック
  feedbackToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  feedbackToggleText: {
    fontSize: 14,
  },
  feedbackOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  feedbackButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  feedbackButtonActive: {
    backgroundColor: '#FF6B3510',
  },
  feedbackEmoji: {
    fontSize: 24,
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // CTA
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  completeButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#FF6B3535',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // 完了画面
  completedContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  completedIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 32,
    fontWeight: '800',
  },
  completedSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  resetButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 休息日
  restContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  restEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  restTitle: {
    fontSize: 32,
    fontWeight: '800',
  },
  restSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
