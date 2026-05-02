import * as React from "react";
import { Keyboard, Platform } from "react-native";

/** Keyboard frame height so ScrollView can add enough bottom padding to scroll past the last field. */
export function useKeyboardBottomInset() {
  const [height, setHeight] = React.useState(0);
  React.useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
