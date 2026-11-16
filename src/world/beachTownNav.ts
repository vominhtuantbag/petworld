import type { Rect, Vec } from './types';

/**
 * @deprecated Prefer `townGridNav.ts` — all 16 towns now share the 5000×5000 valley grid mask.
 * Kept for reference to the older beach-only overlay.
 */
export const BEACH_NAV_VERSION = 3;

/** Solid blockers in art-board space (1600×900). */
export const BEACH_LAYOUT_BLOCKS: readonly Rect[] = [
  { x: 431, y: 0, w: 1144, h: 9 },
  { x: 0, y: 0, w: 272, h: 9 },
  { x: 0, y: 9, w: 253, h: 9 },
  { x: 1556, y: 9, w: 19, h: 9 },
  { x: 450, y: 9, w: 1078, h: 9 },
  { x: 469, y: 19, w: 1031, h: 9 },
  { x: 0, y: 19, w: 225, h: 9 },
  { x: 1556, y: 19, w: 38, h: 19 },
  { x: 488, y: 28, w: 1012, h: 9 },
  { x: 319, y: 28, w: 9, h: 9 },
  { x: 0, y: 28, w: 206, h: 9 },
  { x: 291, y: 38, w: 56, h: 9 },
  { x: 506, y: 38, w: 994, h: 9 },
  { x: 0, y: 38, w: 188, h: 9 },
  { x: 1528, y: 38, w: 66, h: 9 },
  { x: 272, y: 47, w: 94, h: 9 },
  { x: 525, y: 47, w: 1069, h: 9 },
  { x: 0, y: 47, w: 169, h: 9 },
  { x: 253, y: 56, w: 131, h: 9 },
  { x: 544, y: 56, w: 1050, h: 9 },
  { x: 0, y: 56, w: 150, h: 9 },
  { x: 0, y: 66, w: 94, h: 9 },
  { x: 862, y: 66, w: 712, h: 9 },
  { x: 562, y: 66, w: 234, h: 9 },
  { x: 225, y: 66, w: 178, h: 9 },
  { x: 872, y: 75, w: 666, h: 9 },
  { x: 0, y: 75, w: 84, h: 9 },
  { x: 197, y: 75, w: 225, h: 9 },
  { x: 572, y: 75, w: 216, h: 9 },
  { x: 0, y: 84, w: 66, h: 9 },
  { x: 188, y: 84, w: 253, h: 9 },
  { x: 891, y: 84, w: 638, h: 9 },
  { x: 600, y: 84, w: 159, h: 9 },
  { x: 919, y: 94, w: 591, h: 9 },
  { x: 0, y: 94, w: 9, h: 9 },
  { x: 169, y: 94, w: 281, h: 9 },
  { x: 619, y: 94, w: 131, h: 9 },
  { x: 628, y: 103, w: 122, h: 9 },
  { x: 1584, y: 103, w: 9, h: 9 },
  { x: 938, y: 103, w: 544, h: 9 },
  { x: 141, y: 103, w: 328, h: 9 },
  { x: 806, y: 112, w: 47, h: 9 },
  { x: 159, y: 112, w: 328, h: 9 },
  { x: 656, y: 112, w: 94, h: 9 },
  { x: 947, y: 112, w: 506, h: 9 },
  { x: 1575, y: 112, w: 19, h: 9 },
  { x: 975, y: 122, w: 459, h: 9 },
  { x: 675, y: 122, w: 9, h: 9 },
  { x: 169, y: 122, w: 338, h: 9 },
  { x: 731, y: 122, w: 159, h: 9 },
  { x: 188, y: 131, w: 338, h: 9 },
  { x: 994, y: 131, w: 441, h: 9 },
  { x: 0, y: 141, w: 19, h: 9 },
  { x: 188, y: 141, w: 356, h: 9 },
  { x: 1509, y: 122, w: 84, h: 28 },
  { x: 731, y: 131, w: 178, h: 19 },
  { x: 1012, y: 141, w: 412, h: 9 },
  { x: 216, y: 150, w: 347, h: 9 },
  { x: 731, y: 150, w: 188, h: 9 },
  { x: 0, y: 150, w: 38, h: 9 },
  { x: 1031, y: 150, w: 366, h: 9 },
  { x: 1491, y: 150, w: 103, h: 9 },
  { x: 216, y: 159, w: 328, h: 9 },
  { x: 750, y: 159, w: 150, h: 9 },
  { x: 1153, y: 159, w: 234, h: 9 },
  { x: 0, y: 159, w: 56, h: 9 },
  { x: 1050, y: 159, w: 75, h: 9 },
  { x: 1481, y: 159, w: 112, h: 9 },
  { x: 1069, y: 169, w: 56, h: 9 },
  { x: 1153, y: 169, w: 216, h: 9 },
  { x: 956, y: 169, w: 9, h: 9 },
  { x: 253, y: 169, w: 272, h: 9 },
  { x: 759, y: 169, w: 122, h: 9 },
  { x: 0, y: 169, w: 75, h: 9 },
  { x: 1453, y: 169, w: 141, h: 9 },
  { x: 1088, y: 178, w: 38, h: 9 },
  { x: 1153, y: 178, w: 206, h: 9 },
  { x: 0, y: 178, w: 94, h: 9 },
  { x: 272, y: 178, w: 234, h: 9 },
  { x: 1444, y: 178, w: 150, h: 9 },
  { x: 619, y: 178, w: 28, h: 9 },
  { x: 788, y: 178, w: 66, h: 9 },
  { x: 947, y: 178, w: 28, h: 9 },
  { x: 797, y: 188, w: 47, h: 9 },
  { x: 1425, y: 188, w: 169, h: 9 },
  { x: 928, y: 188, w: 66, h: 9 },
  { x: 1106, y: 188, w: 216, h: 9 },
  { x: 0, y: 188, w: 112, h: 9 },
  { x: 591, y: 188, w: 75, h: 9 },
  { x: 291, y: 188, w: 197, h: 9 },
  { x: 0, y: 197, w: 131, h: 9 },
  { x: 1406, y: 197, w: 188, h: 9 },
  { x: 881, y: 197, w: 131, h: 9 },
  { x: 1125, y: 197, w: 169, h: 9 },
  { x: 300, y: 197, w: 178, h: 9 },
  { x: 806, y: 197, w: 28, h: 9 },
  { x: 572, y: 197, w: 112, h: 9 },
  { x: 562, y: 206, w: 141, h: 9 },
  { x: 881, y: 206, w: 150, h: 9 },
  { x: 1388, y: 206, w: 206, h: 9 },
  { x: 1144, y: 206, w: 131, h: 9 },
  { x: 328, y: 206, w: 122, h: 9 },
  { x: 0, y: 206, w: 150, h: 9 },
  { x: 872, y: 216, w: 178, h: 9 },
  { x: 1359, y: 216, w: 234, h: 9 },
  { x: 534, y: 216, w: 178, h: 9 },
  { x: 1162, y: 216, w: 94, h: 9 },
  { x: 338, y: 216, w: 94, h: 9 },
  { x: 0, y: 216, w: 169, h: 9 },
  { x: 356, y: 225, w: 75, h: 9 },
  { x: 881, y: 225, w: 159, h: 9 },
  { x: 516, y: 225, w: 216, h: 9 },
  { x: 1162, y: 225, w: 84, h: 9 },
  { x: 1350, y: 225, w: 244, h: 9 },
  { x: 0, y: 225, w: 188, h: 9 },
  { x: 891, y: 234, w: 131, h: 9 },
  { x: 0, y: 234, w: 206, h: 9 },
  { x: 1331, y: 234, w: 262, h: 9 },
  { x: 375, y: 234, w: 28, h: 9 },
  { x: 1162, y: 234, w: 75, h: 9 },
  { x: 497, y: 234, w: 253, h: 9 },
  { x: 1162, y: 244, w: 66, h: 9 },
  { x: 909, y: 244, w: 103, h: 9 },
  { x: 0, y: 244, w: 197, h: 9 },
  { x: 1322, y: 244, w: 272, h: 9 },
  { x: 478, y: 244, w: 291, h: 9 },
  { x: 1116, y: 253, w: 84, h: 9 },
  { x: 919, y: 253, w: 94, h: 9 },
  { x: 450, y: 253, w: 338, h: 9 },
  { x: 1294, y: 253, w: 300, h: 9 },
  { x: 244, y: 253, w: 28, h: 9 },
  { x: 938, y: 262, w: 38, h: 9 },
  { x: 441, y: 262, w: 366, h: 9 },
  { x: 1116, y: 262, w: 66, h: 9 },
  { x: 1275, y: 262, w: 319, h: 9 },
  { x: 253, y: 262, w: 9, h: 9 },
  { x: 1266, y: 272, w: 328, h: 9 },
  { x: 1153, y: 272, w: 9, h: 9 },
  { x: 0, y: 253, w: 188, h: 28 },
  { x: 1116, y: 272, w: 9, h: 9 },
  { x: 469, y: 272, w: 356, h: 9 },
  { x: 1069, y: 281, w: 47, h: 9 },
  { x: 469, y: 281, w: 366, h: 9 },
  { x: 0, y: 281, w: 197, h: 9 },
  { x: 1238, y: 281, w: 356, h: 9 },
  { x: 488, y: 291, w: 366, h: 9 },
  { x: 0, y: 291, w: 216, h: 9 },
  { x: 1050, y: 291, w: 47, h: 9 },
  { x: 1228, y: 291, w: 366, h: 9 },
  { x: 300, y: 291, w: 38, h: 9 },
  { x: 1031, y: 300, w: 47, h: 9 },
  { x: 1172, y: 300, w: 9, h: 9 },
  { x: 497, y: 300, w: 375, h: 9 },
  { x: 1209, y: 300, w: 384, h: 9 },
  { x: 0, y: 300, w: 234, h: 9 },
  { x: 291, y: 300, w: 47, h: 9 },
  { x: 0, y: 309, w: 356, h: 9 },
  { x: 525, y: 309, w: 366, h: 9 },
  { x: 1050, y: 309, w: 19, h: 19 },
  { x: 544, y: 319, w: 319, h: 9 },
  { x: 0, y: 319, w: 384, h: 9 },
  { x: 1162, y: 309, w: 431, h: 19 },
  { x: 0, y: 328, w: 394, h: 9 },
  { x: 553, y: 328, w: 291, h: 9 },
  { x: 1153, y: 328, w: 441, h: 9 },
  { x: 1134, y: 338, w: 459, h: 9 },
  { x: 600, y: 338, w: 216, h: 9 },
  { x: 0, y: 338, w: 412, h: 9 },
  { x: 1116, y: 347, w: 478, h: 9 },
  { x: 0, y: 347, w: 431, h: 9 },
  { x: 609, y: 347, w: 188, h: 9 },
  { x: 628, y: 356, w: 169, h: 9 },
  { x: 0, y: 356, w: 441, h: 9 },
  { x: 1144, y: 356, w: 450, h: 9 },
  { x: 0, y: 366, w: 469, h: 9 },
  { x: 647, y: 366, w: 150, h: 9 },
  { x: 1162, y: 366, w: 431, h: 9 },
  { x: 919, y: 366, w: 47, h: 9 },
  { x: 900, y: 375, w: 94, h: 9 },
  { x: 1172, y: 375, w: 422, h: 9 },
  { x: 666, y: 375, w: 94, h: 9 },
  { x: 0, y: 375, w: 478, h: 9 },
  { x: 1191, y: 384, w: 403, h: 9 },
  { x: 675, y: 384, w: 84, h: 9 },
  { x: 881, y: 384, w: 131, h: 9 },
  { x: 0, y: 384, w: 497, h: 9 },
  { x: 0, y: 394, w: 516, h: 9 },
  { x: 862, y: 394, w: 169, h: 9 },
  { x: 1209, y: 394, w: 384, h: 9 },
  { x: 1228, y: 403, w: 366, h: 9 },
  { x: 844, y: 403, w: 206, h: 9 },
  { x: 703, y: 394, w: 47, h: 19 },
  { x: 0, y: 403, w: 534, h: 9 },
  { x: 825, y: 412, w: 244, h: 9 },
  { x: 1247, y: 412, w: 347, h: 9 },
  { x: 0, y: 412, w: 553, h: 9 },
  { x: 806, y: 422, w: 272, h: 9 },
  { x: 0, y: 422, w: 572, h: 9 },
  { x: 1266, y: 422, w: 328, h: 9 },
  { x: 778, y: 431, w: 328, h: 9 },
  { x: 0, y: 431, w: 581, h: 9 },
  { x: 1275, y: 431, w: 319, h: 9 },
  { x: 759, y: 441, w: 366, h: 9 },
  { x: 0, y: 441, w: 75, h: 9 },
  { x: 112, y: 441, w: 488, h: 9 },
  { x: 159, y: 450, w: 422, h: 9 },
  { x: 0, y: 450, w: 9, h: 9 },
  { x: 731, y: 450, w: 431, h: 9 },
  { x: 1303, y: 441, w: 291, h: 19 },
  { x: 1341, y: 459, w: 253, h: 9 },
  { x: 703, y: 459, w: 459, h: 9 },
  { x: 169, y: 459, w: 394, h: 9 },
  { x: 675, y: 469, w: 328, h: 9 },
  { x: 188, y: 469, w: 356, h: 9 },
  { x: 1350, y: 469, w: 244, h: 9 },
  { x: 1069, y: 469, w: 112, h: 9 },
  { x: 1378, y: 478, w: 216, h: 9 },
  { x: 197, y: 478, w: 347, h: 9 },
  { x: 656, y: 478, w: 338, h: 9 },
  { x: 984, y: 488, w: 9, h: 9 },
  { x: 216, y: 488, w: 234, h: 9 },
  { x: 628, y: 488, w: 328, h: 9 },
  { x: 1397, y: 488, w: 197, h: 9 },
  { x: 478, y: 488, w: 66, h: 9 },
  { x: 534, y: 497, w: 9, h: 9 },
  { x: 225, y: 497, w: 225, h: 9 },
  { x: 1416, y: 497, w: 178, h: 9 },
  { x: 816, y: 497, w: 122, h: 9 },
  { x: 600, y: 497, w: 188, h: 9 },
  { x: 234, y: 506, w: 216, h: 9 },
  { x: 534, y: 506, w: 28, h: 9 },
  { x: 834, y: 506, w: 94, h: 9 },
  { x: 1425, y: 506, w: 169, h: 9 },
  { x: 591, y: 506, w: 197, h: 9 },
  { x: 234, y: 516, w: 122, h: 9 },
  { x: 853, y: 516, w: 56, h: 9 },
  { x: 534, y: 516, w: 234, h: 9 },
  { x: 1444, y: 516, w: 150, h: 9 },
  { x: 84, y: 516, w: 38, h: 9 },
  { x: 0, y: 516, w: 19, h: 9 },
  { x: 384, y: 516, w: 75, h: 9 },
  { x: 66, y: 525, w: 28, h: 9 },
  { x: 234, y: 525, w: 94, h: 9 },
  { x: 384, y: 525, w: 84, h: 9 },
  { x: 150, y: 525, w: 9, h: 9 },
  { x: 872, y: 525, w: 28, h: 9 },
  { x: 506, y: 525, w: 253, h: 9 },
  { x: 1462, y: 525, w: 131, h: 9 },
  { x: 1481, y: 534, w: 112, h: 9 },
  { x: 75, y: 534, w: 19, h: 9 },
  { x: 394, y: 534, w: 56, h: 9 },
  { x: 506, y: 534, w: 234, h: 9 },
  { x: 131, y: 534, w: 9, h: 19 },
  { x: 1500, y: 544, w: 94, h: 9 },
  { x: 0, y: 525, w: 38, h: 28 },
  { x: 506, y: 544, w: 225, h: 9 },
  { x: 403, y: 544, w: 28, h: 9 },
  { x: 188, y: 544, w: 9, h: 9 },
  { x: 1031, y: 553, w: 9, h: 9 },
  { x: 478, y: 553, w: 253, h: 9 },
  { x: 272, y: 534, w: 38, h: 28 },
  { x: 0, y: 553, w: 47, h: 9 },
  { x: 169, y: 553, w: 38, h: 9 },
  { x: 1519, y: 553, w: 75, h: 9 },
  { x: 1341, y: 562, w: 28, h: 9 },
  { x: 272, y: 562, w: 56, h: 9 },
  { x: 459, y: 562, w: 272, h: 9 },
  { x: 1012, y: 562, w: 19, h: 9 },
  { x: 1538, y: 562, w: 56, h: 9 },
  { x: 994, y: 572, w: 38, h: 9 },
  { x: 769, y: 562, w: 9, h: 19 },
  { x: 0, y: 562, w: 56, h: 19 },
  { x: 1331, y: 572, w: 47, h: 9 },
  { x: 431, y: 572, w: 309, h: 9 },
  { x: 1556, y: 572, w: 38, h: 9 },
  { x: 975, y: 581, w: 28, h: 9 },
  { x: 0, y: 581, w: 66, h: 9 },
  { x: 394, y: 581, w: 403, h: 9 },
  { x: 1575, y: 581, w: 19, h: 9 },
  { x: 1341, y: 581, w: 28, h: 9 },
  { x: 366, y: 591, w: 431, h: 9 },
  { x: 0, y: 591, w: 84, h: 9 },
  { x: 956, y: 591, w: 47, h: 9 },
  { x: 1341, y: 591, w: 9, h: 9 },
  { x: 0, y: 600, w: 103, h: 19 },
  { x: 1425, y: 609, w: 28, h: 9 },
  { x: 272, y: 600, w: 525, h: 19 },
  { x: 0, y: 619, w: 159, h: 9 },
  { x: 909, y: 600, w: 94, h: 28 },
  { x: 1416, y: 619, w: 56, h: 9 },
  { x: 1388, y: 628, w: 103, h: 9 },
  { x: 0, y: 628, w: 169, h: 9 },
  { x: 253, y: 619, w: 553, h: 19 },
  { x: 1378, y: 638, w: 131, h: 9 },
  { x: 253, y: 638, w: 544, h: 9 },
  { x: 0, y: 638, w: 178, h: 9 },
  { x: 900, y: 628, w: 94, h: 19 },
  { x: 1378, y: 647, w: 141, h: 9 },
  { x: 253, y: 647, w: 525, h: 9 },
  { x: 919, y: 647, w: 66, h: 9 },
  { x: 0, y: 647, w: 188, h: 9 },
  { x: 234, y: 656, w: 525, h: 9 },
  { x: 0, y: 656, w: 197, h: 9 },
  { x: 938, y: 656, w: 47, h: 9 },
  { x: 1388, y: 656, w: 169, h: 9 },
  { x: 947, y: 666, w: 38, h: 9 },
  { x: 1397, y: 666, w: 169, h: 9 },
  { x: 1416, y: 675, w: 159, h: 9 },
  { x: 956, y: 675, w: 38, h: 9 },
  { x: 956, y: 684, w: 47, h: 9 },
  { x: 1416, y: 684, w: 178, h: 9 },
  { x: 1434, y: 694, w: 159, h: 9 },
  { x: 956, y: 694, w: 66, h: 9 },
  { x: 956, y: 703, w: 75, h: 9 },
  { x: 947, y: 712, w: 84, h: 9 },
  { x: 0, y: 666, w: 750, h: 56 },
  { x: 778, y: 712, w: 9, h: 9 },
  { x: 1444, y: 703, w: 150, h: 19 },
  { x: 1153, y: 712, w: 9, h: 9 },
  { x: 947, y: 722, w: 94, h: 9 },
  { x: 1453, y: 722, w: 141, h: 9 },
  { x: 1462, y: 731, w: 131, h: 9 },
  { x: 938, y: 731, w: 122, h: 9 },
  { x: 1191, y: 741, w: 38, h: 9 },
  { x: 0, y: 722, w: 797, h: 28 },
  { x: 1472, y: 741, w: 122, h: 9 },
  { x: 891, y: 741, w: 188, h: 9 },
  { x: 1481, y: 750, w: 112, h: 9 },
  { x: 0, y: 750, w: 816, h: 9 },
  { x: 862, y: 750, w: 234, h: 9 },
  { x: 1162, y: 750, w: 66, h: 9 },
  { x: 1491, y: 759, w: 103, h: 9 },
  { x: 0, y: 759, w: 1228, h: 9 },
  { x: 1303, y: 769, w: 9, h: 9 },
  { x: 0, y: 769, w: 1238, h: 9 },
  { x: 1500, y: 769, w: 94, h: 9 },
  { x: 1388, y: 769, w: 9, h: 9 },
  { x: 1528, y: 778, w: 66, h: 9 },
  { x: 1538, y: 788, w: 56, h: 9 },
  { x: 1547, y: 797, w: 47, h: 9 },
  { x: 0, y: 778, w: 1397, h: 28 },
  { x: 1556, y: 806, w: 38, h: 9 },
  { x: 1566, y: 816, w: 28, h: 9 },
  { x: 0, y: 806, w: 1416, h: 28 },
  { x: 1575, y: 825, w: 19, h: 19 },
  { x: 0, y: 834, w: 1425, h: 9 },
  { x: 0, y: 844, w: 1444, h: 9 },
  { x: 1584, y: 844, w: 9, h: 9 },
  { x: 0, y: 853, w: 1453, h: 9 },
  { x: 0, y: 862, w: 1462, h: 9 },
  { x: 0, y: 872, w: 1472, h: 9 },
  { x: 0, y: 881, w: 1116, h: 19 },
];

