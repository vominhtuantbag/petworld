/**
 * Eleven class skill trees: 2 Normals + 3 Skills each.
 * Skill Modal equips 1 basic + 2 of the three actives.
 */

import type { Skill, SkillEffect } from './model.js';

export type ClassKit = { basics: [Skill, Skill]; skills: [Skill, Skill, Skill] };

function sk(
  id: string,
  name: string,
  mana: number,
  power: number,
  cooldown: number,
  blurb: string,
  target: Skill['target'],
  effects: SkillEffect[],
): Skill {
  return { id, name, mana, power, cooldown, blurb, target, effects };
}

export const CLASS_KITS: Record<string, ClassKit> = {
  ranger: {
    basics: [
      sk('ranger-bolt', 'Bắn Nỏ Nhanh', 0, 1, 0, 'Sát thương vật lý tầm xa. Bản thân +10% SPD lượt sau.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'mod', stat: 'spd', amount: 0.1, turns: 1, target: 'self' },
      ]),
      sk('ranger-spear', 'Lao Đâm Cảnh Báo', 0, 1.05, 0, 'Sát thương vật lý. Nếu mục tiêu >80% HP: +25% sát thương.', 'enemy', [
        { type: 'damage', power: 1.05, ifHpAbove: 0.8, bonusPower: 0.25 },
      ]),
    ],
    skills: [
      sk('ranger-trap', 'Bẫy Gai Chân', 8, 0.4, 2, 'Địch −40% SPD và Câm lặng (chỉ đánh thường) 1 lượt.', 'enemy', [
        { type: 'damage', power: 0.4 },
        { type: 'mod', stat: 'spd', amount: -0.4, turns: 1, target: 'enemy' },
        { type: 'status', id: 'silence', chance: 1, turns: 1, target: 'enemy' },
      ]),
      sk('ranger-mark', 'Dấu Ấn Thợ Săn', 10, 0, 3, 'Đánh dấu 1 địch. Pet đánh mục tiêu: +20% Crit, bỏ qua 20% DEF.', 'enemy', [
        { type: 'mark', turns: 3, critBonus: 0.2, ignoreDef: 0.2 },
      ]),
      sk('ranger-bait', 'Mồi Dụ Hoang Dã', 12, 0, 4, 'Ép mọi đòn địch nhắm đồng minh HP cao nhất trong 1 lượt.', 'none', [
        { type: 'redirect_highest_hp', turns: 1 },
      ]),
    ],
  },

  knight: {
    basics: [
      sk('knight-slash', 'Kiếm Chém Thẳng', 0, 1, 0, 'Sát thương vật lý chuẩn. Bản thân +10% DEF.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'mod', stat: 'def', amount: 0.1, turns: 1, target: 'self' },
      ]),
      sk('knight-bash', 'Khiên Đập Choáng', 0, 0.85, 0, 'Sát thương nhẹ. 20% giảm 15% TGH mục tiêu.', 'enemy', [
        { type: 'damage', power: 0.85 },
        { type: 'chip_tgh', pct: 0.15, chance: 0.2 },
      ]),
    ],
    skills: [
      sk('knight-oath', 'Lời Thề Bảo Vệ', 8, 0, 2, 'Hấp thụ 50% sát thương thay pet được chọn trong 1 lượt.', 'ally_pet', [
        { type: 'guard', turns: 1, absorb: 0.5 },
      ]),
      sk('knight-banner', 'Biểu Tượng Dũng Cảm', 12, 0, 4, 'Bản thân +70% DEF, pet +25% DEF, chắn 100% sát thương pet 1 lượt.', 'ally_pet', [
        { type: 'mod', stat: 'def', amount: 0.7, turns: 2, target: 'self' },
        { type: 'mod', stat: 'def', amount: 0.25, turns: 2, target: 'party_pets' },
        { type: 'guard', turns: 1, absorb: 1 },
      ]),
      sk('knight-vengeance', 'Cừu Thù Trừng Phạt', 10, 0, 3, 'Sát thương vật lý bằng 70% HP đã mất của Hiệp Sĩ.', 'enemy', [
        { type: 'damage', missingHpPower: 0.7 },
      ]),
    ],
  },

  mage: {
    basics: [
      sk('mage-bolt', 'Tia Ma Thuật', 0, 1, 0, 'Sát thương phép cơ bản. Hồi 5 MP.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'restore_mp', amount: 5, target: 'self' },
      ]),
      sk('mage-orb', 'Cầu Năng Lượng', 0, 1.05, 0, 'Sát thương phép xuyên 15% DEF mục tiêu thủ cao.', 'enemy', [
        { type: 'damage', power: 1.05, armPenBonus: 0.15 },
      ]),
    ],
    skills: [
      sk('mage-burst', 'Bộc Phá Nguyên Tố', 10, 0.7, 2, 'AoE phép: mục tiêu chính 70%, còn lại 40%.', 'enemy', [
        { type: 'damage', power: 0.7, aoe: 'enemies', secondaryPower: 0.4 },
      ]),
      sk('mage-meteor', 'Đá Thiên Thạch Rơi', 12, 0.7, 3, 'AoE ngẫu nhiên 70–90% lên mọi pet địch.', 'enemies', [
        { type: 'damage', randomPower: [0.7, 0.9], aoe: 'enemy_pets' },
      ]),
      sk('mage-nova', 'Quả Cầu Huỷ Diệt', 14, 0.5, 4, 'AoE toàn sân: đồng minh 30–50%, địch 50–80%.', 'enemies', [
        { type: 'damage', randomPower: [0.5, 0.8], aoe: 'all', allyHarmRange: [0.3, 0.5] },
      ]),
    ],
  },

  scout: {
    basics: [
      sk('scout-knife', 'Dao Bắn Tốc Độ', 0, 1, 0, 'Sát thương vật lý. Ưu tiên hành động đầu hiệp (initiative).', 'enemy', [
        { type: 'damage', power: 1 },
      ]),
      sk('scout-point', 'Đánh Chỉ Điểm', 0, 0.85, 0, 'Sát thương nhẹ + giảm 15% ACC mục tiêu 1 lượt.', 'enemy', [
        { type: 'damage', power: 0.85 },
        { type: 'mod', stat: 'acc', amount: -0.15, turns: 1, target: 'enemy' },
      ]),
    ],
    skills: [
      sk('scout-weak', 'Thấu Thị Điểm Yếu', 10, 1.2, 3, 'Chí mạng chắc chắn lên 1 địch + mọi địch −10% DEF.', 'enemy', [
        { type: 'damage', power: 1.2, critRateBonus: 1 },
        { type: 'mod', stat: 'def', amount: -0.1, turns: 2, target: 'enemies' },
      ]),
      sk('scout-smoke', 'Phấn Khói Đột Kích', 10, 0, 3, '1 pet +70% EVA; mọi pet +20% SPD.', 'ally_pet', [
        { type: 'mod', stat: 'eva', amount: 0.7, turns: 2, target: 'ally' },
        { type: 'mod', stat: 'spd', amount: 0.2, turns: 2, target: 'party_pets' },
      ]),
      sk('scout-chaos', 'Bẫy Rối Loạn', 12, 0, 4, 'Mọi địch −30% DEF + Mù (−60% ACC).', 'enemies', [
        { type: 'mod', stat: 'def', amount: -0.3, turns: 2, target: 'enemies' },
        { type: 'status', id: 'blind', chance: 1, turns: 2, power: 0.6, target: 'enemies' },
        { type: 'mod', stat: 'acc', amount: -0.6, turns: 2, target: 'enemies' },
      ]),
    ],
  },

  monk: {
    basics: [
      sk('monk-staff', 'Gậy Thánh Phạt', 0, 0.95, 0, 'Sát thương phép nhẹ. 20% giảm 15% ATK địch.', 'enemy', [
        { type: 'damage', power: 0.95 },
        { type: 'mod', stat: 'atk', amount: -0.15, turns: 1, target: 'enemy', chance: 0.2 },
      ]),
      sk('monk-chant', 'Chú Nguyên Lượng', 0, 0.9, 0, 'Sát thương phép nhẹ + hồi 5% HP đồng minh thấp máu nhất.', 'enemy', [
        { type: 'damage', power: 0.9 },
        { type: 'heal', pctMax: 0.05, target: 'ally_lowest' },
      ]),
    ],
    skills: [
      sk('monk-ward', 'Phù Hộ Phạn Tiên', 10, 0, 3, '1 pet miễn nhiễm debuff (Stun/Poison/Burn) 2 lượt.', 'ally_pet', [
        { type: 'status', id: 'immunity', chance: 1, turns: 2, target: 'ally' },
      ]),
      sk('monk-pray', 'Lời Nguyện Trì Luân', 12, 0, 4, 'Mọi pet hồi 20% MP và giảm CD kỹ năng 1 lượt.', 'party_pets', [
        { type: 'restore_mp', pctMax: 0.2, target: 'party_pets' },
        { type: 'cd_reduce', amount: 1, target: 'party_pets' },
      ]),
      sk('monk-mirror', 'Phản Chiếu Linh Hồn', 12, 0, 4, 'Khiên phản 30% True Damage cho mọi pet (1 lần/pet).', 'party_pets', [
        { type: 'reflect', turns: 2, pct: 0.3, charges: 1, target: 'party_pets' },
      ]),
    ],
  },

  archer: {
    basics: [
      sk('archer-sharp', 'Mũi Tên Sắc Báo', 0, 1, 0, 'Sát thương vật lý tầm xa. 15% tăng Crit Damage.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'mod', stat: 'critDamage', amount: 0.15, turns: 1, target: 'self', chance: 0.15 },
      ]),
      sk('archer-twin', 'Bắn Song Mũi', 0, 0.6, 0, 'Hai đòn, mỗi đòn 60% sát thương vật lý.', 'enemy', [
        { type: 'damage', power: 0.6, hits: 2 },
      ]),
    ],
    skills: [
      sk('archer-rain', 'Mưa Tên Xuyên Phá', 8, 0.7, 2, 'AoE: chính 70%, còn lại 30%. Mọi địch −25% DEF 1 lượt.', 'enemy', [
        { type: 'damage', power: 0.7, aoe: 'enemies', secondaryPower: 0.3 },
        { type: 'mod', stat: 'def', amount: -0.25, turns: 1, target: 'enemies' },
      ]),
      sk('archer-snipe', 'Ngắm Bắn Tinh Anh', 10, 0, 3, 'Tụ lực 1 lượt. Lượt sau: 250% True Damage.', 'self', [
        { type: 'charge', power: 2.5, trueDamage: true },
      ]),
      sk('archer-gravity', 'Mũi Tên Trọng Lực', 12, 1.4, 4, 'Đòn nặng. 70% đặt SPD mục tiêu = 0 (bỏ lượt).', 'enemy', [
        { type: 'damage', power: 1.4 },
        { type: 'status', id: 'spd_zero', chance: 0.7, turns: 1, target: 'enemy' },
      ]),
    ],
  },

  healer: {
    basics: [
      sk('healer-needle', 'Kim Độc Cảnh Báo', 0, 0.85, 0, 'Sát thương nhẹ. 30% trúng độc (5% max HP/lượt × 2).', 'enemy', [
        { type: 'damage', power: 0.85 },
        { type: 'status', id: 'poison', chance: 0.3, turns: 2, power: 0.05, target: 'enemy' },
      ]),
      sk('healer-boost', 'Tiêm Năng Lượng', 0, 1, 0, 'Sát thương vật lý + bản thân +10% EVA.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'mod', stat: 'eva', amount: 0.1, turns: 1, target: 'self' },
      ]),
    ],
    skills: [
      sk('healer-revive', 'Mũi Tiêm Hồi Sức', 8, 0, 2, 'Hồi sinh 1 pet ngất (30% max HP) và gỡ bleed/poison.', 'ally_pet', [
        { type: 'revive', pctMax: 0.3, cleanse: ['poison', 'bleed', 'burn'] },
      ]),
      sk('healer-rage', 'Thuốc Tăng Lực Cuồng Báo', 10, 0, 3, 'Pet +40% ATK 2 lượt nhưng mất 5% HP/lượt.', 'ally_pet', [
        { type: 'mod', stat: 'atk', amount: 0.4, turns: 2, target: 'ally' },
        { type: 'status', id: 'burn', chance: 1, turns: 2, power: 0.05, target: 'ally' },
      ]),
      sk('healer-field', 'Trụ Sinh Học Bảo Vệ', 14, 0, 5, 'Trụ sinh học: đầu lượt hồi 8% HP cả đội trong 3 lượt.', 'party', [
        { type: 'bio_field', turns: 3, pctHeal: 0.08 },
      ]),
    ],
  },

  rogue: {
    basics: [
      sk('rogue-pick', 'Móc Túi Trộm AP', 0, 0.8, 0, 'Sát thương nhẹ. 50% cướp 20% MP mục tiêu.', 'enemy', [
        { type: 'damage', power: 0.8 },
        { type: 'status', id: 'slow', chance: 0.5, turns: 0, power: 0.2, target: 'enemy' },
      ]),
      sk('rogue-backstab', 'Đâm Lén Từ Phía Sau', 0, 1.1, 0, 'Sát thương vật lý. +40% nếu mục tiêu đang dính debuff.', 'enemy', [
        { type: 'damage', power: 1.1, ifDebuffedBonus: 0.4 },
      ]),
    ],
    skills: [
      sk('rogue-sand', 'Mù Cát Bộc Phát', 8, 0.5, 2, 'Làm mù (−60% ACC) 2 địch HP cao nhất 1 lượt.', 'enemies', [
        { type: 'damage', power: 0.5 },
        { type: 'status', id: 'blind', chance: 1, turns: 1, power: 0.6, target: 'enemies_top_hp', count: 2 },
        { type: 'mod', stat: 'acc', amount: -0.6, turns: 1, target: 'enemies' },
      ]),
      sk('rogue-strip', 'Tước Đoạt Vũ Khí/Buff', 10, 0.5, 3, '50% cướp buff địch (50% DMG). Thất bại: 125% DMG.', 'enemy', [
        { type: 'steal_buffs', chance: 0.5, successPower: 0.5, failPower: 1.25 },
      ]),
      sk('rogue-escape', 'Tẩu Thoát Mù Khói', 12, 0, 4, 'Xóa buff địch + hồi 30% max HP cho 2 pet thấp máu nhất.', 'none', [
        { type: 'cleanse_enemy_buffs' },
        { type: 'heal', pctMax: 0.3, target: 'party_lowest_two' },
      ]),
    ],
  },

  guardian: {
    basics: [
      sk('guardian-slam', 'Đập Khiên Trọng Lực', 0, 1, 0, 'Sát thương vật lý tỷ lệ theo DEF của Hộ Vệ.', 'enemy', [
        { type: 'damage', power: 1, scaleFromDef: true },
      ]),
      sk('guardian-chain', 'Quật Xích Giữ Chân', 0, 1, 0, 'Sát thương vật lý + địch −15% SPD.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'mod', stat: 'spd', amount: -0.15, turns: 1, target: 'enemy' },
      ]),
    ],
    skills: [
      sk('guardian-fort', 'Thành Trì Bất Khả Xâm Phạm', 10, 0, 3, 'Bản thân +80% DEF + Khiêu khích mọi đòn đơn 2 lượt.', 'self', [
        { type: 'mod', stat: 'def', amount: 0.8, turns: 2, target: 'self' },
        { type: 'taunt', turns: 2 },
      ]),
      sk('guardian-aegis', 'Hủy Sát Thương Chí Mạng', 12, 0, 4, 'Aura đội chặn mọi chí mạng trong 2 lượt.', 'party', [
        { type: 'crit_block', turns: 2, target: 'party' },
      ]),
      sk('guardian-rebound', 'Phản Pháo Quật Cường', 12, 0, 4, 'Sát thương vật lý = 40% tổng sát thương Hộ Vệ đã nhận.', 'enemy', [
        { type: 'damage', damageTakenPower: 0.4 },
      ]),
    ],
  },

  wanderer: {
    basics: [
      sk('wanderer-dance', 'Kiếm Vũ', 0, 1, 0, 'Sát thương vật lý. 25% +10% SPD.', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'mod', stat: 'spd', amount: 0.1, turns: 1, target: 'self', chance: 0.25 },
      ]),
      sk('wanderer-drink', 'Rót Rượu Tụ Khí', 0, 0, 0, 'Không gây sát thương. +15% ATK và +15% Crit Rate 2 lượt.', 'self', [
        { type: 'mod', stat: 'atk', amount: 0.15, turns: 2, target: 'self' },
        { type: 'mod', stat: 'critRate', amount: 0.15, turns: 2, target: 'self' },
      ]),
    ],
    skills: [
      sk('wanderer-blade', 'Phong Nhẫn Biến Hóa', 8, 1.2, 2, 'Sát thương + 35% Bleed (5% HP/lượt) hoặc Stun 1 lượt.', 'enemy', [
        { type: 'damage', power: 1.2 },
        {
          type: 'random',
          chances: [0.35, 0.65],
          options: [
            [{ type: 'status', id: 'bleed', chance: 1, turns: 2, power: 0.05, target: 'enemy' }],
            [{ type: 'status', id: 'stun', chance: 0.35, turns: 1, target: 'enemy' }],
          ],
        },
      ]),
      sk('wanderer-fate', 'Bàn Cờ Số Phận', 10, 0, 3, '50% Stun địch 1 lượt hoặc +30% ATK đồng minh thấp máu nhất.', 'enemy', [
        {
          type: 'random',
          chances: [0.5, 0.5],
          options: [
            [{ type: 'status', id: 'stun', chance: 1, turns: 1, target: 'enemy' }],
            [{ type: 'mod', stat: 'atk', amount: 0.3, turns: 2, target: 'ally' }],
          ],
        },
      ]),
      sk('wanderer-ultimate', 'Kiếm Pháp Tuyệt Học', 12, 0.7, 4, '3–5 đòn ngẫu nhiên; mỗi đòn có thể gỡ 15% DEF.', 'enemies', [
        { type: 'strip_def', amount: 0.15, chance: 0.4, randomTargets: [3, 5], hits: 1 },
      ]),
    ],
  },

  bard: {
    basics: [
      sk('bard-toxin', 'Dao Độc Âm Phong', 0, 1, 0, 'Sát thương vật lý + độc (5% HP/lượt × 2).', 'enemy', [
        { type: 'damage', power: 1 },
        { type: 'status', id: 'poison', chance: 1, turns: 2, power: 0.05, target: 'enemy' },
      ]),
      sk('bard-ambush', 'Ám Sát Nhanh', 0, 1.25, 0, 'Sát thương vật lý cao. Chí mạng: hồi 10% max HP.', 'enemy', [
        { type: 'damage', power: 1.25 },
      ]),
    ],
    skills: [
      sk('bard-vanish', 'Vô Hình / Ẩn Núp', 10, 0, 3, 'Ẩn thân 1 lượt (không thể chọn làm mục tiêu). Đòn ra ẩn +50% DMG.', 'self', [
        { type: 'stealth', turns: 1 },
      ]),
      sk('bard-execute', 'Kết Liễu Điểm Yếu', 10, 1.5, 3, 'Sát thương cao. Nếu mục tiêu <30% HP: ×2 sát thương.', 'enemy', [
        { type: 'damage', power: 1.5, ifHpBelow: 0.3, finishMult: 2 },
      ]),
      sk('bard-soul', 'Trảm Hồn Tuyệt Kỹ', 12, 1.8, 4, 'Bỏ qua 100% DEF — True Damage trực tiếp.', 'enemy', [
        { type: 'damage', power: 1.8, trueDamage: true },
      ]),
    ],
  },
};

/** Mana steal for rogue pickpocket is handled specially in the cast engine via slow power flag. */
export function classKit(professionId: string | undefined): ClassKit {
  return CLASS_KITS[professionId ?? ''] ?? CLASS_KITS.wanderer;
}

export function allClassProfessionIds(): string[] {
  return Object.keys(CLASS_KITS);
}
