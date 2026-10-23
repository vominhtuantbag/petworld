import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { GlowButton } from '../components/GlowButton';
import { RegionCard } from '../components/RegionCard';
import { SetupHeader } from '../components/SetupHeader';
import { listStarterRegions } from '../data/regions';
import { ApiError } from '../net/api';
import { useAuth } from '../state/AuthContext';
import { useSetup } from '../state/SetupContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

const STARTERS = listStarterRegions();
const COLUMNS = 5;

/**
 * Screen 2. The ten starter towns sit in two rows and fill the space
 * between the summary and the footer, so the list does not scroll.
 */
export function RegionSelectionScreen() {
  const { s, font, compact } = useLayout();
  const setup = useSetup();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gap = s(8);
  const rows = rowsOf(STARTERS, COLUMNS);

  const hint = error
    ? error
    : setup.canStart
      ? `Vào thị trấn ${setup.region?.nameVi} với tên ${setup.name.trim()}.`
      : 'Chọn vùng xuất phát. Nút vào game sáng khi đã chọn một vùng.';

  const start = async () => {
    const snapshot = setup.buildSnapshot();
    if (!snapshot || busy) return;
    setBusy(true);
    setError(null);
    try {
      await auth.saveCharacter(snapshot);
      setup.startGame();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Không lưu được nhân vật. Hãy kiểm tra máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <SetupHeader title="Chọn vùng xuất phát" stepLabel="2 / 2" onBack={setup.goToCharacter} />
      <View style={[styles.body, { padding: s(10), gap: s(8) }]}>
        {setup.character ? (
          <View style={[styles.summary, { gap: s(8), borderRadius: s(12), paddingHorizontal: s(8), paddingVertical: s(4) }]}>
            <CharacterAvatar
              character={setup.character}
              hairColor={setup.hairHex}
              outfitColor={setup.outfitHex}
              size={compact ? s(36) : s(44)}
            />
            <View style={styles.summaryText}>
              <Text style={[styles.summaryName, { fontSize: font(15) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {setup.name.trim()}
              </Text>
              <Text style={[styles.summaryMeta, { fontSize: font(11) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                {setup.character.title} · {setup.gender === 'male' ? 'Nam' : 'Nữ'} · tóc {setup.hairLabel} · áo {setup.outfitLabel}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.grid, { gap }]}>
          {rows.map((row) => (
            <View key={row[0]?.id ?? 'row'} style={[styles.gridRow, { gap }]}>
              {row.map((region) => (
                <RegionCard
                  key={region.id}
                  region={region}
                  selected={setup.region?.id === region.id}
                  onPress={() => setup.selectRegion(region.id)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={[styles.footer, { paddingHorizontal: s(16), paddingVertical: s(6), gap: s(10) }]}>
        <Text style={[styles.hint, { fontSize: font(12) }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
          {hint}
        </Text>
        <GlowButton
          testID="start-button"
          label={busy ? 'Đang lưu...' : 'Vào game'}
          enabled={setup.canStart && !busy}
          onPress={() => {
            void start();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function rowsOf<T>(items: readonly T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) rows.push(items.slice(index, index + columns));
  return rows;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1, minHeight: 0 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.lineSoft,
  },
  summaryText: { flex: 1, minWidth: 0 },
  summaryName: { color: theme.ink, fontWeight: '700' },
  summaryMeta: { color: theme.muted },
  grid: { flex: 1, minHeight: 0 },
  gridRow: { flex: 1, minHeight: 0, flexDirection: 'row' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.lineSoft,
  },
  hint: { flex: 1, color: theme.muted },
});
