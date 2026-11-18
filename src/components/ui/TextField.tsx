import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius, Spacing } from '@/theme';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  clearable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<React.ElementRef<typeof TextInput>, TextFieldProps>(function TextField(
  {
    label,
    error,
    leadingIcon,
    clearable = false,
    value,
    onChangeText,
    containerStyle,
    style,
    ...props
  },
  ref
) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = Boolean(value && value.length > 0);

  const handleClear = () => {
    onChangeText?.('');
  };

  let borderColor = isDark ? colors.border : colors.border;
  if (error) {
    borderColor = colors.danger;
  } else if (isFocused) {
    borderColor = colors.accent;
  }

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <ThemedText variant="caption" secondary style={styles.label}>
          {label}
        </ThemedText>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: isFocused || error ? 1.5 : 1,
          },
        ]}
      >
        {leadingIcon && <View style={styles.leadingIcon}>{leadingIcon}</View>}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
            },
            style,
          ]}
          {...props}
        />

        {clearable && hasValue && (
          <Pressable onPress={handleClear} hitSlop={10} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {error && (
        <ThemedText
          variant="micro"
          style={[styles.errorText, { color: colors.danger }]}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    minHeight: 46,
    paddingHorizontal: Spacing.md,
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 2,
    marginLeft: Spacing.xs,
  },
  errorText: {
    marginTop: 4,
    fontWeight: '500',
  },
});
