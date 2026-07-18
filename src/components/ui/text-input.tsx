import {
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextInputProps = Omit<RNTextInputProps, 'style'> & {
  style?: StyleProp<TextStyle>;
};

/**
 * Themed text input for auth forms and other text entry.
 *
 * Uses theme.backgroundElement for the fill, theme.border for the outline,
 * theme.text for input color, and theme.textSecondary for placeholder.
 */
export function TextInput({ style, placeholderTextColor, ...rest }: TextInputProps) {
  const theme = useTheme();

  return (
    <RNTextInput
      placeholderTextColor={placeholderTextColor ?? theme.textSecondary}
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          color: theme.text,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    fontSize: 16,
    alignSelf: 'stretch',
  },
});
