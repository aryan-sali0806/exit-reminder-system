import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getHistory, type Event } from '../../utils/api';

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { dateStyle: 'medium' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function HistoryScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await getHistory());
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, []);

  return (
    <View style={s.bg}>
      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
          ListHeaderComponent={
            events.length > 0 ? (
              <Text style={s.listHeader}>{events.length} scan{events.length !== 1 ? 's' : ''} recorded</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="time-outline" size={48} color="#333" />
              <Text style={s.emptyTitle}>No history yet</Text>
              <Text style={s.emptyHint}>Scans will appear here after the PIR triggers</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { date, time } = fmt(item.ts);
            return (
              <View style={[s.card, { borderLeftColor: item.alert ? '#e94560' : '#4caf50' }]}>
                <View style={s.cardTop}>
                  <View style={[s.statusBadge, { backgroundColor: item.alert ? '#2d0a12' : '#0a1a0d' }]}>
                    <Ionicons
                      name={item.alert ? 'warning-outline' : 'shield-checkmark-outline'}
                      size={12}
                      color={item.alert ? '#e94560' : '#4caf50'}
                    />
                    <Text style={[s.statusBadgeTxt, { color: item.alert ? '#e94560' : '#4caf50' }]}>
                      {item.alert ? 'ALERT' : 'CLEAR'}
                    </Text>
                  </View>
                  <View style={s.timeRow}>
                    <Text style={s.date}>{date}</Text>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.time}>{time}</Text>
                  </View>
                </View>

                {item.missing.length > 0 ? (
                  <View style={s.chipsRow}>
                    {item.missing.map((m) => (
                      <View key={m} style={s.missingChip}>
                        <Text style={s.missingChipTxt}>{m}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.clearText}>All required items carried</Text>
                )}

                {item.required.length > 0 && (
                  <Text style={s.required}>Required: {item.required.join(', ')}</Text>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },
  listHeader: { color: '#6e7681', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { color: '#8b949e', fontSize: 18, fontWeight: '700' },
  emptyHint: { color: '#6e7681', fontSize: 14, textAlign: 'center' },

  card: { backgroundColor: '#161b22', borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderWidth: 1, borderColor: '#21262d' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusBadgeTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { color: '#8b949e', fontSize: 12 },
  dot: { color: '#6e7681', fontSize: 12 },
  time: { color: '#8b949e', fontSize: 12, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  missingChip: { backgroundColor: '#2d0a12', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#e9456033' },
  missingChipTxt: { color: '#ff8a9b', fontSize: 12, fontWeight: '600' },

  clearText: { color: '#4caf50', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  required: { color: '#6e7681', fontSize: 12, marginTop: 4 },
});
