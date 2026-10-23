/**
 * Mirror of server/src/realtime/protocol.ts.
 * The server is the authority for hit points, the timer, and the log.
 */

export type CombatAction = 'attack' | 'skill' | 'defend';

export type Gender = 'male' | 'female';

export type FighterView = {
  userId: string;
  username: string;
  name: string;
  gender: Gender;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  startingRegion: string;
  level: number;
  attack: number;
  defense: number;
  maxHp: number;
  hp: number;
  ready: boolean;
};

export type BattleView = {
  roomId: string;
  round: number;
  deadline: number;
  status: 'active' | 'finished';
  winnerId: string | null;
  log: string[];
  you: FighterView;
  opponent: FighterView;
};

export type QueueView = {
  state: 'idle' | 'queued';
  position: number;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

export type CharacterStats = {
  hp: number;
  attack: number;
  defense: number;
  level: number;
  wins: number;
  losses: number;
};

export type ServerCharacter = {
  id: string;
  userId: string;
  name: string;
  gender: Gender;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  startingRegion: string;
  stats: CharacterStats;
};
