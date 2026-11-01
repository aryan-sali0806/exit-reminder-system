import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cancelSnooze, getLists, getLatest, snooze, type LatestResult, type List } from '../../utils/api';

export default function DashboardScreen() {
  const [latest, setLatest] = useState<LatestResult | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snoozing, setSnoozing] = useState(false);
  const lastEventId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [l, ls] = await Promise.all([getLatest(), getLists()]);
      setLists(ls);
      setLatest(l);
      if (l.event_id && l.event_id !== lastEventId.current) {
        const isFirstLoad = lastEventId.current === null;
        lastEventId.current = l.event_id;
        if (!isFirstLoad && l.speech) {
          Speech.stop();
          Speech.speak(l.speech, { language: 'en-US' });
        }
      } else if (lastEventId.current === null) {
        lastEventId.current = l.event_id ?? '';
      }
      setError('');
    } catch (e: any) {
      const status = e?.response?.status;
      if (!status) setError('Waking up server… retrying');
      else if (status === 401) setError('Session expired — log in again');
      else setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, [fetchData]);

  async function handleSnooze(minutes: number) {
    setSnoozing(true);
    try { await snooze(minutes); await fetchData(); } finally { setSnoozing(false); }
  }

  async function handleCancelSnooze() {
    setSnoozing(true);
    try { await cancelSnooze(); await fetchData(); } finally { setSnoozing(false); }
  }

  function fmtSnoozeTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const activeLists = lists.filter((l) => l.active);
  const isAlert = latest?.alert ?? false;
  const isSnoozed = !!latest?.snoozed_until;

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#e94560" />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSub}>Smart Exit Reminder</Text>
          <Text style={s.headerTitle}>Dashboard</Text>
        </View>
        <View style={s.liveDot}>
          <View style={[s.dot, { backgroundColor: error ? '#888' : '#4caf50' }]} />
          <Text style={s.liveText}>{error ? 'offline' : 'live'}</Text>
        </View>
      </View>

      {!!error && (
        <View style={s.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#ffb74d" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {/* Status card */}
      {loading && !latest ? (
        <View style={s.loadingCard}>
          <ActivityIndicator color="#e94560" size="large" />
          <Text style={s.loadingText}>Connecting to server…</Text>
        </View>
      ) : latest ? (
        <View style={[s.statusCard, isAlert ? s.statusCardAlert : s.statusCardClear]}>
          <View style={[s.statusIconCircle, { backgroundColor: isAlert ? '#e9456022' : '#4caf5022' }]}>
            <Ionicons
              name={isAlert ? 'warning' : 'shield-checkmark'}
              size={44}
              color={isAlert ? '#e94560' : '#4caf50'}
            />
          </View>
          <Text style={[s.statusLabel, { color: isAlert ? '#e94560' : '#4caf50' }]}>
            {isAlert ? 'ALERT' : 'ALL CLEAR'}
          </Text>
          <Text style={s.statusSpeech}>
            {latest.speech || 'Waiting for a scan at the doorway…'}
          </Text>
          {latest.missing.length > 0 && (
            <View style={s.chipsRow}>
              {latest.missing.map((m) => (
                <View key={m} style={s.missingChip}>
                  <Ionicons name="close-circle" size={14} color="#e94560" />
                  <Text style={s.missingChipText}>{m}</Text>
                </View>
              ))}
            </View>
          )}
          {latest.ts && (
            <Text style={s.timestamp}>
              Last scan: {new Date(latest.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}

          {/* Snooze indicator */}
          {isSnoozed && (
            <View style={s.snoozeBanner}>
              <Ionicons name="notifications-off-outline" size={15} color="#ffb74d" />
              <Text style={s.snoozeBannerTxt}>Snoozed until {fmtSnoozeTime(latest.snoozed_until!)}</Text>
              <Pressable onPress={handleCancelSnooze} disabled={snoozing} style={s.snoozeCancelBtn}>
                <Text style={s.snoozeCancelTxt}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* Snooze buttons — shown when alert fired and not already snoozed */}
          {isAlert && !isSnoozed && (
            <View style={s.snoozeRow}>
              <Text style={s.snoozeLabel}>Snooze alert:</Text>
              {([5, 30, 120] as const).map((m) => (
                <Pressable
                  key={m}
                  style={s.snoozeBtn}
                  onPress={() => handleSnooze(m)}
                  disabled={snoozing}
                >
                  <Text style={s.snoozeBtnTxt}>{m < 60 ? `${m}m` : `${m / 60}h`}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={s.emptyCard}>
          <Ionicons name="scan-outline" size={48} color="#333" />
          <Text style={s.emptyTitle}>No scans yet</Text>
          <Text style={s.emptyHint}>Trigger the PIR sensor in Wokwi to begin</Text>
        </View>
      )}

      {/* Active lists */}
      <View style={s.sectionHeader}>
        <Ionicons name="list" size={18} color="#e94560" />
        <Text style={s.sectionTitle}>Active Lists</Text>
      </View>

      {activeLists.length === 0 ? (
        <Pressable style={s.emptySection} onPress={() => router.push('/(tabs)/lists')}>
          <Ionicons name="albums-outline" size={32} color="#e94560" />
          <Text style={s.emptySectionTitle}>No active lists</Text>
          <Text style={s.muted}>Tap here to go to Lists and toggle one on</Text>
          <View style={s.ctaBtn}>
            <Text style={s.ctaBtnTxt}>Go to Lists →</Text>
          </View>
        </Pressable>
      ) : (
        activeLists.map((l) => (
          <View key={l.id} style={s.listCard}>
            <View style={s.listCardLeft}>
              <View style={s.listDot} />
              <Text style={s.listName}>{l.name}</Text>
            </View>
            <View style={s.countBadge}>
              <Text style={s.countText}>{l.tag_ids.length}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },
  content: { padding: 20, paddingBottom: 48 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerSub: { color: '#6e7681', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { color: '#e6edf3', fontSize: 26, fontWeight: '800', marginTop: 2 },
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#161b22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { color: '#8b949e', fontSize: 12 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2d1f0a', borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#4d3010' },
  errorText: { color: '#ffb74d', fontSize: 13, flex: 1 },

  loadingCard: { backgroundColor: '#161b22', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 24, gap: 14 },
  loadingText: { color: '#8b949e', fontSize: 14 },

  statusCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1 },
  statusCardAlert: { backgroundColor: '#1a0a0f', borderColor: '#e9456044' },
  statusCardClear: { backgroundColor: '#0a1a0d', borderColor: '#4caf5044' },
  statusIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statusLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  statusSpeech: { color: '#e6edf3', fontSize: 17, fontWeight: '600', textAlign: 'center', lineHeight: 26, marginBottom: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  missingChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2d0a12', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#e9456055' },
  missingChipText: { color: '#ff8a9b', fontSize: 13, fontWeight: '600' },
  timestamp: { color: '#6e7681', fontSize: 12, marginTop: 4 },

  snoozeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: '#2d1f0a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#4d3010',
  },
  snoozeBannerTxt: { color: '#ffb74d', fontSize: 13, flex: 1 },
  snoozeCancelBtn: { backgroundColor: '#4d3010', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  snoozeCancelTxt: { color: '#ffb74d', fontSize: 12, fontWeight: '700' },

  snoozeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  snoozeLabel: { color: '#6e7681', fontSize: 12 },
  snoozeBtn: {
    backgroundColor: '#21262d', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: '#30363d',
  },
  snoozeBtnTxt: { color: '#e6edf3', fontSize: 13, fontWeight: '700' },

  emptyCard: { backgroundColor: '#161b22', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 24, gap: 10, borderWidth: 1, borderColor: '#21262d' },
  emptyTitle: { color: '#8b949e', fontSize: 16, fontWeight: '700' },
  emptyHint: { color: '#6e7681', fontSize: 13, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: '#e6edf3', fontSize: 16, fontWeight: '700' },
  emptySection: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    backgroundColor: '#161b22', borderRadius: 16, borderWidth: 1,
    borderColor: '#21262d', borderStyle: 'dashed',
  },
  emptySectionTitle: { color: '#e6edf3', fontSize: 15, fontWeight: '700' },
  muted: { color: '#6e7681', fontSize: 14, textAlign: 'center', paddingHorizontal: 16 },
  ctaBtn: {
    marginTop: 8, backgroundColor: '#e9456015', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: '#e9456040',
  },
  ctaBtnTxt: { color: '#e94560', fontWeight: '700', fontSize: 14 },

  listCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#21262d' },
  listCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50' },
  listName: { color: '#e6edf3', fontSize: 15, fontWeight: '600' },
  countBadge: { backgroundColor: '#e9456022', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#e9456055' },
  countText: { color: '#e94560', fontSize: 13, fontWeight: '700' },
});
