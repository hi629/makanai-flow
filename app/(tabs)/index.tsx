import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

const quickIngredientOptions = ['chicken', 'onion', 'rice', 'yogurt', 'tomato', 'egg', 'spinach'];

const comfortLevels = [
  { key: 'low', label: '現地寄せ', description: 'ローカル味でもOK' },
  { key: 'medium', label: 'どちらでも', description: '慣れた味と現地の間' },
  { key: 'high', label: '慣れ重視', description: '馴染みの味を優先' },
];

const fridgeInventory = [
  { name: '鶏もも肉', purchasedAt: '2024-05-31', priority: 'red' as const },
  { name: 'ヨーグルト', purchasedAt: '2024-06-01', priority: 'yellow' as const },
  { name: '玉ねぎ', purchasedAt: '2024-05-28', priority: 'green' as const },
  { name: 'ほうれん草', purchasedAt: '2024-06-02', priority: 'yellow' as const },
];

const priorityCopy = {
  red: '優先消費',
  yellow: 'なるべく早く',
  green: '余裕あり',
};

type EffortLevel = 'low' | 'normal' | 'high';

type MealIdea = {
  title: string;
  used: string[];
  missing: string[];
  steps: string[];
  effortTag: string;
  safety: string;
};

type FlowPayload = {
  mode: 'fridge' | 'supermarket';
  ingredientsInput: string;
  effort: EffortLevel;
  localOk: boolean;
  comfortPriority: 'low' | 'medium' | 'high';
  country: string;
};

type AppStep = 'start' | 'ingredients' | 'prep' | 'suggestions';

const ideaPool: MealIdea[] = [
  {
    title: '温かいヨーグルトマリネ焼き',
    used: ['chicken', 'yogurt', 'onion'],
    missing: ['flatbread'],
    steps: [
      '鶏肉をヨーグルトと塩で10分漬ける',
      '玉ねぎと一緒に焼き色をつける',
      'フラットブレッドで巻く',
      '酸味が強い時は塩を足す',
      'ヨーグルトは焦げやすいので弱火',
    ],
    effortTag: '手間:低 / 回復度:やさしい',
    safety: '焦げ防止に弱火。味は塩で微調整',
  },
  {
    title: '玉ねぎ甘辛炒めのワンプレート',
    used: ['onion', 'rice', 'egg'],
    missing: ['soy sauce'],
    steps: [
      '玉ねぎを多めの油でしんなりまで炒める',
      '卵を半熟まで絡める',
      'ご飯に乗せてソースを回しかける',
      '青みが欲しければ冷凍野菜を足す',
      '器は1枚にまとめる',
    ],
    effortTag: '手間:ふつう / 回復度:中',
    safety: '水分を飛ばしすぎないと失敗しにくい',
  },
  {
    title: '市場風トマトスープ',
    used: ['tomato', 'spinach', 'onion'],
    missing: ['stock cube', 'bread'],
    steps: [
      '玉ねぎとトマトを刻んで煮る',
      'スープの素で味を合わせる',
      'ほうれん草を最後に入れて色を残す',
      'パンを添えて主食代わりに',
      '辛味は胡椒だけで簡単に',
    ],
    effortTag: '手間:低 / 回復度:温かい',
    safety: '味が薄いときは塩ではなく旨味を足す',
  },
  {
    title: '素朴な野菜炒めプレート',
    used: ['spinach', 'onion', 'egg'],
    missing: ['bread'],
    steps: [
      '玉ねぎを油で甘くなるまで炒める',
      '卵でとじてふんわり仕上げる',
      '最後にほうれん草をさっと合わせる',
      'パンかご飯に乗せてワンプレートに',
      '味は塩コショウのみで完結',
    ],
    effortTag: '手間:低 / 回復度:軽め',
    safety: '火を入れすぎず色を残す',
  },
];

