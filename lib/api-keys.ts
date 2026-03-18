import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { createHash, timingSafeEqual, randomBytes } from 'crypto'
import { db } from './firebase'

const API_KEYS_COLLECTION = 'apiKeys'

export interface ApiKeyRecord {
  id: string
  name: string
  /** SHA-256 hex hash — never exposed to the client */
  keyHash: string
  /** Masked display string e.g. sk_live_...a1b2 */
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
}

/** Generate a fresh sk_live_... key and its SHA-256 hash */
export function generateRawApiKey(): { key: string; hash: string; masked: string } {
  const raw = randomBytes(32).toString('hex')
  const key = `sk_live_${raw}`
  const hash = createHash('sha256').update(key).digest('hex')
  const masked = `sk_live_...${raw.slice(-4)}`
  return { key, hash, masked }
}

/** Hash an incoming key string for comparison */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Constant-time comparison of a provided key against a stored SHA-256 hex hash.
 * Prevents timing attacks.
 */
export function verifyKey(provided: string, storedHash: string): boolean {
  try {
    const providedBuf = Buffer.from(hashKey(provided), 'hex')
    const storedBuf = Buffer.from(storedHash, 'hex')
    if (providedBuf.length !== storedBuf.length) return false
    return timingSafeEqual(providedBuf, storedBuf)
  } catch {
    return false
  }
}

/** Save a new API key to Firestore. Returns the record plus the plain key (shown once). */
export async function createApiKeyRecord(
  name: string
): Promise<{ plainKey: string; record: Omit<ApiKeyRecord, 'keyHash'> }> {
  const { key, hash, masked } = generateRawApiKey()
  const now = Timestamp.now()
  const docRef = await addDoc(collection(db, API_KEYS_COLLECTION), {
    name,
    keyHash: hash,
    maskedKey: masked,
    createdAt: now,
    lastUsedAt: null,
  })
  return {
    plainKey: key,
    record: {
      id: docRef.id,
      name,
      maskedKey: masked,
      createdAt: now.toDate().toISOString(),
      lastUsedAt: null,
    },
  }
}

/** List all API keys (hashes excluded). */
export async function listApiKeys(): Promise<Omit<ApiKeyRecord, 'keyHash'>[]> {
  const q = query(collection(db, API_KEYS_COLLECTION), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      name: data.name ?? 'Unnamed Key',
      maskedKey: data.maskedKey ?? 'sk_live_...????',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
      lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() ?? null,
    }
  })
}

/** Delete an API key by Firestore doc ID. */
export async function deleteApiKeyRecord(id: string): Promise<void> {
  await deleteDoc(doc(db, API_KEYS_COLLECTION, id))
}

/**
 * Find a key record by comparing provided token against all stored hashes.
 * Updates lastUsedAt on match. Returns null if not found.
 */
export async function findAndVerifyApiKey(
  token: string
): Promise<Omit<ApiKeyRecord, 'keyHash'> | null> {
  const snap = await getDocs(collection(db, API_KEYS_COLLECTION))
  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    if (!data.keyHash) continue
    if (verifyKey(token, data.keyHash)) {
      // Update lastUsedAt asynchronously (fire-and-forget)
      updateDoc(doc(db, API_KEYS_COLLECTION, docSnap.id), {
        lastUsedAt: Timestamp.now(),
      }).catch(() => {})
      return {
        id: docSnap.id,
        name: data.name ?? 'Unnamed Key',
        maskedKey: data.maskedKey ?? '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
        lastUsedAt: new Date().toISOString(),
      }
    }
  }
  return null
}
