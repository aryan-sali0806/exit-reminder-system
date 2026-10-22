import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  RefreshControl, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  createTag, deleteTag, getTags, getUnregistered, renameTag, type Tag,
} from '../../utils/api';

export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [unregistered, setUnregistered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<{ mode: 'add' | 'rename'; tagId?: string; epc?: string } | null>(null);
  const [epcInput, setEpcInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([getTags(), getUnregistered()]);
      setTags(t);
      setUnregistered(u.epcs);
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

  function openAdd(epc = '') {
    setEpcInput(epc);
    setNameInput('');
    setModal({ mode: 'add', epc });
  }

  function openRename(tag: Tag) {
    setNameInput(tag.name);
    setModal({ mode: 'rename', tagId: tag.id });
  }

  async function handleSave() {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      if (modal?.mode === 'add') {
        if (!epcInput.trim()) return;
        const t = await createTag(epcInput.trim().toUpperCase(), nameInput.trim());
        setTags((p) => [...p, t]);
        setUnregistered((p) => p.filter((e) => e !== epcInput.trim().toUpperCase()));
      } else if (modal?.tagId) {
        const t = await renameTag(modal.tagId, nameInput.trim());
        setTags((p) => p.map((x) => (x.id === t.id ? t : x)));
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tag: Tag) {
    Alert.alert('Delete tag', `Delete "${tag.name}"? It will be removed from all lists.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteTag(tag.id);
          setTags((p) => p.filter((t) => t.id !== tag.id));
        },
      },
    ]);
  }

  return (
    <View style={s.bg}>
      {/* Unregistered banners */}
      {unregistered.map((epc) => (
        <Pressable key={epc} style={s.banner} onPress={() => openAdd(epc)}>
          <View style={s.bannerIcon}>
            <Ionicons name="radio" size={16} color="#e94560" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>New tag detected</Text>
            <Text style={s.bannerEpc}>{epc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8b949e" />
        </Pressable>
      ))}

      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 60 }} size="large" />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
          ListHeaderComponent={
            tags.length > 0 ? (
              <Text style={s.listHeader}>{tags.length} registered tag{tags.length !== 1 ? 's' : ''}</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color="#333" />
              <Text style={s.emptyTitle}>No tags yet</Text>
              <Text style={s.emptyHint}>Tap + to register your first RFID tag</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={s.indexBadge}>
                  <Text style={s.indexText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  <View style={s.epcChip}>
                    <Ionicons name="barcode-outline" size={12} color="#8b949e" />
                    <Text style={s.epc}>{item.epc}</Text>
                  </View>
                </View>
              </View>
              <View style={s.actions}>
                <Pressable onPress={() => openRename(item)} style={s.iconBtn}>
                  <Ionicons name="pencil-outline" size={18} color="#8b949e" />
                </Pressable>
                <Pressable onPress={() => handleDelete(item)} style={[s.iconBtn, s.deleteBtn]}>
                  <Ionicons name="trash-outline" size={18} color="#e94560" />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Pressable style={s.fab} onPress={() => openAdd()}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={!!modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              {modal?.mode === 'add' ? 'Register tag' : 'Rename tag'}
            </Text>
            {modal?.mode === 'add' && (
              <>
                <Text style={s.inputLabel}>EPC Code</Text>
                <TextInput
                  style={s.input} placeholder="E200AABBCCDDEEFF"
                  placeholderTextColor="#6e7681" autoCapitalize="characters"
                  value={epcInput} onChangeText={setEpcInput}
                />
              </>
            )}
            <Text style={s.inputLabel}>Item Name</Text>
            <TextInput
              style={s.input} placeholder="e.g. Wallet, Keys, ID Card"
              placeholderTextColor="#6e7681"
              value={nameInput} onChangeText={setNameInput}
            />
            <View style={s.sheetBtns}>
              <Pressable onPress={() => setModal(null)} style={s.cancelBtn}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={s.saveBtn} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveTxt}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a0f16', margin: 12, marginBottom: 0, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e9456033' },
  bannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e9456022', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#e94560', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerEpc: { color: '#8b949e', fontSize: 12, fontFamily: 'monospace', marginTop: 2 },

  listHeader: { color: '#6e7681', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTitle: { color: '#8b949e', fontSize: 18, fontWeight: '700' },
  emptyHint: { color: '#6e7681', fontSize: 14 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161b22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262d' },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  indexBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#21262d', justifyContent: 'center', alignItems: 'center' },
  indexText: { color: '#8b949e', fontSize: 13, fontWeight: '700' },
  name: { color: '#e6edf3', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  epcChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  epc: { color: '#8b949e', fontSize: 11, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: '#21262d' },
  deleteBtn: { backgroundColor: '#1a0a0f' },

  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#e94560', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#e94560', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#161b22', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#30363d', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#e6edf3', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  inputLabel: { color: '#8b949e', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#0d1117', color: '#e6edf3', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#30363d' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#21262d' },
  cancelTxt: { color: '#e6edf3', fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#e94560' },
  saveTxt: { color: '#fff', fontWeight: '800' },
});
