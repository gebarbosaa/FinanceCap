import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseApp';
import type { StorageData } from './storageService';
import { INITIAL_SETTINGS, INITIAL_CATEGORIES } from './initialData';

const OWNER_KEY = 'BF_FINANCE_OS_OWNER_UID';

const ARRAY_FIELDS = [
  'accounts', 'categories', 'cards', 'transactions', 'invoices', 'installments',
  'recurrences', 'budgets', 'debts', 'patrimony', 'investments', 'goals', 'audit',
] as const;

type ArrayField = typeof ARRAY_FIELDS[number];
type CloudRecord = { id: string } & Record<string, unknown>;

let activeUid: string | null = null;
let cloudCache: StorageData | null = null;
let saveQueue: Promise<void> = Promise.resolve();

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const userCollection = (uid: string, field: ArrayField) =>
  collection(db, 'users', uid, field);

function records(data: StorageData, field: ArrayField): CloudRecord[] {
  return data[field] as unknown as CloudRecord[];
}

export async function loadUserFinance(uid: string, localData: StorageData): Promise<StorageData> {
  const previousOwner = localStorage.getItem(OWNER_KEY);
  const safeLocalData: StorageData = previousOwner && previousOwner !== uid
    ? {
        settings: INITIAL_SETTINGS,
        accounts: [], categories: INITIAL_CATEGORIES, cards: [], transactions: [],
        invoices: [], installments: [], recurrences: [], budgets: [], debts: [],
        patrimony: [], investments: [], goals: [], audit: [],
      }
    : localData;

  const settingsRef = doc(db, 'users', uid, 'private', 'settings');
  const settingsSnap = await getDoc(settingsRef);
  const loaded = {} as Pick<StorageData, ArrayField>;

  const snapshots = await Promise.all(
    ARRAY_FIELDS.map((field) => getDocs(userCollection(uid, field)))
  );
  let remoteCount = 0;

  ARRAY_FIELDS.forEach((field, index) => {
    const docs = snapshots[index].docs;
    remoteCount += docs.length;
    (loaded as Record<string, unknown>)[field] = docs.map((item) => item.data()) as unknown[];
  });

  if (!settingsSnap.exists() && remoteCount === 0) {
    // First Google sign-in: migrate the current browser data exactly once.
    await saveUserFinance(uid, safeLocalData);
    localStorage.setItem(OWNER_KEY, uid);
    cloudCache = clone(safeLocalData);
    activeUid = uid;
    return clone(safeLocalData);
  }

  const cloudData = {
    ...localData,
    ...loaded,
    settings: settingsSnap.exists() ? settingsSnap.data() : localData.settings,
  } as StorageData;

  activeUid = uid;
  localStorage.setItem(OWNER_KEY, uid);
  cloudCache = clone(cloudData);
  return cloudData;
}

export function saveUserFinance(uid: string, data: StorageData): Promise<void> {
  const operation = async () => {
    if (activeUid && activeUid !== uid) throw new Error('Sessão de usuário alterada durante a gravação.');
    const previous = cloudCache;
    const batch = writeBatch(db);
    let writes = 0;

    for (const field of ARRAY_FIELDS) {
      const before = new Map((previous ? records(previous, field) : []).map((item) => [item.id, item]));
      const after = new Map(records(data, field).map((item) => [item.id, item]));

      for (const [id, item] of after) {
        if (JSON.stringify(before.get(id)) !== JSON.stringify(item)) {
          batch.set(doc(db, 'users', uid, field, id), item);
          writes++;
        }
      }
      for (const id of before.keys()) {
        if (!after.has(id)) {
          batch.delete(doc(db, 'users', uid, field, id));
          writes++;
        }
      }
    }

    if (!previous || JSON.stringify(previous.settings) !== JSON.stringify(data.settings)) {
      batch.set(doc(db, 'users', uid, 'private', 'settings'), data.settings);
      writes++;
    }

    if (writes > 450) {
      throw new Error('Muitas alterações para uma única gravação segura. Faça uma sincronização inicial em lotes menores.');
    }
    if (writes > 0) await batch.commit();
    activeUid = uid;
    cloudCache = clone(data);
  };

  saveQueue = saveQueue.then(operation, operation);
  return saveQueue;
}

export function watchUserFinance(
  uid: string,
  onData: (data: StorageData) => void,
  baseData: StorageData
): Unsubscribe {
  let current = clone(baseData);
  const ready = new Set<string>();
  const unsubs: Unsubscribe[] = [];

  const publish = () => {
    if (ready.size !== ARRAY_FIELDS.length + 1) return;
    cloudCache = clone(current);
    onData(clone(current));
  };

  for (const field of ARRAY_FIELDS) {
    unsubs.push(onSnapshot(userCollection(uid, field), (snapshot) => {
      (current as unknown as Record<string, unknown>)[field] =
        snapshot.docs.map((item) => item.data());
      ready.add(field);
      publish();
    }));
  }

  unsubs.push(onSnapshot(doc(db, 'users', uid, 'private', 'settings'), (snapshot) => {
    if (snapshot.exists()) current.settings = snapshot.data() as StorageData['settings'];
    ready.add('settings');
    publish();
  }));

  return () => unsubs.forEach((unsubscribe) => unsubscribe());
}

export function clearCloudSession() {
  activeUid = null;
  cloudCache = null;
  saveQueue = Promise.resolve();
}
