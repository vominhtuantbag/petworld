import { Image, Pressable, Text, View } from 'react-native';

import type { PortalLayout } from '../../world/portals';

const GATE = require('../../../assets/images/gate111.png');

type Props = {
  pose: PortalLayout;
  label: string;
  onPress: () => void;
};

/** Upright transition. The arch art is drawn facing the path, with no compass turn. */
export function PortalGate({ pose, label, onPress }: Props) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <Image
        source={GATE}
        resizeMode="contain"
        pointerEvents="none"
        accessibilityLabel={label}
        style={{
          position: 'absolute',
          left: pose.left,
          top: pose.top,
          width: pose.imgW,
          height: pose.imgH,
        }}
      />
      <Text
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: pose.trigger.x - 24,
          top: pose.trigger.y - 16,
          width: pose.trigger.w + 48,
          textAlign: 'center',
          color: '#f6f1e7',
          fontSize: 11,
          fontWeight: '700',
          textShadowColor: 'rgba(0,0,0,0.8)',
          textShadowRadius: 3,
          textShadowOffset: { width: 0, height: 1 },
        }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={`sensor-${pose.id}`}
        onPress={onPress}
        style={{
          position: 'absolute',
          left: pose.trigger.x,
          top: pose.trigger.y,
          width: pose.trigger.w,
          height: pose.trigger.h,
        }}
      />
    </View>
  );
}
