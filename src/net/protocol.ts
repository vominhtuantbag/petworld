/**
 * Mirror of server/src/realtime/protocol.ts.
 * The server is the authority for hit points, the timer, and the log.
 */

export type CombatAction = 'attack' | 'skill' | 'defend';

export type Gender = 'male' | 'female';

export type DuelPet = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
};

export type DuelSkillView = {
  index: 0 | 1;
  name: string;
};

/** One hero or pet in the shared turn queue. `side` is relative to the viewer. */
export type DuelUnitView = {
  id: string;
  ownerId: string;
  name: string;
  kind: 'hero' | 'pet';
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  side: 'you' | 'opponent';
};

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
  /** Pets locked in during the 30-second squad countdown. */
  pets?: DuelPet[];
  ready: boolean;
};

export type BattleView = {
  roomId: string;
  round: number;
  /** Epoch milliseconds. The acting unit has until this moment. */
  deadline: number;
  status: 'active' | 'finished';
  winnerId: string | null;
  log: string[];
  you: FighterView;
  opponent: FighterView;
  /** Unit that must act now. */
  turnId: string;
  /** Living units from the current actor through the rest of the round, then those who already went. */
  queue: string[];
  units: DuelUnitView[];
  /** The two skill buttons for the viewer's side. */
  skills: DuelSkillView[];
  yourTurn: boolean;
};

export type QueueView = {
  state: 'idle' | 'queued';
  position: number;
};

/** Arrival slot in a five-person raid lobby. `index` 0 is the first player through the gate. */
export type RaidSlotView = {
  index: number;
  userId: string;
  username: string;
  name: string;
  ready: boolean;
  level: number;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
};

export type RaidLobbyView = {
  lobbyId: string;
  zoneId: string;
  deadline: number;
  youIndex: number;
  slots: (RaidSlotView | null)[];
};

export type RaidJoin = {
  zoneId: string;
  name: string;
  gender: Gender;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  level: number;
  attack: number;
  defense: number;
  maxHp: number;
};

export type RaidUnitView = {
  id: string;
  name: string;
  kind: 'hero' | 'monster' | 'boss';
  slot: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  side: 'party' | 'foe';
  ownerId: string | null;
  tint: string;
  baseAvatarId?: string;
  hairColor?: string;
  outfitColor?: string;
};

export type RaidRewardView = {
  exp: number;
  drops: { itemId: string; qty: number }[];
};

export type RaidBattleView = {
  roomId: string;
  round: number;
  deadline: number;
  status: 'active' | 'finished';
  victory: boolean;
  log: string[];
  turnId: string;
  queue: string[];
  units: RaidUnitView[];
  skills: DuelSkillView[];
  yourTurn: boolean;
  /** Present on a win. The same package for every fighter. No leader bonus. */
  rewards: RaidRewardView | null;
};

export type GoldenHourView = {
  active: boolean;
  windowId: string | null;
  endsAt: number | null;
  message: string | null;
};

export type SocialProvider = 'google' | 'apple' | 'facebook';

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  guest: boolean;
  providers: SocialProvider[];
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
