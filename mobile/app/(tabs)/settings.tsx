import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMe, logout, regenerateDeviceKey } from '../../utils/api';

export default function SettingsScreen() {
  const [user, setUser] = useState<{ email: string; device_key: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMe().then(setUser).finally(() => setLoading(false));
  }, []);

  async function handleCopy() {
    if (user?.device_key) {
      await Clipboard.setStringAsync(user.device_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleRegenerate() {
    Alert.alert(
      'Regenerate device key?',
      'Your current key will stop working immediately. You must update DEVICE_KEY in the Wokwi sketch.',
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

  if (loading) {
    return (
      <View style={[s.bg, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#e94560" size="large" />
      </View>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <ScrollView style={s.bg} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.email}>{user?.email}</Text>
        <Text style={s.emailLabel}>Logged in account</Text>
      </View>

      {/* Device Key */}
      <Text style={s.sectionLabel}>Device Key</Text>
      <View style={s.section}>
        <View style={s.sectionRow}>
          <Ionicons name="key-outline" size={18} color="#8b949e" />
          <Text style={s.sectionRowLabel}>ESP32 Auth Key</Text>
        </View>
        <View style={s.keyBox}>
          <Text style={s.keyText} numberOfLines={1}>{user?.device_key ?? '—'}</Text>
        </View>
        <Text style={s.hint}>Paste this into <Text style={s.mono}>DEVICE_KEY</Text> in your Wokwi sketch.</Text>
        <Pressable style={[s.copyBtn, copied && s.copyBtnSuccess]} onPress={handleCopy}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#4caf50' : '#e94560'} />
          <Text style={[s.copyTxt, { color: copied ? '#4caf50' : '#e94560' }]}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Text>
        </Pressable>
      </View>

      {/* Danger zone */}
      <Text style={s.sectionLabel}>Danger Zone</Text>
      <View style={s.section}>
        <Pressable style={s.dangerRow} onPress={handleRegenerate} disabled={regen}>
          <View style={s.dangerIcon}>
            {regen
              ? <ActivityIndicator color="#e94560" size="small" />
              : <Ionicons name="refresh-outline" size={18} color="#e94560" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.dangerTitle}>Regenerate device key</Text>
            <Text style={s.dangerHint}>Current key stops working immediately</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6e7681" />
        </Pressable>

        <View style={s.divider} />

        <Pressable style={s.dangerRow} onPress={handleLogout}>
          <View style={[s.dangerIcon, { backgroundColor: '#21262d' }]}>
            <Ionicons name="log-out-outline" size={18} color="#8b949e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.dangerTitle, { color: '#e6edf3' }]}>Log out</Text>
            <Text style={s.dangerHint}>Sign out of this account</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6e7681" />
        </Pressable>
      </View>

      <Text style={s.footer}>Smart Exit Reminder · Stage 2 · PCCOE Pune</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e9456022', borderWidth: 2, borderColor: '#e94560', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#e94560', fontSize: 24, fontWeight: '800' },
  email: { color: '#e6edf3', fontSize: 16, fontWeight: '600' },
  emailLabel: { color: '#6e7681', fontSize: 13, marginTop: 4 },

  sectionLabel: { color: '#6e7681', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  section: { backgroundColor: '#161b22', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#21262d' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionRowLabel: { color: '#8b949e', fontSize: 13, fontWeight: '600' },

  keyBox: { backgroundColor: '#0d1117', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#30363d' },
  keyText: { color: '#e94560', fontSize: 14, fontFamily: 'monospace', letterSpacing: 1 },
  hint: { color: '#6e7681', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  mono: { fontFamily: 'monospace', color: '#8b949e' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e9456055', backgroundColor: '#e9456011' },
  copyBtnSuccess: { borderColor: '#4caf5055', backgroundColor: '#4caf5011' },
  copyTxt: { fontSize: 14, fontWeight: '700' },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  dangerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a0a0f', justifyContent: 'center', alignItems: 'center' },
  dangerTitle: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  dangerHint: { color: '#6e7681', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#21262d', marginVertical: 12 },

  footer: { color: '#6e7681', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
