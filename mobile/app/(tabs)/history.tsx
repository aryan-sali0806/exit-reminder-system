import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getHistory, type Event } from '../../utils/api';

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function HistoryScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await getHistory());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  return (
    <View style={s.bg}>
      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#e94560" />}
          ListEmptyComponent={<Text style={s.muted}>No scans recorded yet</Text>}
          renderItem={({ item }) => (
            <View style={[s.card, { borderLeftColor: item.alert ? '#e94560' : '#4caf50' }]}>
              <Text style={s.ts}>{fmt(item.ts)}</Text>
              <Text style={[s.status, { color: item.alert ? '#ff6b6b' : '#81c784' }]}>
                {item.alert ? `Missing: ${item.missing.join(', ')}` : 'All clear'}
              </Text>
              {item.required.length > 0 && (
                <Text style={s.req}>Required: {item.required.join(', ')}</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1a1a2e' },
  card: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
  },
  ts: { color: '#888', fontSize: 12, marginBottom: 4 },
  status: { fontSize: 15, fontWeight: '600' },
  req: { color: '#aaa', fontSize: 13, marginTop: 4 },
  muted: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
