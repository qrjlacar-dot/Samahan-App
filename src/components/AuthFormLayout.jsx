import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { scale } from "../constants/scale";
import { styles } from "../styles/auth-form.styles";

export function AuthFormLayout({ children, footer }) {
  const scroll = useRef(null);
  const viewport = useRef(null);
  const keyboardTop = useRef(null);
  const editing = useRef(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(false);

  const updateKeyboardInset = () => {
    const top = keyboardTop.current;
    if (!Number.isFinite(top)) return;
    viewport.current?.measureInWindow?.((_x, y, _width, height) => {
      if (keyboardTop.current !== top) return;
      // Add only the overlap that the host did not already remove by resizing.
      setKeyboardInset(Math.max(0, y + height - top) + scale(24));
    });
  };

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) => {
      editing.current = true;
      setScrollEnabled(true);
      keyboardTop.current = event?.endCoordinates?.screenY ?? null;
      updateKeyboardInset();
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      editing.current = false;
      keyboardTop.current = null;
      setKeyboardInset(0);
      scroll.current?.scrollTo({ y: 0, animated: false });
      setScrollEnabled(false);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const onInputFocus = () => {
    editing.current = true;
    setScrollEnabled(true);
  };
  const compact = viewportHeight > 0 && viewportHeight < scale(700);
  // Both forms use the same resting size. Leave room for the legal footer;
  // keep this based on the full viewport when the keyboard opens.
  const cardHeight = Math.max(
    scale(640),
    Math.min(scale(700), viewportHeight - scale(120)),
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        onLayout={({ nativeEvent }) => {
          // Android resizes the window for the keyboard. Keep the original card
          // height instead of recomputing a smaller card while the user types.
          if (!editing.current && nativeEvent.layout.height > 0)
            setViewportHeight(nativeEvent.layout.height);
          updateKeyboardInset();
        }}
      >
        <View ref={viewport} style={styles.keyboard} onLayout={updateKeyboardInset}>
          <ScrollView
            ref={scroll}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardInset }]}
            scrollEnabled={scrollEnabled}
            bounces={scrollEnabled}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.page, viewportHeight > 0 && { minHeight: viewportHeight }]}>
              <View style={[styles.card, { minHeight: cardHeight }]}>
                {children({ onInputFocus, compact })}
              </View>
              <View style={styles.footer}>{footer}</View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
