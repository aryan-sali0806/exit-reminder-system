import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getLists, getLatest, type LatestResult, type List } from '../../utils/api';

export default function DashboardScreen() {
  const [latest, setLatest] = useState<LatestResult | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // null = not yet loaded; any other value = last seen event_id
  const lastEventId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [l, ls] = await Promise.all([getLatest(), getLists()]);
      setLists(ls);
      setLatest(l); // always update display

      // Speak only when a NEW event arrives while the app is already open
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
      if (!status) setError('Waking up the server… retrying in 2 s');
      else if (status === 401) setError('Session expired — please log in again');
      else setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, []); // stable — no deps that change

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 2000);
    return () => clearInterval(id);
  }, [fetchData]);

  const activeLists = lists.filter((l) => l.active);

  return (
    <ScrollView
      style={s.bg}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#e94560" />}
    >
      {loading && !latest && <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />}
      {!!error && <Text style={s.err}>{error}</Text>}

      {/* Status card */}
      {latest ? (
        <View style={[s.card, { backgroundColor: latest.alert ? '#3d1a1a' : '#1a3d1a' }]}>
          <Text style={[s.statusIcon, { color: latest.alert ? '#e94560' : '#4caf50' }]}>
            {latest.alert ? '⚠' : '✓'}
          </Text>
          <Text style={[s.statusText, { color: latest.alert ? '#ff6b6b' : '#81c784' }]}>
            {latest.speech || 'Waiting for a scan at the doorway…'}
          </Text>
          {latest.missing.length > 0 && (
            <View style={s.missingBox}>
              {latest.missing.map((m) => (
                <Text key={m} style={s.missingItem}>• {m}</Text>
              ))}
            </View>
          )}
        </View>
      ) : (
        !loading && (
          <View style={[s.card, { backgroundColor: '#16213e' }]}>
            <Text style={[s.statusText, { color: '#888' }]}>No scans yet. Trigger the PIR sensor in Wokwi.</Text>
          </View>
        )
      )}

      {/* Active lists summary */}
      <Text style={s.sectionTitle}>Active Lists</Text>
      {activeLists.length === 0 ? (
        <Text style={s.muted}>No active lists — go to Lists and toggle one on</Text>
      ) : (
        activeLists.map((l) => (
          <View key={l.id} style={s.listChip}>
            <Text style={s.chipText}>{l.name}</Text>
            <Text style={s.chipCount}>{l.tag_ids.length} item{l.tag_ids.length !== 1 ? 's' : ''}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  statusIcon: { fontSize: 48, marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: '600', textAlign: 'center', lineHeight: 26 },
  missingBox: { marginTop: 12, alignSelf: 'flex-start' },
  missingItem: { color: '#ffcdd2', fontSize: 16, marginVertical: 2 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  muted: { color: '#888', fontSize: 14, marginBottom: 10 },
  listChip: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  chipText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  chipCount: { color: '#888', fontSize: 14 },
  err: { color: '#ff6b6b', textAlign: 'center', marginVertical: 12 },
});
