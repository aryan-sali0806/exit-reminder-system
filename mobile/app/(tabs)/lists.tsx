import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
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

  const load = useCallback(async () => {
    const [ls, ts] = await Promise.all([getLists(), getTags()]);
    setLists(ls);
    setAllTags(ts);
    setLoading(false);
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
          ListEmptyComponent={<Text style={s.muted}>No lists yet — tap + to create one</Text>}
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
  bg: { flex: 1, backgroundColor: '#1a1a2e' },
  card: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  listName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  tagCount: { color: '#888', fontSize: 13, marginBottom: 8 },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  tagName: { color: '#ccc', fontSize: 14 },
  cardBtns: { flexDirection: 'row', marginTop: 10, gap: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 6, backgroundColor: '#1a1a2e' },
  smallBtnTxt: { color: '#e94560', fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, backgroundColor: '#e94560',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  muted: { color: '#888', textAlign: 'center', marginVertical: 20, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16213e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: {
    backgroundColor: '#1a1a2e', color: '#fff', padding: 13, borderRadius: 10,
    marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#0f3460',
  },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  tagPickRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  tagPickName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tagPickEpc: { color: '#888', fontSize: 12, marginTop: 2 },
});
