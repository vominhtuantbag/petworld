import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCharacter } from '../../data/characters';
import type { RemotePlayer as RemotePlayerState } from '../../state/useMultiplayer';
import { CharacterAvatar } from '../CharacterAvatar';
import { portraitScaleX } from './facing';

const DRAW_H = 98;

/** Another account on this map. The feet sit on the same line as the local hero. */
export function RemotePlayer({ player }: { player: RemotePlayerState }) {
  const [hot, setHot] = useState(false);
  const character = getCharacter(player.baseCharacterId);
  const drawW = Math.round(DRAW_H / 1.22);
  const face = portraitScaleX(player.facing, character?.professionId, character?.gender);
  const ratio = player.maxHp > 0 ? Math.max(0, Math.min(1, player.hp / player.maxHp)) : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Người chơi ${player.username}`}
      testID={`remote-${player.userId}`}
      onPress={() => setHot((value) => !value)}
      style={[styles.mark, { left: player.x - drawW / 2, top: player.y + 28 - DRAW_H, width: drawW, height: DRAW_H }]}
    >
      {player.speech ? (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.bubbleText} numberOfLines={2}>{player.speech}</Text>
        </View>
      ) : null}
      <View style={styles.plate} pointerEvents="none">
        <Text style={[styles.name, hot && styles.nameHot]} numberOfLines={1}>{player.username}</Text>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, { width: 48 * ratio }]} />
        </View>
      </View>
      <View style={{ transform: [{ scaleX: face }] }}>
        {character ? (
          <CharacterAvatar character={character} hairColor={player.hairColor} outfitColor={player.outfitColor} size={80} />
        ) : (
          <View style={styles.fallback} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute', alignItems: 'center' },
  plate: { position: 'absolute', top: -28, width: 88, alignItems: 'center' },
  name: {
    color: '#f6f1e7',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nameHot: { color: '#e4c27a' },
  hpTrack: { marginTop: 2, width: 48, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.55)', overflow: 'hidden' },
  hpFill: { height: 4, backgroundColor: '#3dbe6e', borderRadius: 2 },
  bubble: {
    position: 'absolute',
    top: -62,
    width: 120,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(246,241,231,0.94)',
  },
  bubbleText: { color: '#1b322b', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  fallback: { width: 36, height: 48, borderRadius: 18, backgroundColor: '#2f6bff' },
});
