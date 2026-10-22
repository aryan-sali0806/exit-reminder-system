import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMe, logout, regenerateDeviceKey } from '../../utils/api';

export default function SettingsScreen() {
  const [user, setUser] = useState<{ email: string; device_key: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);

  useEffect(() => {
    getMe().then(setUser).finally(() => setLoading(false));
  }, []);

  async function handleRegenerate() {
    Alert.alert(
      'Regenerate device key?',
      'Your current key will stop working immediately. Update DEVICE_KEY in the Wokwi sketch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate', style: 'destructive', onPress: async () => {
            setRegen(true);
            try {
              const { device_key } = await regenerateDeviceKey();
              setUser((u) => u ? { ...u, device_key } : u);
            } finally {
              setRegen(false);
            }
          },
        },
      ],
    );
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  if (loading) return <ActivityIndicator color="#e94560" style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={s.sectionTitle}>Account</Text>
      <View style={s.infoRow}>
        <Text style={s.label}>Email</Text>
        <Text style={s.value}>{user?.email}</Text>
      </View>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>Device Key</Text>
      <Text style={s.hint}>
        Copy this into the <Text style={{ fontFamily: 'monospace' }}>DEVICE_KEY</Text> constant in
        your Wokwi sketch. It identifies your ESP32 to the backend.
      </Text>
      <Pressable
        style={s.keyBox}
        onPress={async () => {
          if (user?.device_key) {
            await Clipboard.setStringAsync(user.device_key);
            Alert.alert('Copied', 'Device key copied to clipboard');
          }
        }}
      >
        <Text style={s.keyText}>{user?.device_key ?? '—'}</Text>
        <Text style={s.tapHint}>Tap to copy</Text>
      </Pressable>

      <Pressable style={s.dangerBtn} onPress={handleRegenerate} disabled={regen}>
        {regen
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.dangerTxt}>Regenerate device key</Text>}
      </Pressable>
      <Text style={s.hint}>After regenerating, update the Wokwi sketch and redeploy.</Text>

      <Pressable style={[s.dangerBtn, { marginTop: 28, backgroundColor: '#333' }]} onPress={handleLogout}>
        <Text style={s.dangerTxt}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1a1a2e' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#16213e', padding: 14, borderRadius: 10 },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#fff', fontSize: 14 },
  hint: { color: '#888', fontSize: 13, marginBottom: 10, lineHeight: 18 },
  keyBox: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 16, marginBottom: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#0f3460',
  },
  keyText: { color: '#e94560', fontSize: 15, fontFamily: 'monospace', letterSpacing: 1 },
  tapHint: { color: '#888', fontSize: 12, marginTop: 6 },
  dangerBtn: { backgroundColor: '#e94560', padding: 15, borderRadius: 10, alignItems: 'center' },
  dangerTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
