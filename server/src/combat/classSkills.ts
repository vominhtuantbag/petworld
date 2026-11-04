/**
 * Arena/Raid skill cards mirrored from the client 11-class trees.
 * Effects stay client-side; here we ship name / mana / power / cooldown.
 */

export type ClassSkillCard = {
  id: string;
  name: string;
  mana: number;
  power: number;
  cooldown: number;
};

export type ClassKitCards = {
  basics: [ClassSkillCard, ClassSkillCard];
  skills: [ClassSkillCard, ClassSkillCard, ClassSkillCard];
};

function sk(id: string, name: string, mana: number, power: number, cooldown: number): ClassSkillCard {
  return { id, name, mana, power, cooldown };
}

export const CLASS_SKILLS: Record<string, ClassKitCards> = {
  ranger: {
    basics: [sk('ranger-bolt', 'Bắn Nỏ Nhanh', 0, 1, 0), sk('ranger-spear', 'Lao Đâm Cảnh Báo', 0, 1.05, 0)],
    skills: [
      sk('ranger-trap', 'Bẫy Gai Chân', 8, 1.35, 2),
      sk('ranger-mark', 'Dấu Ấn Thợ Săn', 10, 1.2, 3),
      sk('ranger-bait', 'Mồi Dụ Hoang Dã', 12, 1.1, 4),
    ],
  },
  knight: {
    basics: [sk('knight-slash', 'Kiếm Chém Thẳng', 0, 1, 0), sk('knight-bash', 'Khiên Đập Choáng', 0, 0.85, 0)],
    skills: [
      sk('knight-oath', 'Lời Thề Bảo Vệ', 8, 1.2, 2),
      sk('knight-banner', 'Biểu Tượng Dũng Cảm', 12, 1.15, 4),
      sk('knight-vengeance', 'Cừu Thù Trừng Phạt', 10, 1.7, 3),
    ],
  },
  mage: {
    basics: [sk('mage-bolt', 'Tia Ma Thuật', 0, 1, 0), sk('mage-orb', 'Cầu Năng Lượng', 0, 1.05, 0)],
    skills: [
      sk('mage-burst', 'Bộc Phá Nguyên Tố', 10, 1.55, 2),
      sk('mage-meteor', 'Đá Thiên Thạch Rơi', 12, 1.7, 3),
      sk('mage-nova', 'Quả Cầu Huỷ Diệt', 14, 1.85, 4),
    ],
  },
  scout: {
    basics: [sk('scout-knife', 'Dao Bắn Tốc Độ', 0, 1, 0), sk('scout-point', 'Đánh Chỉ Điểm', 0, 0.85, 0)],
    skills: [
      sk('scout-weak', 'Thấu Thị Điểm Yếu', 10, 1.55, 3),
      sk('scout-smoke', 'Phấn Khói Đột Kích', 10, 1.1, 3),
      sk('scout-chaos', 'Bẫy Rối Loạn', 12, 1.2, 4),
    ],
  },
  monk: {
    basics: [sk('monk-staff', 'Gậy Thánh Phạt', 0, 0.95, 0), sk('monk-chant', 'Chú Nguyên Lượng', 0, 0.9, 0)],
    skills: [
      sk('monk-ward', 'Phù Hộ Phạn Tiên', 10, 1.1, 3),
      sk('monk-pray', 'Lời Nguyện Trì Luân', 12, 1.05, 4),
      sk('monk-mirror', 'Phản Chiếu Linh Hồn', 12, 1.15, 4),
    ],
  },
  archer: {
    basics: [sk('archer-sharp', 'Mũi Tên Sắc Báo', 0, 1, 0), sk('archer-twin', 'Bắn Song Mũi', 0, 1.1, 0)],
    skills: [
      sk('archer-rain', 'Mưa Tên Xuyên Phá', 8, 1.55, 2),
      sk('archer-snipe', 'Ngắm Bắn Tinh Anh', 10, 2.2, 3),
      sk('archer-gravity', 'Mũi Tên Trọng Lực', 12, 1.7, 4),
    ],
  },
  healer: {
    basics: [sk('healer-needle', 'Kim Độc Cảnh Báo', 0, 0.85, 0), sk('healer-boost', 'Tiêm Năng Lượng', 0, 1, 0)],
    skills: [
      sk('healer-revive', 'Mũi Tiêm Hồi Sức', 8, 1.05, 2),
      sk('healer-rage', 'Thuốc Tăng Lực Cuồng Báo', 10, 1.2, 3),
      sk('healer-field', 'Trụ Sinh Học Bảo Vệ', 14, 1.1, 5),
    ],
  },
  rogue: {
    basics: [sk('rogue-pick', 'Móc Túi Trộm AP', 0, 0.8, 0), sk('rogue-backstab', 'Đâm Lén Từ Phía Sau', 0, 1.1, 0)],
    skills: [
      sk('rogue-sand', 'Mù Cát Bộc Phát', 8, 1.35, 2),
      sk('rogue-strip', 'Tước Đoạt Vũ Khí/Buff', 10, 1.5, 3),
      sk('rogue-escape', 'Tẩu Thoát Mù Khói', 12, 1.15, 4),
    ],
  },
  guardian: {
    basics: [sk('guardian-slam', 'Đập Khiên Trọng Lực', 0, 1, 0), sk('guardian-chain', 'Quật Xích Giữ Chân', 0, 1, 0)],
    skills: [
      sk('guardian-fort', 'Thành Trì Bất Khả Xâm Phạm', 10, 1.2, 3),
      sk('guardian-aegis', 'Hủy Sát Thương Chí Mạng', 12, 1.1, 4),
      sk('guardian-rebound', 'Phản Pháo Quật Cường', 12, 1.75, 4),
    ],
  },
  wanderer: {
    basics: [sk('wanderer-dance', 'Kiếm Vũ', 0, 1, 0), sk('wanderer-drink', 'Rót Rượu Tụ Khí', 0, 1, 0)],
    skills: [
      sk('wanderer-blade', 'Phong Nhẫn Biến Hóa', 8, 1.45, 2),
      sk('wanderer-fate', 'Bàn Cờ Số Phận', 10, 1.3, 3),
      sk('wanderer-ultimate', 'Kiếm Pháp Tuyệt Học', 12, 1.7, 4),
    ],
  },
  bard: {
    basics: [sk('bard-toxin', 'Dao Độc Âm Phong', 0, 1, 0), sk('bard-ambush', 'Ám Sát Nhanh', 0, 1.25, 0)],
    skills: [
      sk('bard-vanish', 'Vô Hình / Ẩn Núp', 10, 1.2, 3),
      sk('bard-execute', 'Kết Liễu Điểm Yếu', 10, 1.7, 3),
      sk('bard-soul', 'Trảm Hồn Tuyệt Kỹ', 12, 1.9, 4),
    ],
  },
};

const PROFESSION_FROM_AVATAR: Record<string, string> = {
  ranger: 'ranger',
  knight: 'knight',
  mage: 'mage',
  scout: 'scout',
  monk: 'monk',
  archer: 'archer',
  healer: 'healer',
  rogue: 'rogue',
  guardian: 'guardian',
  wanderer: 'wanderer',
  bard: 'bard',
};

export function professionFromAvatar(baseAvatarId: string | undefined): string {
  const raw = (baseAvatarId ?? '').replace(/^[mf]-/, '');
  return PROFESSION_FROM_AVATAR[raw] ?? 'wanderer';
}

/** Two equipped actives for arena (skills 0 and 1 of the kit). */
export function arenaSkills(professionId: string | undefined): [ClassSkillCard, ClassSkillCard] {
  const kit = CLASS_SKILLS[professionId ?? ''] ?? CLASS_SKILLS.wanderer;
  return [kit.skills[0], kit.skills[1]];
}

export function arenaBasic(professionId: string | undefined): ClassSkillCard {
  const kit = CLASS_SKILLS[professionId ?? ''] ?? CLASS_SKILLS.wanderer;
  return kit.basics[0];
}
