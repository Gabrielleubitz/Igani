import translate from 'translate'

// Configure translate to use Google Translate (free)
translate.engine = 'google'
translate.key = undefined // Free version, no API key needed

// In-memory cache to avoid repeated translations
const translationCache = new Map<string, string>()

/**
 * Generate a cache key for translation
 */
function getCacheKey(text: string, from: string, to: string): string {
  return `${from}:${to}:${text}`
}

/**
 * Translate text from one language to another
 * Uses cache to avoid repeated API calls
 */
export async function translateText(
  text: string,
  from: string = 'en',
  to: string = 'he'
): Promise<string> {
  if (!text || text.trim() === '') return text

  // Return as-is if translating to same language
  if (from === to) return text

  // Check cache first
  const cacheKey = getCacheKey(text, from, to)
  const cached = translationCache.get(cacheKey)
  if (cached) return cached

  try {
    const translated = await translate(text, { from, to })

    // Cache the result
    translationCache.set(cacheKey, translated)

    return translated
  } catch (error) {
    console.error('Translation error:', error)
    // Return original text if translation fails
    return text
  }
}

/**
 * Translate multiple texts in parallel
 */
export async function translateTexts(
  texts: string[],
  from: string = 'en',
  to: string = 'he'
): Promise<string[]> {
  return Promise.all(texts.map(text => translateText(text, from, to)))
}

/**
 * Translate all string values in an object
 * Recursively handles nested objects and arrays
 */
export async function translateObject<T extends Record<string, any>>(
  obj: T,
  from: string = 'en',
  to: string = 'he',
  skipKeys: string[] = ['id', 'url', 'slug', 'email', 'phone', 'image', 'icon', 'href', 'src']
): Promise<T> {
  if (typeof obj !== 'object' || obj === null) return obj

  const result: any = Array.isArray(obj) ? [] : {}

  for (const [key, value] of Object.entries(obj)) {
    // Skip certain keys that shouldn't be translated
    if (skipKeys.includes(key.toLowerCase())) {
      result[key] = value
      continue
    }

    if (typeof value === 'string') {
      // Translate string values
      result[key] = await translateText(value, from, to)
    } else if (Array.isArray(value)) {
      // Recursively translate arrays
      result[key] = await Promise.all(
        value.map(item =>
          typeof item === 'object'
            ? translateObject(item, from, to, skipKeys)
            : typeof item === 'string'
            ? translateText(item, from, to)
            : item
        )
      )
    } else if (typeof value === 'object' && value !== null) {
      // Recursively translate nested objects
      result[key] = await translateObject(value, from, to, skipKeys)
    } else {
      // Keep other types as-is
      result[key] = value
    }
  }

  return result
}

/**
 * Translate an array of objects
 */
export async function translateArray<T extends Record<string, any>>(
  items: T[],
  from: string = 'en',
  to: string = 'he',
  skipKeys?: string[]
): Promise<T[]> {
  return Promise.all(
    items.map(item => translateObject(item, from, to, skipKeys))
  )
}

/**
 * Clear translation cache
 * Useful for memory management or forcing fresh translations
 */
export function clearTranslationCache() {
  translationCache.clear()
}

/**
 * Get cache size (for debugging)
 */
export function getCacheSize() {
  return translationCache.size
}

/**
 * Pre-cache translations for better performance
 * Useful for translating common phrases on app startup
 */
export async function preCacheTranslations(
  texts: string[],
  from: string = 'en',
  to: string = 'he'
): Promise<void> {
  await translateTexts(texts, from, to)
}
