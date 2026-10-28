/** Mirror of the open-world payloads in server/src/realtime/world.ts. */

export type WorldAvatar = {
  userId: string;
  username: string;
  name: string;
  x: number;
  y: number;
  facing: 1 | -1;
  baseCharacterId: string;
  gender: 'male' | 'female';
  hairColor: string;
  outfitColor: string;
  level: number;
  hp: number;
  maxHp: number;
  zoneId?: string;
};

export type WorldMotion = {
  userId: string;
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
};

export type MapChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  at: number;
  whisper?: boolean;
  toUsername?: string;
};

export type WorldEnter = {
  zoneId: string;
  userId?: string;
  username?: string;
  x: number;
  y: number;
  facing: 1 | -1;
  name: string;
  baseCharacterId: string;
  gender: 'male' | 'female';
  hairColor: string;
  outfitColor: string;
  level: number;
  hp: number;
  maxHp: number;
};
