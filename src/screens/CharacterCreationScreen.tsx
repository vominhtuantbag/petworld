import { useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { ColorSwatches } from '../components/ColorSwatches';
import { GlowButton } from '../components/GlowButton';
import { SetupHeader } from '../components/SetupHeader';
import { characterFor, PROFESSIONS } from '../data/characters';
import { usePointerHover } from '../hooks/usePointerHover';
import { useSetup } from '../state/SetupContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import type { Gender } from '../types/game';

const GENDERS: { id: Gender; label: string; hint: string }[] = [
  { id: 'male', label: 'Nam', hint: 'Male' },
  { id: 'female', label: 'Nữ', hint: 'Female' },
];

/**
 * Screen 1. Profession, gender, name, and colors share one landscape view.
 * Rows flex inside the space under the header, so a short phone does not scroll.
 */
export function CharacterCreationScreen() {
  const { s, font, height, width } = useLayout();
  const setup = useSetup();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const gap = s(6);
  const bodyH = box.h || Math.max(160, height - s(108));
  const bodyW = box.w || width;
  const leftW = Math.max(s(156), Math.min(s(240), Math.round(bodyW * 0.3)));
  const studioW = Math.max(0, bodyW - leftW - gap);
  const columns = studioW >= 540 ? 6 : studioW >= 340 ? 4 : 3;
  const fitted = fitIdentity(bodyH);
  const genderLabel = setup.gender === 'male' ? 'Nam' : setup.gender === 'female' ? 'Nữ' : '';

  const hint = setup.canContinue
    ? `${setup.name.trim()} · ${setup.profession?.title ?? ''} · ${genderLabel}. Tiếp theo là vùng xuất phát.`
    : 'Chọn nghề, giới tính và nhập tên để tiếp tục.';

  const continueToRegion = () => {
    Keyboard.dismiss();
    setup.goToRegion();
  };

  const jobRows = rowsOf(PROFESSIONS, columns);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <SetupHeader title="Tạo nhân vật" stepLabel="1 / 2" />
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[styles.columns, { paddingHorizontal: s(12), paddingVertical: s(6), gap }]}
          onLayout={(event) => {
            const { width: nextW, height: nextH } = event.nativeEvent.layout;
            setBox((prev) => (prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }));
          }}
        >
          <View style={[styles.identity, { width: leftW, gap: s(4) }]}>
            <Text style={[styles.identityTitle, { fontSize: font(15) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {setup.profession ? `${setup.profession.title}${genderLabel ? ` · ${genderLabel}` : ''}` : 'Nhân vật mới'}
            </Text>
            <View style={styles.identityRow}>
              <View style={[styles.previewSlot, { width: Math.round(fitted.avatar / 1.22) + 4 }]}>
                {setup.character ? (
                  <CharacterAvatar
                    character={setup.character}
                    hairColor={setup.hairHex}
                    outfitColor={setup.outfitHex}
                    size={Math.round(fitted.avatar / 1.22)}
                  />
                ) : null}
              </View>
              <TextInput
                testID="character-name-input"
                value={setup.name}
                onChangeText={setup.setName}
                placeholder="Tên nhân vật"
                placeholderTextColor={theme.dim}
                accessibilityLabel="Tên nhân vật"
                maxLength={18}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={continueToRegion}
                maxFontSizeMultiplier={1.15}
                style={[
                  styles.input,
                  {
                    flex: 1,
                    fontSize: font(14),
                    borderRadius: s(10),
                    paddingHorizontal: s(10),
                    height: Math.max(s(32), fitted.avatar * 0.55),
                    borderColor: setup.name.trim() ? theme.gold : theme.lineSoft,
                  },
                ]}
              />
            </View>
            <ColorSwatches
              kind="hair"
              label="Tóc"
              selectedId={setup.hairColorId}
              enabled={setup.profession !== null}
              onSelect={setup.setHairColor}
            />
            <ColorSwatches
              kind="outfit"
              label="Trang phục"
              selectedId={setup.outfitColorId}
              enabled={setup.profession !== null}
              onSelect={setup.setOutfitColor}
            />
            <View style={[styles.genderRow, { gap: s(6), minHeight: fitted.gender }]}>
              {GENDERS.map((choice) => {
                const body = characterFor(setup.profession?.id, choice.id);
                return (
                  <GenderCard
                    key={choice.id}
                    label={choice.label}
                    hint={choice.hint}
                    selected={setup.gender === choice.id}
                    onPress={() => setup.selectGender(choice.id)}
                    preview={
                      body && fitted.mini > 0 ? (
                        <CharacterAvatar
                          character={body}
                          hairColor={setup.hairHex}
                          outfitColor={setup.outfitHex}
                          size={Math.max(18, Math.round(fitted.mini / 1.22))}
                        />
                      ) : null
                    }
                  />
                );
              })}
            </View>
            <Text style={[styles.blurb, { fontSize: font(11) }]} numberOfLines={fitted.blurbLines} maxFontSizeMultiplier={1.15}>
              {setup.profession?.blurb ?? 'Chọn một biểu tượng nghề để xem nhân vật.'}
            </Text>
          </View>

          <View style={[styles.studio, { gap: s(4) }]}>
            <Text style={[styles.section, { fontSize: font(13) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              Chọn biểu tượng nghề
            </Text>
            <View style={[styles.grid, { gap }]}>
              {jobRows.map((row, rowIndex) => (
                <View key={row[0]?.id ?? rowIndex} style={[styles.gridRow, { gap }]}>
                  {row.map((profession) => (
                    <ProfessionTile
                      key={profession.id}
                      title={profession.title}
                      titleEn={profession.titleEn}
                      character={characterFor(
                        profession.id,
                        setup.profession?.id === profession.id && setup.gender ? setup.gender : 'male',
                      )}
                      selected={setup.profession?.id === profession.id}
                      onPress={() => setup.selectProfession(profession.id)}
                    />
                  ))}
                  {Array.from({ length: columns - row.length }, (_, index) => (
                    <View key={`empty-${index}`} style={styles.tileSlot} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingHorizontal: s(16), paddingVertical: s(6), gap: s(10) }]}>
        <Text style={[styles.hint, { fontSize: font(12) }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
          {hint}
        </Text>
        <GlowButton testID="continue-button" label="Chọn vùng" enabled={setup.canContinue} onPress={continueToRegion} />
      </View>
    </SafeAreaView>
  );
}

function fitIdentity(bodyH: number) {
  const tight = bodyH < 300;
  const title = 20;
  const blurb = tight ? 16 : 28;
  const gender = tight ? 34 : 44;
  const gaps = 22;
  const captions = 30;
  const rest = Math.max(48, bodyH - title - blurb - gender - gaps - captions);
  const avatar = Math.round(Math.max(40, Math.min(tight ? 64 : 84, rest * 0.62)));
  const mini = tight ? 0 : Math.round(Math.max(22, Math.min(36, gender - 8)));
  return { avatar, mini, gender, blurbLines: tight ? 1 : 2 };
}

function rowsOf<T>(items: readonly T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) rows.push(items.slice(index, index + columns));
  return rows;
}

function ProfessionTile({
  title,
  titleEn,
  character,
  selected,
  onPress,
}: {
  title: string;
  titleEn: string;
  character: ReturnType<typeof characterFor>;
  selected: boolean;
  onPress: () => void;
}) {
  const { s, font, compact } = useLayout();
  const { hovered, hoverHandlers } = usePointerHover();
  const [cell, setCell] = useState({ w: 0, h: 0 });
  const artH = Math.max(22, Math.min(s(52), Math.floor((cell.h || (compact ? 64 : 78)) * 0.56)));
  const artW = Math.max(18, Math.round(artH / 1.22));
  const showEnglish = cell.h === 0 || cell.h >= 52;

  return (
    <Pressable
      testID={`profession-${titleEn.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${titleEn}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setCell((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
      }}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.tile,
        {
          borderRadius: s(10),
          paddingVertical: s(2),
          paddingHorizontal: s(2),
          borderColor: selected ? theme.gold : hovered ? theme.line : theme.lineSoft,
          backgroundColor: selected ? theme.cardRaised : theme.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {character ? (
        <CharacterAvatar character={character} hairColor="#000" outfitColor="#000" size={artW} />
      ) : null}
      <Text style={[styles.tileTitle, { fontSize: font(11) }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
        {title}
      </Text>
      {showEnglish ? (
        <Text style={[styles.tileMeta, { fontSize: font(9) }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {titleEn}
        </Text>
      ) : null}
    </Pressable>
  );
}

function GenderCard({
  label,
  hint,
  selected,
  preview,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  preview: ReactNode;
  onPress: () => void;
}) {
  const { s, font } = useLayout();
  const { hovered, hoverHandlers } = usePointerHover();
  return (
    <Pressable
      testID={`gender-${hint.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.gender,
        {
          borderRadius: s(10),
          paddingHorizontal: s(6),
          paddingVertical: s(2),
          gap: s(4),
          borderColor: selected ? theme.gold : hovered ? theme.line : theme.lineSoft,
          backgroundColor: selected ? theme.cardRaised : theme.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      {preview ? <View style={styles.genderPreview}>{preview}</View> : null}
      <View style={styles.genderText}>
        <Text style={[styles.genderLabel, { fontSize: font(13) }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.tileMeta, { fontSize: font(10) }]} numberOfLines={1}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { flex: 1, minHeight: 0 },
  columns: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'stretch' },
  identity: { justifyContent: 'space-between', minHeight: 0 },
  identityTitle: { color: theme.ink, fontWeight: '700' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 0 },
  previewSlot: { alignItems: 'center', justifyContent: 'center' },
  input: { color: theme.ink, backgroundColor: theme.bgDeep, borderWidth: 1 },
  blurb: { color: theme.muted },
  studio: { flex: 1, minWidth: 0, minHeight: 0 },
  section: { color: theme.ink, fontWeight: '700' },
  grid: { flex: 1, minHeight: 0 },
  gridRow: { flex: 1, minHeight: 0, flexDirection: 'row' },
  tileSlot: { flex: 1, minWidth: 0 },
  tile: { flex: 1, minWidth: 0, minHeight: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  tileTitle: { color: theme.ink, fontWeight: '700', marginTop: 1 },
  tileMeta: { color: theme.muted },
  genderRow: { flexDirection: 'row', minHeight: 0 },
  gender: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  genderPreview: { alignItems: 'center', justifyContent: 'center' },
  genderText: { flex: 1, minWidth: 0 },
  genderLabel: { color: theme.ink, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.lineSoft,
  },
  hint: { flex: 1, color: theme.muted },
});
