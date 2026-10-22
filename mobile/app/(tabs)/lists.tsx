import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import {
  addTagToList, createList, deleteList, getLists, getTags,
  removeTagFromList, updateList, type List, type Tag,
} from '../../utils/api';

export default function ListsScreen() {
  const [lists, setLists] = useState<List[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameModal, setNameModal] = useState<{ listId?: string; current?: string } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [tagModal, setTagModal] = useState<string | null>(null); // listId
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const load = useCallback(async () => {
    try {
      const [ls, ts] = await Promise.all([getLists(), getTags()]);
      setLists(ls);
      setAllTags(ts);
    } catch (e) {
      Alert.alert('Connection error', 'Could not reach the server. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  async function handleToggle(list: List) {
    const updated = await updateList(list.id, { active: !list.active });
    setLists((p) => p.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      if (!nameModal?.listId) {
        const nl = await createList(nameInput.trim());
        setLists((p) => [...p, nl]);
      } else {
        const ul = await updateList(nameModal.listId, { name: nameInput.trim() });
        setLists((p) => p.map((l) => (l.id === ul.id ? ul : l)));
      }
      setNameModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteList(list: List) {
    Alert.alert('Delete list', `Delete "${list.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteList(list.id);
          setLists((p) => p.filter((l) => l.id !== list.id));
        },
      },
    ]);
  }

  async function handleAddTag(listId: string, tagId: string) {
    const updated = await addTagToList(listId, tagId);
    setLists((p) => p.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleRemoveTag(listId: string, tagId: string) {
    const updated = await removeTagFromList(listId, tagId);
    setLists((p) => p.map((l) => (l.id === updated.id ? updated : l)));
  }

  const currentList = lists.find((l) => l.id === tagModal);
  const tagsInList = new Set(currentList?.tag_ids ?? []);
  const tagsNotInList = allTags.filter((t) => !tagsInList.has(t.id));

  return (
    <View style={s.bg}>
      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e94560" />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, gap: 10 }}>
              <Ionicons name="albums-outline" size={48} color="#333" />
              <Text style={{ color: '#8b949e', fontSize: 18, fontWeight: '700' }}>No lists yet</Text>
              <Text style={s.muted}>Tap + to create your first list</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.listName}>{item.name}</Text>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{ true: '#e94560', false: '#333' }}
                  thumbColor={item.active ? '#fff' : '#aaa'}
                />
              </View>
              <Text style={s.tagCount}>{item.tag_ids.length} item{item.tag_ids.length !== 1 ? 's' : ''}</Text>

              {(item.tags ?? []).map((t) => (
                <View key={t.id} style={s.tagRow}>
                  <Text style={s.tagName}>{t.name}</Text>
                  <Pressable onPress={() => handleRemoveTag(item.id, t.id)}>
                    <Ionicons name="remove-circle" size={20} color="#e94560" />
                  </Pressable>
                </View>
              ))}

              <View style={s.cardBtns}>
                <Pressable style={s.smallBtn} onPress={() => setTagModal(item.id)}>
                  <Ionicons name="add" size={16} color="#e94560" />
                  <Text style={s.smallBtnTxt}> Add item</Text>
                </Pressable>
                <Pressable style={s.smallBtn} onPress={() => { setNameInput(item.name); setNameModal({ listId: item.id }); }}>
                  <Ionicons name="pencil" size={16} color="#888" />
                </Pressable>
                <Pressable style={s.smallBtn} onPress={() => handleDeleteList(item)}>
                  <Ionicons name="trash" size={16} color="#888" />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Pressable style={s.fab} onPress={() => { setNameInput(''); setNameModal({}); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Create / rename list modal */}
      <Modal visible={!!nameModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{nameModal?.listId ? 'Rename list' : 'New list'}</Text>
            <TextInput
              style={s.input} placeholder="List name (e.g. College)"
              placeholderTextColor="#888" value={nameInput} onChangeText={setNameInput}
            />
            <View style={s.sheetBtns}>
              <Pressable style={[s.sheetBtn, { backgroundColor: '#333' }]} onPress={() => setNameModal(null)}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.sheetBtn, { backgroundColor: '#e94560' }]} onPress={handleSaveName} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add tag to list modal */}
      <Modal visible={!!tagModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '60%' }]}>
            <Text style={s.sheetTitle}>Add item to "{currentList?.name}"</Text>
            {tagsNotInList.length === 0 ? (
              <Text style={s.muted}>All tags already in this list</Text>
            ) : (
              <ScrollView>
                {tagsNotInList.map((t) => (
                  <Pressable
                    key={t.id}
                    style={s.tagPickRow}
                    onPress={async () => {
                      await handleAddTag(tagModal!, t.id);
                      setTagModal(null);
                    }}
                  >
                    <Text style={s.tagPickName}>{t.name}</Text>
                    <Text style={s.tagPickEpc}>{t.epc}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <Pressable style={[s.sheetBtn, { backgroundColor: '#333', marginTop: 12 }]} onPress={() => setTagModal(null)}>
              <Text style={{ color: '#fff' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0d1117' },
  card: { backgroundColor: '#161b22', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#21262d' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  listName: { color: '#e6edf3', fontSize: 17, fontWeight: '800' },
  tagCount: { color: '#6e7681', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  tagName: { color: '#c9d1d9', fontSize: 14, fontWeight: '500' },
  cardBtns: { flexDirection: 'row', marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#21262d', paddingTop: 12 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#21262d', gap: 4 },
  smallBtnTxt: { color: '#e94560', fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, backgroundColor: '#e94560',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: '#e94560', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  muted: { color: '#6e7681', textAlign: 'center', marginVertical: 20, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#161b22', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { color: '#e6edf3', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  input: {
    backgroundColor: '#0d1117', color: '#e6edf3', padding: 14, borderRadius: 12,
    marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#30363d',
  },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  tagPickRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#21262d' },
  tagPickName: { color: '#e6edf3', fontSize: 16, fontWeight: '600' },
  tagPickEpc: { color: '#6e7681', fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
});
