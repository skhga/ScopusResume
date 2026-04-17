const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

const FRENCH_SECTION_HEADERS = {
  'Experience': 'Expérience Professionnelle',
  'Education': 'Formation',
  'Skills': 'Compétences',
  'Projects': 'Projets',
  'Certifications': 'Certifications',
  'Languages': 'Langues',
  'Volunteer': 'Bénévolat',
  'Awards': 'Prix et Distinctions',
  'Summary': 'Résumé Professionnel',
  'Personal Info': 'Informations Personnelles',
  'Career Objective': 'Objectif de Carrière',
};

/**
 * Recursively collect all string values from an object,
 * returning {path, text} pairs so we can reassemble after translation.
 */
function collectStrings(obj, prefix = '') {
  const entries = [];
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string' && val.trim()) {
      entries.push({ path, text: val });
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === 'string' && item.trim()) {
          entries.push({ path: `${path}[${i}]`, text: item });
        } else if (item && typeof item === 'object') {
          entries.push(...collectStrings(item, `${path}[${i}]`));
        }
      });
    } else if (val && typeof val === 'object') {
      entries.push(...collectStrings(val, path));
    }
  }
  return entries;
}

/**
 * Set a value at a dot/bracket path on an object, creating intermediaries.
 */
function setAtPath(obj, path, value) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    if (!(key in cur)) {
      cur[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  const key = process.env.DEEPL_KEY;
  if (!key) return res.status(500).json({ error: 'DEEPL_KEY not set on server' });

  try {
    const entries = collectStrings(resumeData);
    if (entries.length === 0) {
      return res.status(200).json({ translated: resumeData, sectionHeaders: FRENCH_SECTION_HEADERS });
    }

    // DeepL accepts up to 50 texts per request — batch if needed
    const BATCH_SIZE = 50;
    const allTranslations = [];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const response = await fetch(DEEPL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `DeepL-Auth-Key ${key}` },
        body: JSON.stringify({
          text: batch.map(e => e.text),
          target_lang: 'FR',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || `DeepL error: ${response.status}`);
      }

      const data = await response.json();
      allTranslations.push(...data.translations.map(t => t.text));
    }

    // Rebuild the translated object from the original structure
    const translated = JSON.parse(JSON.stringify(resumeData));
    entries.forEach((entry, i) => {
      setAtPath(translated, entry.path, allTranslations[i]);
    });

    res.status(200).json({ translated, sectionHeaders: FRENCH_SECTION_HEADERS });
  } catch (err) {
    console.error('translate error:', err);
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
};