export function scaleBeachBlocks(scale: number): Rect[] {
  return BEACH_LAYOUT_BLOCKS.map((block) => ({
    x: block.x * scale,
    y: block.y * scale,
    w: Math.max(1, block.w * scale),
    h: Math.max(1, block.h * scale),
  }));
}

export function hitsBeachBlockLayout(x: number, y: number, radius = 0): boolean {
  for (const block of BEACH_LAYOUT_BLOCKS) {
    if (x + radius > block.x && x - radius < block.x + block.w && y + radius > block.y && y - radius < block.y + block.h) {
      return true;
    }
  }
  return false;
}

/** True on beige roads / sand (outside the red solid mask). */
export function isBeachWalkableLayout(x: number, y: number, radius = 10): boolean {
  if (x < 8 || y < 8 || x > 1592 || y > 892) return false;
  return !hitsBeachBlockLayout(x, y, radius);
}

export function snapBeachLayout(x: number, y: number, maxRadius = 280): Vec {
  if (isBeachWalkableLayout(x, y, 8)) return { x, y };
  for (let radius = 8; radius <= maxRadius; radius += 6) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 14) {
      const nx = Math.round(x + Math.cos(angle) * radius);
      const ny = Math.round(y + Math.sin(angle) * radius);
      if (isBeachWalkableLayout(nx, ny, 8)) return { x: nx, y: ny };
    }
  }
  return { x, y };
}

