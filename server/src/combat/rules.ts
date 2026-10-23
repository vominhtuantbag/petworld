/**
 * Simultaneous round resolution.
 *
 * Each fighter picks one action. Both are applied together, so there is no
 * host advantage. To add a move (dodge as its own button, a heal, a region
 * bonus), extend `CombatAction` and the `strike` switch. Callers should not
 * invent damage on their own.
 */

export type CombatAction = 'attack' | 'skill' | 'defend';

export type Striker = {
  name: string;
  attack: number;
  defense: number;
};

export type StrikeResult = {
  damage: number;
  dodged: boolean;
  text: string;
};

const DODGE_CHANCE = 0.28;

export function strike(
  attacker: Striker,
  defender: Striker,
  action: CombatAction,
  defenderAction: CombatAction,
  rng: () => number = Math.random,
): StrikeResult {
  if (defenderAction === 'defend' && rng() < DODGE_CHANCE) {
    return {
      damage: 0,
      dodged: true,
      text: `${defender.name} né được đòn của ${attacker.name}.`,
    };
  }

  const piercedDefense = action === 'skill' ? Math.floor(defender.defense / 3) : Math.floor(defender.defense / 2);
  const power = action === 'skill' ? Math.round(attacker.attack * 1.65) : attacker.attack;
  let damage = Math.max(1, power - piercedDefense);
  if (defenderAction === 'defend') {
    damage = Math.max(1, Math.round(damage * 0.45));
  }

  const verb = action === 'skill' ? 'dùng kỹ năng vào' : 'tấn công';
  const guard = defenderAction === 'defend' ? ' Đòn bị chặn bớt.' : '';
  return {
    damage,
    dodged: false,
    text: `${attacker.name} ${verb} ${defender.name}, gây ${damage} sát thương.${guard}`,
  };
}

export function isCombatAction(value: unknown): value is CombatAction {
  return value === 'attack' || value === 'skill' || value === 'defend';
}
