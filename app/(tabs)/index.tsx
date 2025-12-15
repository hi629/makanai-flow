import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

const quickIngredientOptions = ['chicken', 'onion', 'rice', 'yogurt', 'tomato', 'egg', 'spinach'];

const comfortLevels = [
  { key: 'low', label: '現地寄せ', description: 'ローカル味でもOK' },
  { key: 'medium', label: 'どちらでも', description: '慣れた味と現地の間' },
  { key: 'high', label: '慣れ重視', description: '馴染みの味を優先' },
];

type EffortLevel = 'low' | 'normal' | 'high';

type MealIdea = {
  title: string;
  used: string[];
  missing: string[];
  steps: string[];
  effortTag: string;
  safety: string;
};

export default function HomeScreen() {
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'background');

  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [mode, setMode] = useState<'fridge' | 'supermarket'>('fridge');
  const [ingredientsInput, setIngredientsInput] = useState('chicken, onion, yogurt');
  const [effort, setEffort] = useState<EffortLevel>('low');
  const [localOk, setLocalOk] = useState(true);
  const [comfortPriority, setComfortPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [country, setCountry] = useState('Georgia');
  const [ideas, setIdeas] = useState<MealIdea[]>([]);

  useEffect(() => {
    const loadPreferences = async () => {
      const saved = await AsyncStorage.getItem('preferred_cuisines');
      if (saved) {
        try {
          setPreferredCuisines(JSON.parse(saved));
        } catch (error) {
          console.warn('Failed to parse cuisines', error);
        }
      }
    };

    loadPreferences();
  }, []);

  const ingredients = useMemo(
    () =>
      ingredientsInput
        .split(/[\,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [ingredientsInput]
  );

  const quickAddIngredient = (item: string) => {
    if (ingredients.includes(item)) return;
    setIngredientsInput((prev) => (prev ? `${prev}, ${item}` : item));
  };

  const buildIdeas = (): MealIdea[] => {
    const baseIdeas: MealIdea[] = [
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
    ];

    const ingredientSet = new Set(ingredients);

    return baseIdeas
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

  const handleGenerate = () => {
    const generated = buildIdeas();
    setIdeas(generated);
  };

  const shoppingList = useMemo(() => {
    if (mode !== 'supermarket') return [] as string[];
    const missingAll = ideas.flatMap((idea) => idea.missing);
    return Array.from(new Set(missingAll)).filter(Boolean);
  }, [ideas, mode]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.appTitle, { color: textColor }]}>今日〜数日を成立させる</Text>
        <View style={styles.badge}>
          <IconSymbol name="wand.and.stars" color="#fff" size={16} />
          <Text style={styles.badgeText}>食材起点</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={styles.cardTitle}>起点を選ぶ</Text>
        <View style={styles.row}>
          {(['fridge', 'supermarket'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.modeButton,
                mode === option && styles.modeButtonActive,
              ]}
              onPress={() => setMode(option)}
            >
              <Text style={styles.modeEmoji}>{option === 'fridge' ? '🧊' : '🛒'}</Text>
              <Text style={styles.modeLabel}>{option === 'fridge' ? '冷蔵庫にあるもので' : 'スーパーで買って'}</Text>
              <Text style={styles.modeHint}>
                {option === 'fridge'
                  ? 'あるもの優先 / 余らせない'
                  : '不足分だけ買い足す'}
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
      </View>

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
              style={styles.chip}
              onPress={() => quickAddIngredient(item)}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={styles.cardTitle}>状態と制約</Text>
        <Text style={styles.sectionLabel}>作る気力</Text>
        <View style={styles.row}>
          {(['low', 'normal', 'high'] as EffortLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.pill,
                effort === level && styles.pillActive,
              ]}
              onPress={() => setEffort(level)}
            >
              <Text style={styles.pillText}>
                {level === 'low' ? '低' : level === 'normal' ? '普通' : '高'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>モード制約</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggle, localOk && styles.toggleActive]}
            onPress={() => setLocalOk((prev) => !prev)}
          >
            <Text style={styles.toggleEmoji}>🌍</Text>
            <Text style={styles.toggleLabel}>現地料理OK</Text>
          </TouchableOpacity>
          <View style={styles.toggle}>
            <Text style={styles.toggleEmoji}>🍲</Text>
            <Text style={styles.toggleLabel}>慣れた国: {preferredCuisines.join(', ') || '未選択'}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>慣れ度バランス</Text>
        <View style={styles.row}>
          {comfortLevels.map((level) => (
            <TouchableOpacity
              key={level.key}
              style={[
                styles.comfortCard,
                comfortPriority === level.key && styles.comfortCardActive,
              ]}
              onPress={() => setComfortPriority(level.key as typeof comfortPriority)}
            >
              <Text style={styles.comfortLabel}>{level.label}</Text>
              <Text style={styles.comfortHint}>{level.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleGenerate}>
        <IconSymbol name="sparkles" size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>AIで提案を生成</Text>
      </TouchableOpacity>

      {ideas.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={styles.cardTitle}>今日〜明日の食事案</Text>
          {ideas.map((idea) => (
            <View key={idea.title} style={styles.idea}>
              <View style={styles.ideaHeader}>
                <Text style={styles.ideaTitle}>{idea.title}</Text>
                <Text style={styles.ideaEffort}>{idea.effortTag}</Text>
              </View>
              <Text style={styles.ideaLabel}>使用食材: {idea.used.join(', ') || 'なし'}</Text>
              <Text style={styles.ideaLabel}>不足食材: {idea.missing.join(', ') || 'なし'}</Text>
              <View style={styles.stepList}>
                {idea.steps.slice(0, 5).map((step, index) => (
                  <Text key={step} style={styles.stepText}>
                    {index + 1}. {step}
                  </Text>
                ))}
              </View>
              <View style={styles.safetyRow}>
                <IconSymbol name="checkmark.shield" color="#0a7ea4" size={16} />
                <Text style={styles.safetyText}>{idea.safety}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {shoppingList.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={styles.cardTitle}>スーパーで買う不足分</Text>
          <Text style={styles.helperText}>{country} で揃いやすい最小構成</Text>
          <View style={styles.quickList}>
            {shoppingList.map((item) => (
              <View key={item} style={styles.chipSecondary}>
                <Text style={styles.chipSecondaryText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  modeButton: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#f5f6f7',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  modeButtonActive: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: '#e8f6fb',
  },
  modeEmoji: {
    fontSize: 20,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modeHint: {
    fontSize: 12,
    color: '#555',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#eef6f9',
  },
  chipText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  chipSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  chipSecondaryText: {
    fontSize: 13,
    color: '#333',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
  },
  pillActive: {
    backgroundColor: '#0a7ea4',
  },
  pillText: {
    color: '#111',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f6f7',
  },
  toggleActive: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: '#e8f6fb',
  },
  toggleEmoji: {
    fontSize: 18,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  comfortCard: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    gap: 4,
  },
  comfortCardActive: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: '#eaf6fb',
  },
  comfortLabel: {
    fontWeight: '700',
  },
  comfortHint: {
    fontSize: 12,
    color: '#444',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  idea: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
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
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  ideaLabel: {
    fontSize: 13,
    color: '#333',
  },
  stepList: {
    gap: 4,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  safetyText: {
    fontSize: 12,
    color: '#0a7ea4',
  },
});
