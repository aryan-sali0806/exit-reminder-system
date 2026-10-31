import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login } from '../../utils/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Login failed';
      if (msg === 'waking') setError('Server is waking up, please retry in a moment…');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Ionicons name="exit-outline" size={40} color="#e94560" />
          </View>
          <Text style={s.appName}>Exit Reminder</Text>
          <Text style={s.tagline}>Never forget what matters</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sign in</Text>

          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#ff8a9b" />
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor="#6e7681"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Password</Text>
          <View style={s.passWrap}>
            <TextInput
              style={s.passInput}
              placeholder="••••••••"
              placeholderTextColor="#6e7681"
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} style={s.eyeBtn} hitSlop={8}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6e7681" />
            </Pressable>
          </View>

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnTxt}>Sign in</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(auth)/signup')} style={s.switchWrap} hitSlop={8}>
          <Text style={s.switchTxt}>Don't have an account? </Text>
          <Text style={s.switchLink}>Sign up</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#e9456015', borderWidth: 1.5, borderColor: '#e9456040',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  appName: { color: '#e6edf3', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: '#6e7681', fontSize: 14, marginTop: 4 },

  card: {
    backgroundColor: '#161b22', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#21262d', marginBottom: 20,
  },
  cardTitle: { color: '#e6edf3', fontSize: 22, fontWeight: '800', marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2d0a12', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#e9456033',
  },
  errorTxt: { color: '#ff8a9b', fontSize: 13, flex: 1 },

  label: { color: '#8b949e', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: '#0d1117', color: '#e6edf3', padding: 16,
    borderRadius: 12, marginBottom: 16, fontSize: 15,
    borderWidth: 1, borderColor: '#30363d',
  },
  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d1117', borderRadius: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#30363d',
  },
  passInput: { flex: 1, color: '#e6edf3', padding: 16, fontSize: 15 },
  eyeBtn: { padding: 14 },

  btn: {
    backgroundColor: '#e94560', padding: 16, borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  switchWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  switchTxt: { color: '#6e7681', fontSize: 14 },
  switchLink: { color: '#e94560', fontSize: 14, fontWeight: '700' },
});
