/**
 * Monster and pet Normal attacks, keyed by locomotion (movement type).
 * Skill Modal equips 1 of the 2 basics; biome skills stay separate.
 */

import type { Skill, SkillEffect } from './model';

export type LocomotionId = 'quadruped' | 'biped' | 'leaping' | 'crawling' | 'swimming' | 'flying';

export type LocomotionKit = { basics: [Skill, Skill] };

function sk(
  id: string,
  name: string,
  power: number,
  blurb: string,
  target: Skill['target'],
  effects: SkillEffect[],
): Skill {
  return { id, name, mana: 0, power, cooldown: 0, blurb, target, effects };
}

export const LOCOMOTION_KITS: Record<LocomotionId, LocomotionKit> = {
  quadruped: {
    basics: [
      sk(
        'quad-headbutt',
        'Cú Húc Đầu',
        1,
        'Sát thương vật lý. Mục tiêu −10% SPD trong 1 lượt.',
        'enemy',
        [
          { type: 'damage', power: 1 },
          { type: 'mod', stat: 'spd', amount: -0.1, turns: 1, target: 'enemy' },
        ],
      ),
      sk(
        'quad-rend',
        'Cắn Xé',
        1.05,
        'Sát thương vật lý. Mục tiêu −10% DEF trong 1 lượt.',
        'enemy',
        [
          { type: 'damage', power: 1.05 },
          { type: 'mod', stat: 'def', amount: -0.1, turns: 1, target: 'enemy' },
        ],
      ),
    ],
  },
  biped: {
    basics: [
      sk(
        'biped-surge',
        'Đòn Quật Năng Lượng',
        1,
        'Sát thương vật lý. Bản thân hồi 5 MP.',
        'enemy',
        [
          { type: 'damage', power: 1 },
          { type: 'restore_mp', amount: 5, target: 'self' },
        ],
      ),
      sk(
        'biped-weakspot',
        'Tấn Công Điểm Yếu',
        1,
        'Đòn chuẩn. 15% chí mạng (sát thương ×1.5).',
        'enemy',
        [{ type: 'damage', power: 1, critRateBonus: 0.15 }],
      ),
    ],
  },
  leaping: {
    basics: [
      sk(
        'leap-tongue',
        'Táp Lưỡi Từ Xa',
        1,
        'Bỏ qua hàng trước, đánh thẳng mục tiêu hàng sau.',
        'enemy_back',
        [{ type: 'damage', power: 1, preferBackRow: true }],
      ),
      sk(
        'leap-quake',
        'Dậm Đất Tạo Sóng',
        0.7,
        '70% sát thương mục tiêu chính, 30% lan sang mục tiêu xung quanh.',
        'enemy',
        [{ type: 'damage', power: 0.7, aoe: 'enemies', secondaryPower: 0.3 }],
      ),
    ],
  },
  crawling: {
    basics: [
      sk(
        'crawl-tail',
        'Đuôi Quật Ngang',
        1,
        'Sát thương vật lý. Mục tiêu −10% ATK trong 1 lượt.',
        'enemy',
        [
          { type: 'damage', power: 1 },
          { type: 'mod', stat: 'atk', amount: -0.1, turns: 1, target: 'enemy' },
        ],
      ),
      sk(
        'crawl-slip',
        'Trườn Lách Né Đòn',
        0.8,
        'Sát thương nhẹ. Bản thân +15% EVA lượt sau.',
        'enemy',
        [
          { type: 'damage', power: 0.8 },
          { type: 'mod', stat: 'eva', amount: 0.15, turns: 1, target: 'self' },
        ],
      ),
    ],
  },
  swimming: {
    basics: [
      sk(
        'swim-jet',
        'Bắn Tia Nước',
        1,
        'Đòn tầm xa. 20% làm mù (−20% ACC) 1 lượt.',
        'enemy',
        [
          { type: 'damage', power: 1 },
          { type: 'status', id: 'blind', chance: 0.2, turns: 1, power: 0.2, target: 'enemy' },
          { type: 'mod', stat: 'acc', amount: -0.2, turns: 1, target: 'enemy', chance: 0.2 },
        ],
      ),
      sk(
        'swim-crush',
        'Lướt Sóng Ép Giáp',
        1,
        'Sát thương vật lý + thêm 15% DEF hiện tại của bản thân.',
        'enemy',
        [{ type: 'damage', power: 1, defBonus: 0.15 }],
      ),
    ],
  },
  flying: {
    basics: [
      sk(
        'fly-gust',
        'Sải Cánh Bão Tố',
        1,
        'Sát thương vật lý. Gỡ 1 buff SPD của mục tiêu.',
        'enemy',
        [
          { type: 'damage', power: 1 },
          { type: 'strip_buff', stat: 'spd', count: 1 },
        ],
      ),
      sk(
        'fly-dive',
        'Lao Mổ Sắc Lẻm',
        1.08,
        'Đòn sắc. Bỏ qua 20% DEF mục tiêu.',
        'enemy',
        [{ type: 'damage', power: 1.08, armPenBonus: 0.2 }],
      ),
    ],
  },
};

export const LOCOMOTION_IDS: readonly LocomotionId[] = [
  'quadruped',
  'biped',
  'leaping',
  'crawling',
  'swimming',
  'flying',
];

export const LOCOMOTION_TITLE: Record<LocomotionId, string> = {
  quadruped: '4 Chân',
  biped: '2 Chân',
  leaping: 'Nhảy Cóc',
  crawling: 'Bò Trườn',
  swimming: 'Bơi Lội',
  flying: 'Bay',
};

/**
 * Combat locomotion for a species id. Field gait is a separate animation map;
 * this grouping covers every Map-1 body so each pet has a two-basic kit.
 */
export function locomotionOf(kindId: string): LocomotionId {
  const id = kindId ?? '';
  if (/frog|toad/.test(id)) return 'leaping';
  if (/falcon|eagle|owl|heron|toucan|macaw|seagull|ostrich|secretary|penguin|phoenix/.test(id)) return 'flying';
  if (/fish|whale|shark|seal|orca|manta|octopus|jelly|seahorse|moray|tang|clown|walrus|oyster|starfish/.test(id)) {
    return 'swimming';
  }
  if (
    /snake|lizard|alligator|crocodile|turtle|salamander|slug|gila|anaconda|tortoise|snail|crab|scorpion|spider|beetle|mosquito|dragonfly|butterfly|crayfish|tarantula|hermit/.test(
      id,
    )
  ) {
    return 'crawling';
  }
  if (/shade|chaos|warden|shard|void|golem/.test(id)) return 'biped';
  return 'quadruped';
}

export function locomotionKit(kindId: string): LocomotionKit {
  return LOCOMOTION_KITS[locomotionOf(kindId)];
}

export function locomotionTitle(id: LocomotionId): string {
  return LOCOMOTION_TITLE[id];
}

export function locomotionBasicSkills(id: LocomotionId): Skill[] {
  return LOCOMOTION_KITS[id].basics.map((skill) => ({ ...skill }));
}
