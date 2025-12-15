import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

const initialFridge = [
  { name: '鶏もも肉', purchasedAt: '2024-05-31', priority: 'red' as const, favorite: true },
  { name: 'ヨーグルト', purchasedAt: '2024-06-01', priority: 'yellow' as const, favorite: false },
  { name: '玉ねぎ', purchasedAt: '2024-05-28', priority: 'green' as const, favorite: true },
  { name: 'ほうれん草', purchasedAt: '2024-06-02', priority: 'yellow' as const, favorite: false },
];

const priorityCopy = {
  red: '優先消費',
  yellow: 'なるべく早く',
  green: '余裕あり',
};

type FridgeItem = (typeof initialFridge)[number];

type Settings = {
  country: string;
  language: string;
};

export default function PantryScreen() {
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'background');
  const insets = useSafeAreaInsets();

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(initialFridge);
  const [settings, setSettings] = useState<Settings>({ country: 'Georgia', language: '日本語' });
  const [notes, setNotes] = useState('不足食材はメモを残しておく');

  useEffect(() => {
    const loadSettings = async () => {
      const storedCountry = await AsyncStorage.getItem('user_country');
      const storedLanguage = await AsyncStorage.getItem('user_language');
      setSettings((prev) => ({
        country: storedCountry || prev.country,
        language: storedLanguage || prev.language,
      }));
    };

    loadSettings();
  }, []);

  const toggleFavorite = (itemName: string) => {
    setFridgeItems((prev) =>
      prev.map((item) =>
        item.name === itemName ? { ...item, favorite: !item.favorite } : item
      )
    );
  };

  const saveSettings = async () => {
    await AsyncStorage.setItem('user_country', settings.country);
    await AsyncStorage.setItem('user_language', settings.language);
  };

  const changeSetting = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>冷蔵庫管理 & スーパー起点</Text>
        <View style={styles.badge}>
          <IconSymbol name="refrigerator" color="#fff" size={16} />
          <Text style={styles.badgeText}>ローカル保存</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={styles.cardTitle}>冷蔵庫の中身（優先度つき）</Text>
        <Text style={styles.helperText}>賞味期限管理はせず、優先度のみを表示します</Text>
        {fridgeItems.map((item) => (
          <View key={item.name} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>購入日: {item.purchasedAt}</Text>
              <View style={styles.priorityRow}>
                <View style={[styles.dot, styles[`dot_${item.priority}` as const]]} />
                <Text style={styles.priorityText}>{priorityCopy[item.priority]}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.favoriteButton, item.favorite && styles.favoriteActive]}
              onPress={() => toggleFavorite(item.name)}
            >
              <Text style={styles.favoriteText}>{item.favorite ? 'よく使う' : '設定'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={styles.cardTitle}>スーパー起点メモ</Text>
        <Text style={styles.helperText}>位置情報は使わず、今いる国とメモだけを保存します</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>国・都市</Text>
          <TextInput
            value={settings.country}
            onChangeText={(text) => changeSetting('country', text)}
            style={styles.input}
            placeholder="例: Georgia / Tbilisi"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>メモ（揃えやすい食材やブランド）</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[styles.input, { minHeight: 80 }]}
            placeholder="例: プレーンヨーグルトは〇〇メーカーが手頃"
          />
        </View>
        <View style={styles.shopTip}>
          <IconSymbol name="cart" size={16} color="#0a7ea4" />
          <Text style={styles.tipText}>
            不足分だけの買い物リストをHomeタブで自動作成します
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={styles.cardTitle}>設定（国・言語のみ）</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>国</Text>
          <TextInput
            value={settings.country}
            onChangeText={(text) => changeSetting('country', text)}
            style={styles.input}
            placeholder="現在地を入力"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>言語</Text>
          <TextInput
            value={settings.language}
            onChangeText={(text) => changeSetting('language', text)}
            style={styles.input}
            placeholder="例: 日本語 / English"
          />
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={saveSettings}>
          <IconSymbol name="checkmark" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>保存して続行</Text>
        </TouchableOpacity>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    gap: 4,
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 12,
    color: '#666',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityText: {
    fontSize: 12,
    color: '#333',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  dot_red: {
    backgroundColor: '#ff6b6b',
  },
  dot_yellow: {
    backgroundColor: '#f2c94c',
  },
  dot_green: {
    backgroundColor: '#6fcf97',
  },
  favoriteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f5f6f7',
  },
  favoriteActive: {
    backgroundColor: '#e8f6fb',
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  favoriteText: {
    fontWeight: '600',
    color: '#0a7ea4',
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
  shopTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#eef6f9',
  },
  tipText: {
    fontSize: 13,
    color: '#0a7ea4',
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
