import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLists, getLatest, type LatestResult, type List } from '../../utils/api';

export default function DashboardScreen() {
  const [latest, setLatest] = useState<LatestResult | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const activeLists = lists.filter((l) => l.active);
  const isAlert = latest?.alert ?? false;

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
        <View style={s.emptySection}>
          <Ionicons name="albums-outline" size={28} color="#333" />
          <Text style={s.muted}>No active lists — go to Lists tab and toggle one on</Text>
        </View>
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

  emptyCard: { backgroundColor: '#161b22', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 24, gap: 10, borderWidth: 1, borderColor: '#21262d' },
  emptyTitle: { color: '#8b949e', fontSize: 16, fontWeight: '700' },
  emptyHint: { color: '#6e7681', fontSize: 13, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: '#e6edf3', fontSize: 16, fontWeight: '700' },
  emptySection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  muted: { color: '#6e7681', fontSize: 14, textAlign: 'center' },

  listCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#21262d' },
  listCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf50' },
  listName: { color: '#e6edf3', fontSize: 15, fontWeight: '600' },
  countBadge: { backgroundColor: '#e9456022', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#e9456055' },
  countText: { color: '#e94560', fontSize: 13, fontWeight: '700' },
});
