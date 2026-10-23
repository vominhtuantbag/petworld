import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlowButton } from '../components/GlowButton';
import { ApiError } from '../net/api';
import { useAuth } from '../state/AuthContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

/**
 * Landscape sign-in. Registration and login share one card so the form
 * stays reachable on a short phone height.
 */
export function AuthScreen() {
  const { s, font, wide } = useLayout();
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    Keyboard.dismiss();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        await auth.register({ username: username.trim(), email: email.trim(), password });
      } else {
        await auth.login({ email: email.trim(), password });
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Không đăng nhập được.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.row, { flexDirection: wide ? 'row' : 'column', padding: s(16), gap: s(16) }]}>
        <View style={styles.brand}>
          <Text style={[styles.kicker, { fontSize: font(12) }]}>GAME THƯ GIÃN</Text>
          <Text style={[styles.title, { fontSize: font(32) }]}>Đăng nhập để vào sân đấu</Text>
          <Text style={[styles.copy, { fontSize: font(14) }]}>
            Tài khoản giữ nhân vật, vùng xuất phát, và thành tích PvP. Mật khẩu được băm trên máy chủ.
          </Text>
        </View>
        <View style={[styles.card, { borderRadius: s(18), padding: s(16), gap: s(10), maxWidth: wide ? s(420) : undefined }]}>
          <View style={styles.modes}>
            <ModeChip label="Đăng nhập" active={mode === 'login'} onPress={() => setMode('login')} />
            <ModeChip label="Đăng ký" active={mode === 'register'} onPress={() => setMode('register')} />
          </View>
          {mode === 'register' ? (
            <Field label="Tên đăng nhập" value={username} onChangeText={setUsername} testID="auth-username" />
          ) : null}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" testID="auth-email" />
          <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry testID="auth-password" />
          {error ? <Text style={[styles.error, { fontSize: font(13) }]}>{error}</Text> : null}
          <GlowButton
            testID="auth-submit"
            label={busy ? 'Đang xử lý...' : mode === 'register' ? 'Tạo tài khoản' : 'Vào game'}
            enabled={!busy && email.trim().length > 0 && password.length > 0 && (mode === 'login' || username.trim().length >= 3)}
            onPress={() => {
              void submit();
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { font } = useLayout();
  return (
    <Text
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, { fontSize: font(14) }, active && styles.chipActive]}
    >
      {label}
    </Text>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  testID: string;
}) {
  const { s, font } = useLayout();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.fieldLabel, { fontSize: font(12) }]}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={theme.dim}
        style={[styles.input, { height: s(44), borderRadius: s(12), fontSize: font(15), paddingHorizontal: s(12) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  row: {
    flex: 1,
    alignItems: 'center',
  },
  brand: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  kicker: {
    color: theme.gold,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: theme.ink,
    fontWeight: '800',
  },
  copy: {
    color: theme.muted,
    maxWidth: 460,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.lineSoft,
    justifyContent: 'center',
  },
  modes: {
    flexDirection: 'row',
    gap: 16,
  },
  chip: {
    color: theme.dim,
    fontWeight: '700',
    paddingBottom: 4,
  },
  chipActive: {
    color: theme.gold,
    borderBottomWidth: 2,
    borderBottomColor: theme.gold,
  },
  fieldLabel: {
    color: theme.muted,
    fontWeight: '600',
  },
  input: {
    color: theme.ink,
    backgroundColor: theme.bgDeep,
    borderWidth: 1,
    borderColor: theme.lineSoft,
  },
  error: {
    color: '#e7a3a3',
  },
});
