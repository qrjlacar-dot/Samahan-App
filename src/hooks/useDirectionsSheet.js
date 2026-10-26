import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Keyboard, PanResponder } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_OFFSET = Math.max(0, SCREEN_HEIGHT - 180);

// Own sheet gestures and keyboard sizing without mixing them with route logic.
export function useDirectionsSheet({ initiallyCollapsed, onInteract }) {
  const initialY = initiallyCollapsed ? COLLAPSED_OFFSET : 0;
  const translateY = useRef(new Animated.Value(initialY)).current;
  const lastY = useRef(initialY);
  const dragStart = useRef(initialY);
  const [isExpanded, setIsExpanded] = useState(!initiallyCollapsed);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const snapTo = useCallback(
    (toValue) => {
      onInteract();
      setIsExpanded(toValue === 0);
      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    },
    [translateY, onInteract],
  );

  // Track animation progress so each drag starts at the visible sheet position.
  useEffect(() => {
    const listener = translateY.addListener(({ value }) => {
      lastY.current = value;
    });
    return () => translateY.removeListener(listener);
  }, [translateY]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        onInteract();
        translateY.stopAnimation();
        dragStart.current = lastY.current;
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(
          Math.max(0, Math.min(COLLAPSED_OFFSET, dragStart.current + gesture.dy)),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        const position = Math.max(0, Math.min(COLLAPSED_OFFSET, dragStart.current + gesture.dy));
        if (gesture.dy > 50 || gesture.vy > 0.3) snapTo(COLLAPSED_OFFSET);
        else if (gesture.dy < -50 || gesture.vy < -0.3) snapTo(0);
        else snapTo(position > COLLAPSED_OFFSET / 2 ? COLLAPSED_OFFSET : 0);
      },
      onPanResponderTerminate: () => snapTo(0),
    }),
  ).current;

  return {
    translateY,
    isExpanded,
    snapTo,
    panHandlers: panResponder.panHandlers,
    collapsedOffset: COLLAPSED_OFFSET,
    sheetHeight: Math.max(200, SCREEN_HEIGHT - 90 - keyboardHeight),
  };
}