export default function HomeScreen() {
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [mode, setMode] = useState<'fridge' | 'supermarket'>('fridge');
  const [ingredientsInput, setIngredientsInput] = useState('chicken, onion, yogurt');
  const [effort, setEffort] = useState<EffortLevel>('low');
  const [localOk, setLocalOk] = useState(true);
  const [comfortPriority, setComfortPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [country, setCountry] = useState('Georgia');
  const [ideas, setIdeas] = useState<MealIdea[]>([]);
  const [currentStep, setCurrentStep] = useState<AppStep>('start');
  const [resumeFlow, setResumeFlow] = useState<FlowPayload | null>(null);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);
  const [fridgeModalVisible, setFridgeModalVisible] = useState(false);

  useEffect(() => {
    const loadPreferencesAndFlow = async () => {
      const saved = await AsyncStorage.getItem('preferred_cuisines');
      const lastFlow = await AsyncStorage.getItem('last_flow');

      if (saved) {
        try {
          setPreferredCuisines(JSON.parse(saved));
        } catch (error) {
          console.warn('Failed to parse cuisines', error);
        }
      }

      if (lastFlow) {
        try {
          setResumeFlow(JSON.parse(lastFlow));
        } catch (error) {
          console.warn('Failed to parse last flow', error);
        }
      }
    };

    loadPreferencesAndFlow();
  }, []);

  const parsedIngredients = useMemo(
    () =>
      ingredientsInput
        .split(/[\,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [ingredientsInput]
  );

  const buildIdeasFrom = (list: string[]): MealIdea[] => {
    const ingredientSet = new Set(list);

    return ideaPool
      .map((idea) => {
        const used = idea.used.filter((item) => ingredientSet.has(item));
        const missing = idea.missing.filter((item) => !ingredientSet.has(item));

        return {
          ...idea,
          used,
          missing,
        };
      })
      .filter((idea) => idea.used.length > 0 || idea.missing.length > 0)
      .slice(0, 3);
  };

  const persistFlow = async (payload: FlowPayload) => {
    try {
      await AsyncStorage.setItem('last_flow', JSON.stringify(payload));
      setResumeFlow(payload);
    } catch (error) {
      console.warn('Failed to persist flow', error);
    }
  };

  const handleGenerate = () => {
    const generated = buildIdeasFrom(parsedIngredients);
    setIdeas(generated);
    setCurrentStep('suggestions');
    persistFlow({ mode, ingredientsInput, effort, localOk, comfortPriority, country });
  };

  const quickAddIngredient = (item: string) => {
    if (parsedIngredients.includes(item)) return;
    setIngredientsInput((prev) => (prev ? `${prev}, ${item}` : item));
  };

  const startWithMode = (selectedMode: 'fridge' | 'supermarket') => {
    setMode(selectedMode);
    setCurrentStep('ingredients');
  };

  const resumeLastFlow = () => {
    if (!resumeFlow) return;
    setMode(resumeFlow.mode);
    setIngredientsInput(resumeFlow.ingredientsInput);
    setEffort(resumeFlow.effort);
    setLocalOk(resumeFlow.localOk);
    setComfortPriority(resumeFlow.comfortPriority);
    setCountry(resumeFlow.country);
    const regenerated = buildIdeasFrom(
      resumeFlow.ingredientsInput
        .split(/[\,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
    setIdeas(regenerated);
    setCurrentStep('suggestions');
  };

  const shoppingList = useMemo(() => {
    if (mode !== 'supermarket') return [] as string[];
    const missingAll = ideas.flatMap((idea) => idea.missing);
    return Array.from(new Set(missingAll)).filter(Boolean);
  }, [ideas, mode]);

  const applySwapSelection = () => {
    const cleaned = swapSelection.filter(Boolean);
    setIngredientsInput(cleaned.join(', '));
    const regenerated = buildIdeasFrom(cleaned);
    setIdeas(regenerated);
    setSwapSheetOpen(false);
  };

  const renderStepIndicator = () => {
    const steps: { key: AppStep; label: string }[] = [
      { key: 'start', label: 'Start' },
      { key: 'ingredients', label: '食材入力' },
      { key: 'prep', label: 'Prep Sheet' },
      { key: 'suggestions', label: '提案' },
    ];

    return (
      <View style={styles.stepRow}>
        {steps.map((step) => (
          <View key={step.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                currentStep === step.key && styles.stepDotActive,
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                { color: currentStep === step.key ? '#0a7ea4' : textColor },
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderStartScreen = () => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <Text style={styles.cardTitle}>すぐに始める</Text>
      <Text style={styles.helperText}>起点を選ぶと次に食材入力へ進みます</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.quickCard, { borderColor: textColor + '20' }]}
          onPress={() => startWithMode('fridge')}
        >
          <Text style={styles.modeEmoji}>🧊</Text>
          <Text style={styles.modeLabel}>冷蔵庫のあるもので</Text>
          <Text style={styles.modeHint}>余らせない / 1タップで開始</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickCard, { borderColor: textColor + '20' }]}
          onPress={() => startWithMode('supermarket')}
        >
          <Text style={styles.modeEmoji}>🛒</Text>
          <Text style={styles.modeLabel}>スーパーで買って</Text>
          <Text style={styles.modeHint}>不足分だけのリスト生成</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.resumeButton, !resumeFlow && styles.resumeButtonDisabled]}
        onPress={resumeLastFlow}
        disabled={!resumeFlow}
      >
        <IconSymbol name="play.fill" color="#fff" size={16} />
        <Text style={styles.resumeText}>
          {resumeFlow ? '前回の続きから再開' : '前回の続きはありません'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderIngredientInput = () => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <Text style={styles.cardTitle}>食材入力（チェックリスト / テキスト）</Text>
      <TextInput
        value={ingredientsInput}
        onChangeText={setIngredientsInput}
        multiline
        placeholder="chicken, onion, yogurt"
        style={styles.input}
      />
      <View style={styles.quickList}>
        {quickIngredientOptions.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, parsedIngredients.includes(item) && styles.chipActive]}
            onPress={() => quickAddIngredient(item)}
          >
            <Text style={[styles.chipText, parsedIngredients.includes(item) && { color: '#fff' }]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'supermarket' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>買いに行く場所</Text>
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder="例: Georgia / Germany"
            style={styles.input}
          />
          <Text style={styles.helperText}>現地で揃えやすい構成を優先します</Text>
        </View>
      )}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep('start')}>
          <Text style={styles.secondaryText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentStep('prep')}>
          <Text style={styles.primaryButtonText}>Prep Sheetへ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrepSheet = () => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <Text style={styles.cardTitle}>Prep Sheet（状態入力）</Text>
      <View style={styles.row}>
        {(['low', 'normal', 'high'] as const).map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.modeButton, effort === level && styles.modeButtonActive]}
            onPress={() => setEffort(level)}
          >
            <Text style={styles.modeLabel}>
              気力: {level === 'low' ? '低' : level === 'normal' ? '普通' : '高'}
            </Text>
            <Text style={styles.modeHint}>
              {level === 'low' ? '洗い物を減らす' : level === 'normal' ? '定番通り' : '工程多めOK'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.toggle, localOk ? styles.toggleActive : null]}
          onPress={() => setLocalOk((prev) => !prev)}
        >
          <Text style={styles.toggleText}>現地味 OK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, !localOk ? styles.toggleActive : null]}
          onPress={() => setLocalOk((prev) => !prev)}
        >
          <Text style={styles.toggleText}>慣れた味 重視</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>慣れたい味の幅</Text>
      <View style={styles.row}>
        {comfortLevels.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[styles.chipLarge, comfortPriority === level.key && styles.chipLargeActive]}
            onPress={() => setComfortPriority(level.key as typeof comfortPriority)}
          >
            <Text style={styles.chipTitle}>{level.label}</Text>
            <Text style={styles.chipDescription}>{level.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {preferredCuisines.length > 0 && (
        <Text style={styles.helperText}>慣れた料理の方向性: {preferredCuisines.join(', ')}</Text>
      )}

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep('ingredients')}>
          <Text style={styles.secondaryText}>戻る</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGenerate}>
          <Text style={styles.primaryButtonText}>提案を生成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMealSuggestions = () => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.suggestionHeader}>
        <View>
          <Text style={styles.cardTitle}>今日〜明日の提案</Text>
          <Text style={styles.helperText}>
            {mode === 'fridge' ? 'あるもので回す' : `${country}で買いやすいものを優先`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setFridgeModalVisible(true)}>
          <Text style={styles.fridgeLink}>冷蔵庫を編集</Text>
        </TouchableOpacity>
      </View>

      {ideas.length === 0 && (
        <Text style={styles.helperText}>提案を表示するには「提案を生成」を押してください</Text>
      )}

      {ideas.map((idea, index) => (
        <View key={idea.title} style={styles.ideaCard}>
          <View style={styles.ideaHeader}>
            <Text style={styles.ideaTitle}>{idea.title}</Text>
            <Text style={styles.ideaEffort}>{idea.effortTag}</Text>
          </View>
          <Text style={styles.sectionLabel}>使うもの</Text>
          <Text style={styles.bodyText}>{idea.used.join(', ') || '未入力'}</Text>
          <Text style={styles.sectionLabel}>足りないもの</Text>
          <Text style={styles.bodyText}>{idea.missing.join(', ') || 'なし'}</Text>
          <Text style={styles.sectionLabel}>超簡易作り方</Text>
          {idea.steps.map((step) => (
            <Text key={step} style={styles.bodyText}>• {step}</Text>
          ))}
          <Text style={styles.safetyText}>{idea.safety}</Text>
          <View style={styles.ideaActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                const rotated = [...ideas];
                const regenerated = buildIdeasFrom(parsedIngredients);
                const swapCandidate = regenerated[(index + 1) % regenerated.length];
                if (swapCandidate) {
                  rotated[index] = swapCandidate;
                  setIdeas(rotated);
                }
              }}
            >
              <Text style={styles.secondaryText}>Show another</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setSwapSelection(parsedIngredients);
                setSwapSheetOpen(true);
              }}
            >
              <Text style={styles.primaryButtonText}>Swap ingredients</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {shoppingList.length > 0 && (
        <View style={styles.shoppingCard}>
          <Text style={styles.sectionLabel}>買い物リスト（不足分のみ）</Text>
          <Text style={styles.bodyText}>{shoppingList.join(', ')}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep('start')}>
        <Text style={styles.secondaryText}>Startに戻る</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}> 
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.appTitle, { color: textColor }]}>今日〜数日を成立させる</Text>
          <View style={styles.badge}>
            <IconSymbol name="wand.and.stars" color="#fff" size={16} />
            <Text style={styles.badgeText}>食材起点</Text>
          </View>
        </View>

        {renderStepIndicator()}

        {currentStep === 'start' && renderStartScreen()}
        {currentStep === 'ingredients' && renderIngredientInput()}
        {currentStep === 'prep' && renderPrepSheet()}
        {currentStep === 'suggestions' && renderMealSuggestions()}
      </ScrollView>

      <Modal visible={swapSheetOpen} animationType="slide" transparent>
        <View style={styles.bottomSheetBackdrop}>
          <View style={styles.bottomSheet}>
            <Text style={styles.cardTitle}>食材を入れ替える</Text>
            <Text style={styles.helperText}>新しい食材を選ぶとその場でカードを更新します</Text>
            <View style={styles.quickList}>
              {quickIngredientOptions.map((item) => {
                const active = swapSelection.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() =>
                      setSwapSelection((prev) =>
                        prev.includes(item)
                          ? prev.filter((p) => p !== item)
                          : [...prev, item]
                      )
                    }
                  >
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setSwapSheetOpen(false)}>
                <Text style={styles.secondaryText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={applySwapSelection}>
                <Text style={styles.primaryButtonText}>反映する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={fridgeModalVisible} animationType="slide" transparent>
        <View style={styles.bottomSheetBackdrop}>
          <View style={styles.bottomSheet}>
            <Text style={styles.cardTitle}>冷蔵庫の中身</Text>
            {fridgeInventory.map((item) => (
              <View key={item.name} style={styles.fridgeRow}>
                <View>
                  <Text style={styles.ideaTitle}>{item.name}</Text>
                  <Text style={styles.helperText}>購入日: {item.purchasedAt}</Text>
                </View>
                <View style={styles.priorityRow}>
                  <View style={[styles.dot, styles[`dot_${item.priority}` as const]]} />
                  <Text style={styles.priorityText}>{priorityCopy[item.priority]}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.primaryButton} onPress={() => setFridgeModalVisible(false)}>
              <Text style={styles.primaryButtonText}>閉じて続ける</Text>
            </TouchableOpacity>
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
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    borderRadius: 12,
  },
  modeButtonActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#E6F4F9',
  },
  modeEmoji: {
    fontSize: 32,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
  },
  quickList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  chipText: {
    color: '#111827',
  },
  chipLarge: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    borderRadius: 12,
  },
  chipLargeActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#E6F4F9',
  },
  chipTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  chipDescription: {
    color: '#6b7280',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '600',
  },
  quickCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  resumeButton: {
    marginTop: 8,
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  resumeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  resumeText: {
    color: '#fff',
    fontWeight: '700',
  },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  toggleActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#E6F4F9',
  },
  toggleText: {
    fontWeight: '700',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fridgeLink: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
  ideaCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  ideaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ideaTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  ideaEffort: {
    color: '#6b7280',
    fontSize: 12,
  },
  sectionLabel: {
    fontWeight: '700',
    marginTop: 4,
  },
  bodyText: {
    color: '#111827',
  },
  safetyText: {
    color: '#6b7280',
    fontSize: 12,
  },
  ideaActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  shoppingCard: {
    borderWidth: 1,
    borderColor: '#0a7ea4',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#E6F4F9',
    gap: 4,
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  stepDotActive: {
    backgroundColor: '#0a7ea4',
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  fridgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  dot_red: {
    backgroundColor: '#ef4444',
  },
  dot_yellow: {
    backgroundColor: '#f59e0b',
  },
  dot_green: {
    backgroundColor: '#10b981',
  },
  priorityText: {
    color: '#111827',
  },
});
