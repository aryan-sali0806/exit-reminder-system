import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getAnalytics, type Analytics } from '../../utils/api';

const BAR_COLORS = ['#e94560', '#e05575', '#c45e7a', '#a8677f', '#8b7085'];
const BAR_MAX_H = 80;

export default function AnalyticsScreen() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getAnalytics());
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

  const maxCount = data?.items?.[0]?.count ?? 1;
  const maxExits = data ? Math.max(...data.daily.map((d) => d.exits), 1) : 1;

  function dayLabel(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });
  }

  return (
    <View style={s.bg}>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageHeaderSub}>Smart Exit Reminder</Text>
          <Text style={s.pageHeaderTitle}>Analytics</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 60 }} size="large" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
        >
          {/* Summary cards */}
          {data && (
            <View style={s.summaryRow}>
              <View style={s.summaryCard}>
                <Ionicons name="scan-outline" size={20} color="#58a6ff" />
                <Text style={s.summaryValue}>{data.total_scans}</Text>
                <Text style={s.summaryLabel}>Total Exits</Text>
              </View>
              <View style={s.summaryCard}>
                <Ionicons name="warning-outline" size={20} color="#e94560" />
                <Text style={[s.summaryValue, { color: '#e94560' }]}>{data.total_alerts}</Text>
                <Text style={s.summaryLabel}>Alerts Fired</Text>
              </View>
              <View style={s.summaryCard}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#4caf50" />
                <Text style={[s.summaryValue, { color: '#4caf50' }]}>
                  {data.total_scans > 0
                    ? Math.round(((data.total_scans - data.total_alerts) / data.total_scans) * 100)
                    : 0}%
                </Text>
                <Text style={s.summaryLabel}>Clear Rate</Text>
              </View>
            </View>
          )}

          {/* Daily activity chart */}
          {data && (
            <View style={[s.section, { marginBottom: 16 }]}>
              <Text style={s.sectionTitle}>Last 7 Days</Text>
              <Text style={s.sectionSub}>Exits per day — red portion triggered an alert</Text>
              <View style={s.dailyChart}>
                {data.daily.map((day) => {
                  const totalH = (day.exits / maxExits) * BAR_MAX_H;
                  const alertH = day.exits > 0 ? (day.alerts / day.exits) * totalH : 0;
                  const clearH = totalH - alertH;
                  return (
                    <View key={day.date} style={s.dailyCol}>
                      <View style={s.dailyBarWrap}>
                        {day.exits === 0 ? (
                          <View style={s.dailyEmpty} />
                        ) : (
                          <View style={{ width: 22, height: totalH, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' }}>
                            <View style={{ width: '100%', height: clearH, backgroundColor: '#4caf50' }} />
                            <View style={{ width: '100%', height: alertH, backgroundColor: '#e94560' }} />
                          </View>
                        )}
                      </View>
                      <Text style={s.dailyCount}>{day.exits > 0 ? day.exits : ''}</Text>
                      <Text style={s.dailyLabel}>{dayLabel(day.date)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={s.legend}>
                <View style={s.legendDot} />
                <Text style={s.legendTxt}>Alert</Text>
                <View style={[s.legendDot, { backgroundColor: '#4caf50' }]} />
                <Text style={s.legendTxt}>Clear</Text>
              </View>
            </View>
          )}

          {/* Forget frequency bar chart */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Forget Frequency</Text>
            <Text style={s.sectionSub}>How often each item was missing across all exits</Text>

            {data && data.items.length > 0 ? (
              <View style={s.chart}>
                {data.items.map((item, i) => {
                  const barPct = (item.count / maxCount) * 100;
                  const color = BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)];
                  return (
                    <View key={item.name} style={s.barRow}>
                      <Text style={s.barLabel} numberOfLines={1}>{item.name}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${barPct}%` as any, backgroundColor: color }]} />
                      </View>
                      <Text style={[s.barCount, { color }]}>{item.count}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="bar-chart-outline" size={52} color="#21262d" />
                <Text style={s.emptyTitle}>No data yet</Text>
                <Text style={s.emptyHint}>
                  Analytics will appear after your first scan triggers a missing-item alert.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#161b22',
  },
  pageHeaderSub: { color: '#6e7681', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  pageHeaderTitle: { color: '#e6edf3', fontSize: 22, fontWeight: '800', marginTop: 2 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: '#161b22', borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#21262d',
  },
  summaryValue: { color: '#58a6ff', fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: '#6e7681', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { backgroundColor: '#161b22', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#21262d' },
  sectionTitle: { color: '#e6edf3', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sectionSub: { color: '#6e7681', fontSize: 12, marginBottom: 20 },

  chart: { gap: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { color: '#8b949e', fontSize: 13, fontWeight: '600', width: 72 },
  barTrack: {
    flex: 1, height: 22, backgroundColor: '#0d1117',
    borderRadius: 6, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  barCount: { fontSize: 13, fontWeight: '800', width: 28, textAlign: 'right' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { color: '#8b949e', fontSize: 18, fontWeight: '700' },
  emptyHint: { color: '#6e7681', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

  dailyChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  dailyCol: { alignItems: 'center', flex: 1 },
  dailyBarWrap: { height: BAR_MAX_H, justifyContent: 'flex-end', alignItems: 'center' },
  dailyEmpty: { width: 22, height: 3, backgroundColor: '#21262d', borderRadius: 2 },
  dailyCount: { color: '#6e7681', fontSize: 10, marginTop: 4 },
  dailyLabel: { color: '#8b949e', fontSize: 11, fontWeight: '600', marginTop: 2 },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e94560' },
  legendTxt: { color: '#6e7681', fontSize: 11, marginRight: 10 },
});
