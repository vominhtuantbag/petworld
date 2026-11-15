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
  /** Uniform panel scale (mobile web status bars use 1.5). */
  scale?: number;
  portrait?: ReactNode;
  footer?: ReactNode;
  testID?: string;
  /** @deprecated Unused — panel has no ally/enemy title. */
  title?: string;
  /** @deprecated Buff/debuff listings removed from the panel. */
  inspect?: boolean;
};

export const BATTLE_INFO_PANEL_W = 212;
export const BATTLE_INFO_PANEL_H = 118;
const PANEL_W = BATTLE_INFO_PANEL_W;
const PANEL_H = BATTLE_INFO_PANEL_H;

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
  scale,
}: {
  value: number;
  max: number;
  fill: string;
  track: string;
  scale: number;
}) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const barH = Math.round(14 * scale);
  return (
    <View
      style={[
        styles.barTrack,
        { backgroundColor: track, height: barH, borderRadius: Math.round(barH / 2) },
      ]}
    >
      <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      <Text style={[styles.barText, { fontSize: Math.max(8, Math.round(9 * scale)) }]} numberOfLines={1}>
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
  avatarSize,
  scale = 1,
  portrait,
  footer,
  testID,
  title,
}: Props) {
  const elements = elementList(unit);
  const skills = (unit?.skills ?? []).slice(0, 4);
  const facing = side === 'right' ? 'left' : 'right';
  const z = scale;
  const face = avatarSize ?? Math.round(48 * z);
  const idW = Math.round(58 * z);
  const skillBox = Math.round(34 * z);

  return (
    <View
      style={[
        styles.panel,
        {
          width: Math.round(PANEL_W * z),
          height: Math.round(PANEL_H * z),
          paddingHorizontal: Math.round(8 * z),
          paddingVertical: Math.round(6 * z),
          borderRadius: Math.round(8 * z),
        },
      ]}
      testID={testID}
      accessibilityLabel={unit ? unit.name : title ?? 'Status'}
    >
      {unit ? (
        <View style={styles.body}>
          <View style={[styles.topRow, { gap: Math.round(8 * z) }]}>
            <View style={[styles.identity, { width: idW, gap: Math.round(2 * z) }]}>
              <Text style={[styles.name, { fontSize: Math.max(10, Math.round(11 * z)), maxWidth: idW }]} numberOfLines={1}>
                {unit.name}
              </Text>
              <View style={[styles.avatar, { width: face, height: face, borderRadius: face / 2 }]}>
                {portrait ?? (
                  <FaceArt
                    kindId={unit.kindId}
                    tint={unit.tint}
                    name={unit.name}
                    size={face - 2}
                    facing={facing}
                  />
                )}
              </View>
              <Text style={[styles.lvText, { fontSize: Math.max(10, Math.round(12 * z)) }]}>Lv.{unit.level ?? '—'}</Text>
            </View>

            <View style={[styles.stats, { gap: Math.round(3 * z) }]}>
              <View style={[styles.elementRow, { gap: Math.round(3 * z) }]}>
                {(elements.length ? elements : ['']).map((element, index) => {
                  if (!element) {
                    return (
                      <Text key="empty" style={[styles.muted, { fontSize: Math.max(9, Math.round(10 * z)) }]}>
                        —
                      </Text>
                    );
                  }
                  const tint = ELEMENT_TINT[element] ?? '#81d4fa';
                  return (
                    <View
                      key={`${element}-${index}`}
                      style={[
                        styles.elementChip,
                        {
                          borderColor: tint,
                          backgroundColor: 'rgba(12, 28, 48, 0.92)',
                          gap: Math.round(3 * z),
                          borderRadius: Math.round(4 * z),
                          paddingHorizontal: Math.round(5 * z),
                          paddingVertical: Math.max(1, Math.round(1 * z)),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.elementDot,
                          {
                            backgroundColor: tint,
                            width: Math.round(6 * z),
                            height: Math.round(6 * z),
                            borderRadius: Math.round(3 * z),
                          },
                        ]}
                      />
                      <Text style={[styles.elementText, { color: tint, fontSize: Math.max(8, Math.round(9 * z)) }]} numberOfLines={1}>
                        {shortElement(element)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <StatBar value={unit.hp} max={unit.maxHp} fill="#e53935" track="#4a1818" scale={z} />
              <StatBar value={unit.mp} max={unit.maxMp} fill="#b39ddb" track="#241848" scale={z} />
              <View style={[styles.skillRow, { gap: Math.round(4 * z), marginTop: Math.round(1 * z) }]}>
                {(skills.length
                  ? skills
                  : [
                      { id: 'basic', name: 'Đánh thường' },
                      { id: 's1', name: '—' },
                      { id: 's2', name: '—' },
                    ]
                ).map((skill, index) => (
                  <View
                    key={skill.id}
                    style={[
                      styles.skillSlot,
                      index === 0 && styles.skillSlotBasic,
                      {
                        width: skillBox,
                        height: skillBox,
                        borderRadius: Math.round(4 * z),
                        paddingHorizontal: Math.round(2 * z),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.skillName,
                        {
                          fontSize: Math.max(6, Math.round(7 * z)),
                          lineHeight: Math.max(7, Math.round(8 * z)),
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {skill.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : (
        <Text style={[styles.empty, { fontSize: Math.max(10, Math.round(12 * z)) }]}>—</Text>
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
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    zIndex: 8,
    justifyContent: 'center',
  },
  body: { width: '100%', height: '100%' },
  topRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  identity: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  name: {
    color: '#ffffff',
    fontWeight: '800',
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
    fontWeight: '900',
    marginTop: 1,
  },
  stats: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  elementRow: { flexDirection: 'row', flexWrap: 'nowrap', overflow: 'hidden' },
  elementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  elementDot: {},
  elementText: { fontWeight: '900' },
  barTrack: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barText: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
    zIndex: 1,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  skillRow: { flexDirection: 'row' },
  skillSlot: {
    backgroundColor: '#5ec4c0',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillSlotBasic: {
    backgroundColor: '#141414',
    borderColor: '#4fc3f7',
  },
  skillName: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
  },
  muted: { color: 'rgba(255,255,255,0.45)', fontWeight: '700' },
  empty: { color: 'rgba(255,255,255,0.55)', fontWeight: '800', textAlign: 'center' },
});
