import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://exit-reminder-system.onrender.com';

const api = axios.create({ baseURL: BACKEND_URL, timeout: 25000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// ── Auth ──────────────────────────────────────────────────────────
export async function signup(email: string, password: string) {
  const { data } = await api.post('/auth/signup', { email, password });
  await SecureStore.setItemAsync('jwt', data.access_token);
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  await SecureStore.setItemAsync('jwt', data.access_token);
}

export async function logout() {
  await SecureStore.deleteItemAsync('jwt');
}

export async function getMe() {
  const { data } = await api.get('/me');
  return data as { id: string; email: string; device_key: string };
}

// ── Tags ──────────────────────────────────────────────────────────
export async function getTags() {
  const { data } = await api.get('/tags');
  return data as Tag[];
}

export async function createTag(epc: string, name: string) {
  const { data } = await api.post('/tags', { epc, name });
  return data as Tag;
}

export async function renameTag(tagId: string, name: string) {
  const { data } = await api.patch(`/tags/${tagId}`, { name });
  return data as Tag;
}

export async function deleteTag(tagId: string) {
  await api.delete(`/tags/${tagId}`);
}

// ── Lists ─────────────────────────────────────────────────────────
export async function getLists() {
  const { data } = await api.get('/lists');
  return data as List[];
}

export async function createList(name: string) {
  const { data } = await api.post('/lists', { name });
  return data as List;
}

export async function updateList(listId: string, patch: { name?: string; active?: boolean }) {
  const { data } = await api.patch(`/lists/${listId}`, patch);
  return data as List;
}

export async function deleteList(listId: string) {
  await api.delete(`/lists/${listId}`);
}

export async function addTagToList(listId: string, tagId: string) {
  const { data } = await api.post(`/lists/${listId}/tags`, { tag_id: tagId });
  return data as List;
}

export async function removeTagFromList(listId: string, tagId: string) {
  const { data } = await api.delete(`/lists/${listId}/tags/${tagId}`);
  return data as List;
}

// ── Me ────────────────────────────────────────────────────────────
export async function getLatest() {
  const { data } = await api.get('/me/latest');
  return data as LatestResult;
}

export async function getHistory() {
  const { data } = await api.get('/me/history');
  return data as Event[];
}

export async function getUnregistered() {
  const { data } = await api.get('/me/unregistered');
  return data as { epcs: string[] };
}

export async function regenerateDeviceKey() {
  const { data } = await api.post('/me/device-key/regenerate');
  return data as { device_key: string };
}

// ── Types ─────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  epc: string;
  name: string;
}

export interface List {
  id: string;
  name: string;
  active: boolean;
  tag_ids: string[];
  tags?: Tag[];
  schedule?: Record<string, unknown> | null;
}

export interface LatestResult {
  event_id: string | null;
  alert: boolean;
  speech: string;
  missing: string[];
  required: string[];
  ts?: string;
}

export interface Event {
  id: string;
  ts: string;
  required: string[];
  missing: string[];
  alert: boolean;
  speech: string;
}
