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
} from 'react-native';
import { signup } from '../../utils/api';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup() {
    if (!email || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signup(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.title}>Exit Reminder</Text>
      <Text style={s.sub}>Create an account</Text>

      {!!error && <Text style={s.err}>{error}</Text>}

      <TextInput
        style={s.input} placeholder="Email" placeholderTextColor="#888"
        autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
      />
      <TextInput
        style={s.input} placeholder="Password (min 8 chars)" placeholderTextColor="#888"
        secureTextEntry value={password} onChangeText={setPassword}
      />

      <Pressable style={s.btn} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Create account</Text>}
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/login')}>
        <Text style={s.link}>Already have an account? Sign in</Text>
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
  btn: { backgroundColor: '#e94560', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#e94560', textAlign: 'center', marginTop: 20, fontSize: 15 },
  err: { color: '#ff6b6b', textAlign: 'center', marginBottom: 12, fontSize: 14 },
});
