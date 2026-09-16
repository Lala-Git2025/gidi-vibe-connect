import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * A single breathing dot that means one thing: what's beside it is current.
 *
 * This is deliberately the only looping animation on the screens that use it.
 * Home used to run about thirteen pulses at once, most of them on things that
 * never changed, and the effect was that nothing read as live. Render this
 * only when the data genuinely is — the traffic band mounts it solely when
 * the newest report falls inside the freshness window.
 */
export const LiveDot = ({ color, size = 6 }: { color: string; size?: number }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: pulse }}
    />
  );
};
