import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  createTag, deleteTag, getTags, getUnregistered, renameTag, type Tag,
} from '../../utils/api';

export default function TagsScreen() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [unregistered, setUnregistered] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
      {/* New tag detected banner */}
      {unregistered.map((epc) => (
        <Pressable key={epc} style={s.banner} onPress={() => openAdd(epc)}>
          <Ionicons name="radio-outline" size={18} color="#fff" />
          <Text style={s.bannerTxt}> New tag detected: {epc}  →  Tap to name it</Text>
        </Pressable>
      ))}

      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<Text style={s.muted}>No tags registered yet</Text>}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.epc}>{item.epc}</Text>
              </View>
              <Pressable onPress={() => openRename(item)} style={s.iconBtn}>
                <Ionicons name="pencil" size={20} color="#e94560" />
              </Pressable>
              <Pressable onPress={() => handleDelete(item)} style={s.iconBtn}>
                <Ionicons name="trash" size={20} color="#e94560" />
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable style={s.fab} onPress={() => openAdd()}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add / Rename modal */}
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{modal?.mode === 'add' ? 'Register tag' : 'Rename tag'}</Text>
            {modal?.mode === 'add' && (
              <TextInput
                style={s.input} placeholder="EPC (e.g. E200AABBCCDDEEFF)"
                placeholderTextColor="#888" autoCapitalize="characters"
                value={epcInput} onChangeText={setEpcInput}
              />
            )}
            <TextInput
              style={s.input} placeholder="Item name (e.g. Wallet)"
              placeholderTextColor="#888"
              value={nameInput} onChangeText={setNameInput}
            />
            <View style={s.sheetBtns}>
              <Pressable onPress={() => setModal(null)} style={[s.sheetBtn, { backgroundColor: '#333' }]}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[s.sheetBtn, { backgroundColor: '#e94560' }]} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#1a1a2e' },
  banner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f3460',
    padding: 12, margin: 10, borderRadius: 10,
  },
  bannerTxt: { color: '#fff', fontSize: 13, flexShrink: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e',
    borderRadius: 10, padding: 14, marginBottom: 10,
  },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  epc: { color: '#888', fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  iconBtn: { padding: 8 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, backgroundColor: '#e94560',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    elevation: 6,
  },
  muted: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: {
    backgroundColor: '#1a1a2e', color: '#fff', padding: 13, borderRadius: 10,
    marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#0f3460',
  },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
