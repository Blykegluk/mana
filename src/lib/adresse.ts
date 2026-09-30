/**
 * Suggestions d'adresses — Base Adresse Nationale (Géoplateforme de l'IGN).
 * Service public, gratuit, sans clé et ouvert aux appels du navigateur : il
 * couvre toutes les adresses françaises, ce qui suffit à Mana (magasins,
 * associations et sièges sont en France).
 */

const URL_BAN = 'https://data.geopf.fr/geocodage/search'

export interface AdresseSuggeree {
  /** Libellé complet affiché et enregistré : « 58 Boulevard Ornano, 75018 Paris ». */
  libelle: string
  /** Numéro et voie (vide pour une commune seule). */
  voie: string
  codePostal: string
  commune: string
}

interface ProprietesBAN {
  type: string
  name?: string
  postcode?: string
  city?: string
}

/** Libellé enregistré : voie, code postal commune — ou « Commune 75018 » pour une commune seule. */
export function libelleAdresse(a: { voie: string; codePostal: string; commune: string }): string {
  if (!a.voie) return `${a.commune} ${a.codePostal}`.trim()
  return `${a.voie}, ${a.codePostal} ${a.commune}`.trim()
}

/**
 * Jusqu'à 6 adresses qui commencent comme `saisie`. `communes` limite aux
 * communes (recherche « ville ou code postal »). Tableau vide si la saisie est
 * trop courte ou si le service ne répond pas : la saisie libre reste possible.
 */
export async function suggererAdresses(saisie: string, options: { communes?: boolean; signal?: AbortSignal } = {}): Promise<AdresseSuggeree[]> {
  const q = saisie.trim()
  if (q.length < 3) return []
  const url = new URL(URL_BAN)
  url.searchParams.set('q', q)
  url.searchParams.set('autocomplete', '1')
  url.searchParams.set('limit', '6')
  if (options.communes) url.searchParams.set('type', 'municipality')
  const r = await fetch(url, { signal: options.signal })
  if (!r.ok) return []
  const json = (await r.json()) as { features?: { properties: ProprietesBAN }[] }
  const vues = new Set<string>()
  const suggestions: AdresseSuggeree[] = []
  for (const { properties: p } of json.features ?? []) {
    const commune = p.city ?? ''
    const codePostal = p.postcode ?? ''
    const voie = p.type === 'municipality' ? '' : p.name ?? ''
    const a = { voie, codePostal, commune }
    const libelle = libelleAdresse(a)
    if (!commune || vues.has(libelle)) continue
    vues.add(libelle)
    suggestions.push({ libelle, ...a })
  }
  return suggestions
}

/** Découpe un libellé libre « voie, 75018 Paris » ; la voie seule si aucun code postal n'y figure. */
export function decouperAdresse(texte: string): { voie: string; codePostal: string; commune: string } {
  const t = texte.trim()
  const m = t.match(/^(.*?)[,\s]+(\d{5})\s+(.+)$/)
  if (!m) return { voie: t, codePostal: '', commune: '' }
  return { voie: m[1].trim(), codePostal: m[2], commune: m[3].trim() }
}
