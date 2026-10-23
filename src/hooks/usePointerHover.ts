import { useState } from 'react';

/**
 * Web and desktop pointer hover. Touch devices simply never fire these,
 * so the same Pressable stays correct on Android and iOS.
 */
export function usePointerHover() {
  const [hovered, setHovered] = useState(false);

  return {
    hovered,
    hoverHandlers: {
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
    },
  };
}
