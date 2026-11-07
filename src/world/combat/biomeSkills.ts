/**
 * Sixteen biome systems × five skills (Skill 1–4 + Ultimate).
 * The Skill book lists every skill; pets still equip two of the first three.
 */

import type { BiomeId } from './elements';
import type { Skill, SkillEffect } from './model';

export type BiomeKit = [Skill, Skill, Skill, Skill, Skill];

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

export const BIOME_KITS: Record<BiomeId, BiomeKit> = {
  plains: [
    sk('plains-1', 'Cơn Lốc Đồng Cỏ', 8, 1, 1, 'Sát thương cơ bản. Mục tiêu −20% ACC trong 2 lượt.', 'enemy', [
      { type: 'damage', power: 1 },
      { type: 'mod', stat: 'acc', amount: -0.2, turns: 2, target: 'enemy' },
    ]),
    sk('plains-2', 'Phục Hồi Năng Lượng', 10, 0, 2, 'Bỏ đòn tấn công: hồi 20% HP tối đa và +25% DEF trong 1 lượt.', 'self', [
      { type: 'heal', pctMax: 0.2, target: 'self' },
      { type: 'mod', stat: 'def', amount: 0.25, turns: 1, target: 'self' },
    ]),
    sk('plains-3', 'Dấu Ấn Thảo Nguyên', 12, 0, 3, 'Đánh dấu mục tiêu. Đòn kế của bất kỳ đồng minh nào chí mạng 100%.', 'enemy', [
      { type: 'mark', turns: 2, critBonus: 1, ignoreDef: 0 },
    ]),
    sk('plains-4', 'Gió Lùa Thanh Thản', 10, 0, 2, 'Hồi 15% MP và gỡ 1 hiệu ứng bất lợi.', 'self', [
      { type: 'restore_mp', pctMax: 0.15, target: 'self' },
      { type: 'cleanse', count: 1, target: 'self' },
    ]),
    sk('plains-5', 'Chân Căng Nhảy Vót', 16, 0, 4, 'Ultimate. +50% SPD trong 2 lượt và thêm ngay 1 lượt hành động.', 'self', [
      { type: 'mod', stat: 'spd', amount: 0.5, turns: 2, target: 'self' },
      { type: 'extra_turn' },
    ]),
  ],

  mountain: [
    sk('mountain-1', 'Đá Lăn Đè Nén', 10, 1.3, 1, 'Sát thương vật lý 130% ATK. Gấp đôi (260%) nếu DEF bản thân > DEF mục tiêu.', 'enemy', [
      { type: 'damage', power: 1.3, ifDefGreaterMult: 2 },
    ]),
    sk('mountain-2', 'Kiên Cường Như Đá', 12, 0, 3, 'Khiên hấp thụ 30% HP tối đa. Miễn choáng khi khiên còn.', 'self', [
      { type: 'shield', pctMax: 0.3, turns: 3 },
    ]),
    sk('mountain-3', 'Chấn Cụm Địa Cầu', 14, 0.8, 3, 'Sát thương diện rộng 80% ATK. Cả phe địch −20% SPD trong 2 lượt.', 'enemies', [
      { type: 'damage', power: 0.8, aoe: 'enemies' },
      { type: 'mod', stat: 'spd', amount: -0.2, turns: 2, target: 'enemies' },
    ]),
    sk('mountain-4', 'Bức Tường Đá Cổ', 12, 0, 2, 'Phản 30% sát thương cận chiến nhận vào trong 2 lượt.', 'self', [
      { type: 'reflect', turns: 2, pct: 0.3, charges: 6, target: 'self' },
    ]),
    sk('mountain-5', 'Vỡ Đá Khai Tâm', 16, 0, 4, 'Ultimate. Đổi 30% DEF hiện tại thành ATK trong 2 lượt.', 'self', [
      { type: 'convert_def_to_atk', pct: 0.3, turns: 2 },
    ]),
  ],

  forest: [
    sk('forest-1', 'Rễ Cây Siết Chặt', 8, 1, 1, 'Gây sát thương và Trói (không đổi pet / kỹ năng di chuyển) 2 lượt.', 'enemy', [
      { type: 'damage', power: 1 },
      { type: 'status', id: 'bound', chance: 1, turns: 2, target: 'enemy' },
    ]),
    sk('forest-2', 'Bào Bào Độc Thảo', 10, 0, 2, 'Độc Rừng: mỗi lượt mất 8% HP tối đa, bỏ qua DEF.', 'enemy', [
      { type: 'status', id: 'poison', chance: 1, turns: 3, power: 0.08, target: 'enemy' },
    ]),
    sk('forest-3', 'Hạt Giống Sinh Cơ', 14, 0, 5, 'Sống sót đòn chí mạng với 1 HP. Dùng một lần mỗi trận.', 'self', [
      { type: 'endure' },
    ]),
    sk('forest-4', 'Tán Cây Phủ Băng', 12, 0, 3, 'Tán cây: né 100% kỹ năng kế của địch.', 'self', [
      { type: 'next_skill_evade' },
    ]),
    sk('forest-5', 'Bào Bào Ma Sát', 16, 1.2, 4, 'Ultimate. 3 đòn, mỗi đòn 40% ATK và phá 15% TGH/khiên.', 'enemy', [
      { type: 'damage', power: 0.4, hits: 3, tghPct: 0.15 },
    ]),
  ],

  swamp: [
    sk('swamp-1', 'Bùn Lầy Hút Chân', 8, 1, 1, 'Sát thương đầm lầy. Mục tiêu −40% SPD.', 'enemy', [
      { type: 'damage', power: 1 },
      { type: 'mod', stat: 'spd', amount: -0.4, turns: 2, target: 'enemy' },
      { type: 'status', id: 'slow', chance: 1, turns: 2, target: 'enemy' },
    ]),
    sk('swamp-2', 'Mộc Tinh Bào Giáp', 12, 0, 3, 'Địch −50% DEF trong 2 lượt. Hấp thụ 50% lượng DEF đã giảm vào ATK.', 'enemy', [
      { type: 'absorb_def', defAmount: 0.5, absorb: 0.5, turns: 2 },
    ]),
    sk('swamp-3', 'Chìm Trong Bùn Lầy', 12, 0, 3, 'Khóa tích lũy AP/năng lượng của địch trong 2 lượt.', 'enemy', [
      { type: 'lock_energy', turns: 2 },
    ]),
    sk('swamp-4', 'Khí Độc Miasma', 12, 0, 3, 'Nhiễm miasma: mỗi lần dùng kỹ năng mất 10% HP tối đa.', 'enemy', [
      { type: 'status', id: 'miasma', chance: 1, turns: 3, power: 0.1, target: 'enemy' },
    ]),
    sk('swamp-5', 'Thủy Sinh Biến Dạng', 16, 0, 4, 'Ultimate. Hấp thụ 20% ATK địch vào bản thân trong 2 lượt.', 'enemy', [
      { type: 'steal_stat', stat: 'atk', pct: 0.2, turns: 2 },
    ]),
  ],

  beach: [
    sk('beach-1', 'Vỏ Ốc Sắc Lạnh', 8, 1.1, 1, 'Sát thương vật lý 110% ATK. 30% Gây chảy máu (sát thương chuẩn theo lượt).', 'enemy', [
      { type: 'damage', power: 1.1 },
      { type: 'status', id: 'bleed', chance: 0.3, turns: 2, power: 0.05, target: 'enemy' },
    ]),
    sk('beach-2', 'Thủy Triều Rút', 10, 0, 2, 'Xóa toàn bộ buff đang có trên mục tiêu.', 'enemy', [
      { type: 'cleanse_target_buffs' },
    ]),
    sk('beach-3', 'Cát Bay Bỏng Mắt', 10, 0, 2, 'Làm mù: −50% ACC trong 1 lượt.', 'enemy', [
      { type: 'status', id: 'blind', chance: 1, turns: 1, power: 0.5, target: 'enemy' },
      { type: 'mod', stat: 'acc', amount: -0.5, turns: 1, target: 'enemy' },
    ]),
    sk('beach-4', 'Lớp Bọt Bảo Vệ', 10, 0, 2, 'Gỡ Bỏng/Độc trên bản thân hoặc đồng minh và hồi 15% HP.', 'ally', [
      { type: 'heal', pctMax: 0.15, target: 'ally', cleanse: ['burn', 'poison'] },
    ]),
    sk('beach-5', 'Sóng Cuộn Bão Cát', 16, 1.5, 4, 'Ultimate. Sát thương Thủy–Thổ 150% ATK. +30% nếu mục tiêu bị làm chậm.', 'enemy', [
      { type: 'damage', power: 1.5, ifSlowBonus: 0.3 },
    ]),
  ],

  ocean: [
    sk('ocean-1', 'Xoáy Nước Áp Lực', 12, 1.2, 2, 'Sát thương diện rộng 120% ATK. Phá ngay 50% thanh TGH mục tiêu chính.', 'enemies', [
      { type: 'damage', power: 1.2, aoe: 'enemies' },
      { type: 'chip_tgh', pct: 0.5, chance: 1 },
    ]),
    sk('ocean-2', 'Sóng Thần Khống Chế', 12, 0, 3, 'Đẩy lượt kế của mục tiêu xuống cuối dòng thời gian.', 'enemy', [
      { type: 'delay_turn' },
    ]),
    sk('ocean-3', 'Áp Lực Đáy Biển', 12, 0, 3, 'Mọi kỹ năng của mục tiêu tốn gấp đôi MP/AP trong 2 lượt.', 'enemy', [
      { type: 'mp_cost_mult', amount: 2, turns: 2 },
      { type: 'status', id: 'thirst', chance: 1, turns: 2, target: 'enemy' },
    ]),
    sk('ocean-4', 'Xoáy Nước Thu Hút', 12, 0, 2, 'Kéo mục tiêu HP% thấp nhất ra hàng trước và −30% DEF.', 'enemies', [
      { type: 'pull_lowest', defAmount: 0.3, turns: 2 },
    ]),
    sk('ocean-5', 'Biển Cả Nổi Giận', 8, 2.5, 4, 'Ultimate. Đốt 100% MP hiện tại, sát thương tỷ lệ MP đã đốt.', 'enemy', [
      { type: 'damage', power: 2.5, mpSpentPower: true },
    ]),
  ],

  frost: [
    sk('frost-1', 'Băng Gai Đâm Sâu', 8, 1.1, 1, 'Sát thương băng 110% ATK. +50% sát thương chí mạng nếu mục tiêu bị làm chậm.', 'enemy', [
      { type: 'damage', power: 1.1, ifSlowCritDamage: 0.5 },
      { type: 'frost_stack', stacks: 1 },
    ]),
    sk('frost-2', 'Tê Lạnh Hoàn Toàn', 12, 0, 3, '50% Đóng băng, mục tiêu bỏ 1 lượt.', 'enemy', [
      { type: 'status', id: 'freeze', chance: 0.5, turns: 1, target: 'enemy' },
    ]),
    sk('frost-3', 'Giáp Băng Vĩnh Cửu', 12, 0, 2, '+60% DEF nhưng −20% SPD trong 2 lượt.', 'self', [
      { type: 'mod', stat: 'def', amount: 0.6, turns: 2, target: 'self' },
      { type: 'mod', stat: 'spd', amount: -0.2, turns: 2, target: 'self' },
    ]),
    sk('frost-4', 'Sương Băng Mờ Ảo', 12, 0, 3, 'Ảo ảnh băng: đòn địch có 50% trượt.', 'self', [
      { type: 'status', id: 'veil', chance: 1, turns: 2, power: 0.5, target: 'self' },
    ]),
    sk('frost-5', 'Băng Gai Bộc Phá', 16, 0, 4, 'Ultimate. Kích nổ toàn bộ tầng băng còn trên mục tiêu.', 'enemy', [
      { type: 'detonate_frost' },
    ]),
  ],

  savanna: [
    sk('savanna-1', 'Săn Lùng Theo Đàn', 8, 1, 1, 'Sát thương cơ bản. +10% sát thương mỗi 10% HP mục tiêu đã mất.', 'enemy', [
      { type: 'damage', power: 1, missingTargetHpStep: 0.1, missingTargetHpBonus: 0.1 },
    ]),
    sk('savanna-2', 'Tiếng Hú Cuồng Nhiệt', 12, 0, 3, 'Bản thân và đồng minh +30% ATK trong 2 lượt.', 'party', [
      { type: 'mod', stat: 'atk', amount: 0.3, turns: 2, target: 'party' },
    ]),
    sk('savanna-3', 'Tiếng Hú Rùng Rợn', 12, 0, 3, 'Toàn bộ địch −25% ATK trong 2 lượt.', 'enemies', [
      { type: 'mod', stat: 'atk', amount: -0.25, turns: 2, target: 'enemies' },
    ]),
    sk('savanna-4', 'Vượt Rào Báo Đốm', 10, 0, 2, 'Né 100% mọi đòn đánh thường trong lượt này.', 'self', [
      { type: 'evade_basics', turns: 1 },
    ]),
    sk('savanna-5', 'Vồ Cổ Kết Liễu', 18, 2, 4, 'Ultimate. 200% ATK. Nếu hạ mục tiêu: hồi 100% MP và reset hồi chiêu.', 'enemy', [
      { type: 'damage', power: 2, killRestore: true },
    ]),
  ],

  volcano: [
    sk('volcano-1', 'Cột Lửa Dung Nham', 10, 1.3, 1, 'Sát thương Hỏa 130% ATK. Gây Bỏng (−20% ATK địch).', 'enemy', [
      { type: 'damage', power: 1.3 },
      { type: 'status', id: 'burn', chance: 1, turns: 2, power: 0.06, target: 'enemy' },
      { type: 'mod', stat: 'atk', amount: -0.2, turns: 2, target: 'enemy' },
    ]),
    sk('volcano-2', 'Bộc Phá Năng Lượng', 8, 0, 2, 'Hy sinh 20% HP hiện tại. Đòn kế +100% sát thương.', 'self', [
      { type: 'sacrifice_hp', pctCurrent: 0.2, target: 'self' },
      { type: 'next_attack_boost', amount: 1 },
    ]),
    sk('volcano-3', 'Nổ Dung Nham', 14, 0.9, 3, 'Sát thương Hỏa diện rộng 90% ATK. Bỏng duy trì 3 lượt.', 'enemies', [
      { type: 'damage', power: 0.9, aoe: 'enemies' },
      { type: 'status', id: 'burn', chance: 1, turns: 3, power: 0.05, target: 'enemies' },
    ]),
    sk('volcano-4', 'Tháp Lửa Phòng Thủ', 12, 0, 3, 'Giáp dung nham: phản đòn cận chiến và gây Bỏng.', 'self', [
      { type: 'melee_thorns', pct: 0.25, turns: 2, burn: true },
    ]),
    sk('volcano-5', 'Cuồng Nộ Địa Ngục', 0, 0, 0, 'Ultimate (bị động). Tự kích khi HP dưới 30%: +50% ATK và +30% chí mạng.', 'self', [
      { type: 'enrage_below', hpPct: 0.3, atk: 0.5, crit: 0.3 },
    ]),
  ],

  desert: [
    sk('desert-1', 'Bão Cát Thiêu Đốt', 10, 1.2, 2, '3 đòn, mỗi đòn 40% ATK. Gây Khát (kỹ năng tốn gấp đôi MP).', 'enemy', [
      { type: 'damage', power: 0.4, hits: 3 },
      { type: 'status', id: 'thirst', chance: 1, turns: 2, target: 'enemy' },
      { type: 'mp_cost_mult', amount: 2, turns: 2 },
    ]),
    sk('desert-2', 'Dạng Cát Ảo Ảnh', 10, 0, 2, 'Hóa cát: +50% né tránh mọi đòn địch trong 1 lượt.', 'self', [
      { type: 'mod', stat: 'eva', amount: 0.5, turns: 1, target: 'self' },
    ]),
    sk('desert-3', 'Cát Lún Tự Tử', 12, 0, 3, 'Vùng cát lún: rút khiên mỗi lượt và chặn đổi pet / rút lui.', 'enemy', [
      { type: 'status', id: 'quicksand', chance: 1, turns: 2, target: 'enemy' },
      { type: 'status', id: 'block_swap', chance: 1, turns: 2, target: 'enemy' },
      { type: 'status', id: 'bound', chance: 1, turns: 2, target: 'enemy' },
    ]),
    sk('desert-4', 'Bão Cát Cuồng Phong', 12, 0, 3, 'Bẫy: địch mất máu mỗi khi di chuyển hoặc thi triển kỹ năng.', 'enemies', [
      { type: 'trap_cast', turns: 2, pct: 0.08 },
    ]),
    sk('desert-5', 'Khối Đá Cổ Đại', 14, 0, 4, 'Ultimate. Thành lũy cổ: +40% DEF và hồi ngay 10% HP tối đa.', 'self', [
      { type: 'mod', stat: 'def', amount: 0.4, turns: 2, target: 'self' },
      { type: 'heal', pctMax: 0.1, target: 'self' },
    ]),
  ],

  darkness: [
    sk('darkness-1', 'Hấp Thụ Linh Hồn', 8, 1, 1, 'Sát thương bóng tối 100% ATK. Hồi 50% sát thương gây ra.', 'enemy', [
      { type: 'damage', power: 1, lifesteal: 0.5 },
    ]),
    sk('darkness-2', 'Trầm Lặng Tuyệt Vọng', 12, 0, 3, 'Câm lặng 2 lượt: chỉ được đánh thường, khóa mọi kỹ năng.', 'enemy', [
      { type: 'status', id: 'silence', chance: 1, turns: 2, target: 'enemy' },
    ]),
    sk('darkness-3', 'Lời Nguyền Hắc Báo', 12, 0, 3, 'Nguyền: sau 3 lượt, nhận 30% sát thương theo HP đã mất trong thời gian đó.', 'enemy', [
      { type: 'status', id: 'curse_doom', chance: 1, turns: 3, target: 'enemy' },
    ]),
    sk('darkness-4', 'Ma Ảo Tráo Đổi', 12, 0, 3, 'Chuyển toàn bộ debuff trên bản thân sang tất cả địch.', 'self', [
      { type: 'transfer_debuffs' },
    ]),
    sk('darkness-5', 'Bàn Tẩy Cực Ác', 16, 1.5, 4, 'Ultimate. Sát thương bóng tối 150% ATK và cướp 20% MP mục tiêu.', 'enemy', [
      { type: 'damage', power: 1.5 },
      { type: 'steal_mp', pct: 0.2 },
    ]),
  ],

  light: [
    sk('light-1', 'Tia Sáng Trừng Phạt', 10, 1.2, 1, 'Sát thương Ánh Sáng 120% ATK. Bỏ qua 100% DEF của thực thể Bóng Tối / Địa Ngục.', 'enemy', [
      { type: 'damage', power: 1.2, bypassDefVs: ['darkness', 'hell'] },
    ]),
    sk('light-2', 'Thanh Tẩy Chi Quang', 12, 0, 2, 'Gỡ mọi debuff trên bản thân và hồi 25% HP.', 'self', [
      { type: 'heal', pctMax: 0.25, target: 'self', cleanse: ['all_debuff'] },
    ]),
    sk('light-3', 'Hào Quang Phản Chiếu', 12, 0, 3, 'Khiên phép: giảm 40% sát thương kỹ năng / phép từ địch.', 'self', [
      { type: 'magic_reduce', pct: 0.4, turns: 2 },
    ]),
    sk('light-4', 'Bàn Tay Cứu Rỗi', 12, 0, 2, 'Hồi cho đồng minh HP% thấp nhất và +20% DEF.', 'party', [
      { type: 'heal', pctMax: 0.2, target: 'ally_lowest' },
      { type: 'mod', stat: 'def', amount: 0.2, turns: 2, target: 'ally' },
    ]),
    sk('light-5', 'Thái Dương Trừng Phạt', 16, 1.4, 4, 'Ultimate. Sát thương Ánh Sáng diện rộng 140% ATK. 30% Choáng địch Bóng Tối / Địa Ngục.', 'enemies', [
      { type: 'damage', power: 1.4, aoe: 'enemies', stunChanceVs: ['darkness', 'hell'] },
    ]),
  ],

  heaven: [
    sk('heaven-1', 'Hào Quang Thiêng Liêng', 10, 1, 1, 'Sát thương Thiên 100% ATK. Địch −30% ATK và SPD trong 2 lượt.', 'enemy', [
      { type: 'damage', power: 1 },
      { type: 'mod', stat: 'atk', amount: -0.3, turns: 2, target: 'enemy' },
      { type: 'mod', stat: 'spd', amount: -0.3, turns: 2, target: 'enemy' },
    ]),
    sk('heaven-2', 'Sức Mạnh Phù Hộ', 12, 0, 3, 'Khiên thánh phản 40% sát thương về kẻ tấn công.', 'self', [
      { type: 'reflect', turns: 2, pct: 0.4, charges: 4, target: 'self' },
    ]),
    sk('heaven-3', 'Khiên Thánh Phù Hộ', 14, 0, 4, 'Rào chắn cho cả đội: vô hiệu hoàn toàn đòn địch kế tiếp.', 'party', [
      { type: 'barrier', target: 'party' },
    ]),
    sk('heaven-4', 'Phán Quyết Thánh Linh', 12, 1.1, 2, 'Sát thương chuẩn 110% ATK. +40% nếu HP bản thân > HP mục tiêu.', 'enemy', [
      { type: 'damage', power: 1.1, trueDamage: true, ifCasterHpGreater: 0.4 },
    ]),
    sk('heaven-5', 'Chuông Cầu Nguyện', 16, 0, 4, 'Ultimate. Tụng 3 lượt: mỗi lượt hồi 10% HP và 10% MP cho cả đội.', 'party', [
      { type: 'hp_mp_chant', hpPct: 0.1, mpPct: 0.1, turns: 3 },
    ]),
  ],

  hell: [
    sk('hell-1', 'Ngọn Lửa Thiêu Hồn', 10, 0, 2, 'Đốt trực tiếp hồ MP địch, cạn năng lượng để chặn thi triển kỹ năng.', 'enemy', [
      { type: 'burn_mp', pct: 1 },
    ]),
    sk('hell-2', 'Khế Ước Quỷ Dữ', 0, 0, 4, 'Hy sinh 30% HP tối đa. Hồi ngay 100% MP và đưa mọi hồi chiêu về 0.', 'self', [
      { type: 'sacrifice_hp', pctMax: 0.3, target: 'self' },
      { type: 'restore_mp', pctMax: 1, target: 'self' },
      { type: 'reset_cds' },
    ]),
    sk('hell-3', 'Xiềng Xích Linh Hồn', 12, 0, 3, 'Phong ấn kỹ năng mạnh nhất (Skill 5 / Ultimate) trong 2 lượt.', 'enemy', [
      { type: 'seal_ultimate', turns: 2 },
    ]),
    sk('hell-4', 'Hiến Tế Quỷ Vương', 10, 0, 3, 'Hy sinh 20% HP đồng minh để bản thân +60% ATK.', 'ally', [
      { type: 'sacrifice_hp', pctMax: 0.2, target: 'ally' },
      { type: 'mod', stat: 'atk', amount: 0.6, turns: 2, target: 'self' },
    ]),
    sk('hell-5', 'Bất Ứng Bất Tử', 16, 0, 5, 'Ultimate. Định mệnh 1 lượt: HP không thể xuống dưới 1.', 'self', [
      { type: 'undying', turns: 1 },
    ]),
  ],

  chaos: [
    sk('chaos-1', 'Đòn Đánh Bất Định', 8, 1, 1, 'Sát thương hỗn mang ngẫu nhiên từ 50% đến 250% sát thương gốc.', 'enemy', [
      { type: 'damage', power: 1, randomPower: [0.5, 2.5] },
    ]),
    sk('chaos-2', 'Đảo Ngược Số Phận', 14, 0, 4, 'Đổi % HP hiện tại giữa bản thân và mục tiêu.', 'enemy', [
      { type: 'swap_hp_pct' },
    ]),
    sk('chaos-3', 'Tráo Đổi Chỉ Số', 12, 0, 3, 'Ngẫu nhiên đổi ATK hoặc DEF với mục tiêu trong 2 lượt.', 'enemy', [
      { type: 'swap_stat', stats: ['atk', 'def'] },
    ]),
    sk('chaos-4', 'Lốc Xoáy Bất Định', 14, 0.5, 3, '1–5 đòn ngẫu nhiên. Mỗi đòn 10% gây Bỏng / Đóng băng / Độc / Choáng.', 'enemy', [
      {
        type: 'damage',
        power: 0.5,
        randomHits: [1, 5],
        statusOnHit: { id: 'burn', chance: 0.1, turns: 1 },
      },
    ]),
    sk('chaos-5', 'Xé Rách Không Gian', 16, 0, 4, 'Ultimate. Triệu bóng tối của pet địch, sát thương bằng 50% ATK mục tiêu.', 'enemy', [
      { type: 'damage', power: 0.5, scaleFromTargetAtk: 0.5 },
    ]),
  ],

  cosmic: [
    sk('cosmic-1', 'Bức Xạ Tinh Tú', 10, 1, 1, 'Sát thương chuẩn 100% ATK — không bị DEF, giáp hay khắc hệ ảnh hưởng.', 'enemy', [
      { type: 'damage', power: 1, trueDamage: true },
    ]),
    sk('cosmic-2', 'Hố Đen Ngừng Thời Gian', 12, 0, 3, 'Khóa tích AP/năng lượng và chặn dùng vật phẩm trong 2 lượt.', 'enemy', [
      { type: 'lock_energy', turns: 2, blockItems: true },
    ]),
    sk('cosmic-3', 'Trọng Lực Siêu Nhẹ', 12, 0, 2, 'Giảm trọng lực: +100% SPD, đổi −30% DEF trong 2 lượt.', 'self', [
      { type: 'mod', stat: 'spd', amount: 1, turns: 2, target: 'self' },
      { type: 'mod', stat: 'def', amount: -0.3, turns: 2, target: 'self' },
    ]),
    sk('cosmic-4', 'Ngôi Sao May Mắn', 12, 0, 3, 'Căn chỉnh vũ trụ: mọi đòn trong 2 lượt sau đều chí mạng 100%.', 'self', [
      { type: 'mod', stat: 'critRate', amount: 1, turns: 2, target: 'self' },
    ]),
    sk('cosmic-5', 'Hố Đen Nuốt Chửng', 18, 0, 4, 'Ultimate. Nuốt mọi khiên và buff địch, chuyển thành sát thương chuẩn lên HP.', 'enemy', [
      { type: 'damage', power: 1, trueDamage: true, convertBuffsToDamage: true },
    ]),
  ],
};

export function biomeSkillList(biome: BiomeId): Skill[] {
  return BIOME_KITS[biome].map((skill) => ({ ...skill, effects: skill.effects?.map((effect) => ({ ...effect })) }));
}

export function biomeUltimate(biome: BiomeId): Skill {
  return { ...BIOME_KITS[biome][4] };
}
