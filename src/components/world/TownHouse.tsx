import { StyleSheet, Text, View } from 'react-native';

import type { Rect } from '../../world/types';

type Props = {
  house: Rect;
};

/**
 * Cozy shop front: cream walls, a colored roof, and a striped awning.
 * Matches the garden-town stalls rather than a flat fortress block.
 * The door sensor sits in front of this view and stays tappable.
 */
export function TownHouse({ house }: Props) {
  const roof = house.roof ?? '#e07a2f';
  const awning = house.awning ?? '#f2c14e';
  const roofH = Math.round(house.h * 0.38);

  return (
    <View pointerEvents="none" style={[styles.lot, { left: house.x, top: house.y, width: house.w, height: house.h }]}>
      <View style={[styles.roof, { height: roofH, backgroundColor: roof }]}>
        <View style={styles.chimney} />
      </View>
      <View style={[styles.wall, { backgroundColor: house.fill ?? '#fff6ee' }]}>
        <View style={styles.windows}>
          <View style={[styles.window, { backgroundColor: awning }]} />
          <View style={[styles.window, { backgroundColor: awning }]} />
        </View>
        <View style={styles.door} />
      </View>
      <View style={[styles.awning, { backgroundColor: awning, top: roofH - 8 }]}>
        <View style={styles.stripe} />
        <View style={[styles.stripe, styles.stripeRight]} />
      </View>
      <View style={styles.flowers}>
        <View style={[styles.flower, { backgroundColor: '#f27aa0' }]} />
        <View style={[styles.flower, { backgroundColor: '#f2d34a' }]} />
        <View style={[styles.flower, { backgroundColor: '#f27aa0' }]} />
      </View>
      {house.label ? <Text style={styles.label}>{house.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lot: { position: 'absolute' },
  roof: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'flex-end',
  },
  chimney: {
    width: 16,
    height: 22,
    marginTop: -8,
    marginRight: 22,
    borderRadius: 3,
    backgroundColor: '#f4efe4',
  },
  wall: {
    flex: 1,
    marginTop: -6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 18,
    borderWidth: 2,
    borderColor: 'rgba(120, 72, 36, 0.18)',
  },
  windows: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  window: { width: 22, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
  door: { width: 22, height: 28, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#8a5a32' },
  awning: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', top: 0, bottom: 0, width: 10, left: '30%', backgroundColor: 'rgba(255,255,255,0.45)' },
  stripeRight: { left: '62%' },
  flowers: { position: 'absolute', left: 8, bottom: 4, flexDirection: 'row', gap: 4 },
  flower: { width: 8, height: 8, borderRadius: 4 },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    textAlign: 'center',
    color: '#4a3424',
    fontSize: 12,
    fontWeight: '800',
  },
});
