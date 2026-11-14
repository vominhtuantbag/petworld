import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { elementLabel, type ElementId } from '../../world/combat/elements';
import type { StatusEntry } from '../../world/combat/advanced';
import type { StatMod } from '../../world/combat/model';
import { collectDisplayStatuses, type StatusCarrier } from '../../world/combat/statuses';
import { FaceArt } from './courtChrome';

export type InfoSkillSlot = {
  id: string;
  name: string;
  /** Remaining cooldown turns; 0 = ready. Kept for tip copy only — never shown on slots. */
  wait?: number;
  mana?: number;
};

export type InfoPanelUnit = {
  id: string;
  name: string;
  tint: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  shieldHp?: number;
  level?: number;
  element?: ElementId | string | null;
  /** Extra elements when a unit carries more than one affinity. */
  elements?: Array<ElementId | string | null | undefined>;
  kindId?: string;
  statuses?: StatusEntry[];
  mods?: StatMod[];
  skills?: InfoSkillSlot[];
};

type Props = {
  unit: InfoPanelUnit | null;
  side: 'left' | 'right';
  avatarSize?: number;
  portrait?: ReactNode;
  footer?: ReactNode;
  testID?: string;
  /** @deprecated Unused — panel has no ally/enemy title. */
  title?: string;
  /** @deprecated Buff/debuff listings removed from the panel. */
  inspect?: boolean;
};

const PANEL_W = 212;
const PANEL_H = 118;

const ELEMENT_TINT: Record<string, string> = {
  plains: '#8bc34a',
  mountain: '#90a4ae',
  forest: '#43a047',
  swamp: '#6d4c41',
  beach: '#4fc3f7',
  ocean: '#0288d1',
  frost: '#81d4fa',
  savanna: '#c0ca33',
  volcano: '#e53935',
  desert: '#ffb74d',
  darkness: '#7e57c2',
  light: '#fff176',
  heaven: '#ce93d8',
  hell: '#bf360c',
  chaos: '#ab47bc',
  cosmic: '#5c6bc0',
};

function shortElement(element: string | null | undefined): string {
  if (!element) return '—';
  const label = elementLabel(element as ElementId);
  return label.length <= 6 ? label : label.slice(0, 5);
}

function elementList(unit: InfoPanelUnit | null): string[] {
  if (!unit) return [];
  const raw = [...(unit.elements ?? []), unit.element].filter(Boolean) as string[];
  return [...new Set(raw.map((entry) => entry.trim()).filter(Boolean))];
}

function StatBar({
  value,
  max,
  fill,
  track,
}: {
  value: number;
  max: number;
  fill: string;
  track: string;
}) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={[styles.barTrack, { backgroundColor: track }]}>
      <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      <Text style={styles.barText} numberOfLines={1}>
        {Math.round(value)} / {Math.round(max)}
      </Text>
    </View>
  );
}

/**
 * Fixed rectangular combat dossier (reference layout).
 * Left: name · circular avatar · Lv. · Right: element chips · HP · MP · skill name slots.
 */
export function BattleInfoPanel({
  unit,
  side,
  avatarSize = 48,
  portrait,
  footer,
  testID,
  title,
}: Props) {
  const elements = elementList(unit);
  const skills = (unit?.skills ?? []).slice(0, 4);
  const facing = side === 'right' ? 'left' : 'right';

  return (
    <View
      style={styles.panel}
      testID={testID}
      accessibilityLabel={unit ? unit.name : title ?? 'Status'}
    >
      {unit ? (
        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.identity}>
              <Text style={styles.name} numberOfLines={1}>
                {unit.name}
              </Text>
              <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                {portrait ?? (
                  <FaceArt
                    kindId={unit.kindId}
                    tint={unit.tint}
                    name={unit.name}
                    size={avatarSize - 2}
                    facing={facing}
                  />
                )}
              </View>
              <Text style={styles.lvText}>Lv.{unit.level ?? '—'}</Text>
            </View>

            <View style={styles.stats}>
              <View style={styles.elementRow}>
                {(elements.length ? elements : ['']).map((element, index) => {
                  if (!element) {
                    return (
                      <Text key="empty" style={styles.muted}>
                        —
                      </Text>
                    );
                  }
                  const tint = ELEMENT_TINT[element] ?? '#81d4fa';
                  return (
                    <View
                      key={`${element}-${index}`}
                      style={[styles.elementChip, { borderColor: tint, backgroundColor: 'rgba(12, 28, 48, 0.92)' }]}
                    >
                      <View style={[styles.elementDot, { backgroundColor: tint }]} />
                      <Text style={[styles.elementText, { color: tint }]} numberOfLines={1}>
                        {shortElement(element)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <StatBar value={unit.hp} max={unit.maxHp} fill="#e53935" track="#4a1818" />
              <StatBar value={unit.mp} max={unit.maxMp} fill="#b39ddb" track="#241848" />
              <View style={styles.skillRow}>
                {(skills.length
                  ? skills
                  : [
                      { id: 'basic', name: 'Đánh thường' },
                      { id: 's1', name: '—' },
                      { id: 's2', name: '—' },
                    ]
                ).map((skill, index) => (
                  <View key={skill.id} style={[styles.skillSlot, index === 0 && styles.skillSlotBasic]}>
                    <Text style={styles.skillName} numberOfLines={2}>
                      {skill.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>—</Text>
      )}
      {footer}
    </View>
  );
}

/** Compact white/black-stroke copy for tips & logs. */
export const outlineText = {
  color: '#ffffff',
  fontWeight: '800' as const,
  textShadowColor: '#000000',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 4,
};

/** Tip copy when a unit is inspected (dock tip only — not inside the status panel). */
export function formatUnitInspectTip(unit: InfoPanelUnit | null): string {
  if (!unit) return 'Chọn một đơn vị để xem chi tiết.';
  const carrier: StatusCarrier = { statuses: unit.statuses, mods: unit.mods, shieldHp: unit.shieldHp };
  const icons = collectDisplayStatuses(carrier, 8);
  const statusLine = icons.length
    ? icons.map((entry) => entry.def.nameVi).join(', ')
    : 'không có hiệu ứng';
  return `${unit.name} · Lv.${unit.level ?? '—'} · HP ${Math.round(unit.hp)}/${Math.round(unit.maxHp)} · MP ${Math.round(unit.mp)}/${Math.round(unit.maxMp)} · ${statusLine}`;
}

const styles = StyleSheet.create({
  panel: {
    width: PANEL_W,
    height: PANEL_H,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    zIndex: 8,
    justifyContent: 'center',
  },
  body: { width: '100%', height: '100%' },
  topRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  identity: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  name: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    maxWidth: 58,
    textAlign: 'center',
  },
  avatar: {
    overflow: 'hidden',
    backgroundColor: '#d7d2c8',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  lvText: {
    color: '#f0d78c',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  stats: { flex: 1, minWidth: 0, justifyContent: 'space-between', gap: 3 },
  elementRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 3, overflow: 'hidden' },
  elementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  elementDot: { width: 6, height: 6, borderRadius: 3 },
  elementText: { fontSize: 9, fontWeight: '900' },
  barTrack: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    zIndex: 1,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  skillRow: { flexDirection: 'row', gap: 4, marginTop: 1 },
  skillSlot: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#5ec4c0',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  skillSlotBasic: {
    backgroundColor: '#141414',
    borderColor: '#4fc3f7',
  },
  skillName: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 8,
  },
  muted: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700' },
  empty: { color: 'rgba(255,255,255,0.55)', fontWeight: '800', fontSize: 12, textAlign: 'center' },
});
