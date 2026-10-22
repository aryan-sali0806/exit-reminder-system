import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login } from '../../utils/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Enter email and password'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? 'Login failed';
      if (msg === 'waking') setError('Server is waking up, please retry…');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.title}>Exit Reminder</Text>
      <Text style={s.sub}>Sign in to your account</Text>

      {!!error && <Text style={s.err}>{error}</Text>}

      <TextInput
        style={s.input} placeholder="Email" placeholderTextColor="#888"
        autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
      />
      <TextInput
        style={s.input} placeholder="Password" placeholderTextColor="#888"
        secureTextEntry value={password} onChangeText={setPassword}
      />

      <Pressable style={s.btn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Sign in</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/signup')}>
        <Text style={s.link}>No account? Sign up</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#e94560', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 15, color: '#aaa', textAlign: 'center', marginBottom: 28 },
  input: {
    backgroundColor: '#16213e', color: '#fff', padding: 14, borderRadius: 10,
    marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#0f3460',
  },
  btn: {
    backgroundColor: '#e94560', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 6,
  },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#e94560', textAlign: 'center', marginTop: 20, fontSize: 15 },
  err: { color: '#ff6b6b', textAlign: 'center', marginBottom: 12, fontSize: 14 },
});