/** Reject or reroute a world-space click/move target. Null = hard reject. */
export function resolveBeachWalkTarget(worldX: number, worldY: number, scale: number, maxLayoutRadius = 280): Vec | null {
  const layout = snapBeachLayout(worldX / scale, worldY / scale, maxLayoutRadius);
  if (!isBeachWalkableLayout(layout.x, layout.y, 8)) return null;
  return { x: layout.x * scale, y: layout.y * scale };
}

const PATH_CELL = 24;

/**
 * Coarse A* on the beige walkable mask. Destinations inside red solids are
 * snapped first; if still blocked, returns null.
 */
export function findBeachPathLayout(from: Vec, to: Vec, maxNodes = 1800): Vec[] | null {
  const start = snapBeachLayout(from.x, from.y, 120);
  const goal = snapBeachLayout(to.x, to.y, 160);
  if (!isBeachWalkableLayout(start.x, start.y, 6) || !isBeachWalkableLayout(goal.x, goal.y, 6)) return null;

  const key = (x: number, y: number) => `${x}:${y}`;
  const startCell = { x: Math.round(start.x / PATH_CELL) * PATH_CELL, y: Math.round(start.y / PATH_CELL) * PATH_CELL };
  const goalCell = { x: Math.round(goal.x / PATH_CELL) * PATH_CELL, y: Math.round(goal.y / PATH_CELL) * PATH_CELL };
  type Node = { x: number; y: number; g: number; f: number; parent: string | null };
  const open: Node[] = [{ x: startCell.x, y: startCell.y, g: 0, f: Math.hypot(goalCell.x - startCell.x, goalCell.y - startCell.y), parent: null }];
  const best = new Map<string, Node>();
  best.set(key(startCell.x, startCell.y), open[0]);
  const dirs = [
    [PATH_CELL, 0],
    [-PATH_CELL, 0],
    [0, PATH_CELL],
    [0, -PATH_CELL],
    [PATH_CELL, PATH_CELL],
    [PATH_CELL, -PATH_CELL],
    [-PATH_CELL, PATH_CELL],
    [-PATH_CELL, -PATH_CELL],
  ] as const;

  let guard = 0;
  while (open.length > 0 && guard < maxNodes) {
    guard += 1;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (Math.hypot(current.x - goalCell.x, current.y - goalCell.y) <= PATH_CELL) {
      const path: Vec[] = [{ x: goal.x, y: goal.y }];
      let cursor: Node | undefined = current;
      while (cursor) {
        path.push({ x: cursor.x, y: cursor.y });
        cursor = cursor.parent ? best.get(cursor.parent) : undefined;
      }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!isBeachWalkableLayout(nx, ny, 8)) continue;
      const step = Math.hypot(dx, dy);
      const g = current.g + step;
      const id = key(nx, ny);
      const prev = best.get(id);
      if (prev && prev.g <= g) continue;
      const node: Node = { x: nx, y: ny, g, f: g + Math.hypot(goalCell.x - nx, goalCell.y - ny), parent: key(current.x, current.y) };
      best.set(id, node);
      open.push(node);
    }
  }
  return null;
}

export function findBeachPathWorld(from: Vec, to: Vec, scale: number): Vec[] | null {
  const path = findBeachPathLayout({ x: from.x / scale, y: from.y / scale }, { x: to.x / scale, y: to.y / scale });
  return path ? path.map((point) => ({ x: point.x * scale, y: point.y * scale })) : null;
}
