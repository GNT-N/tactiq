import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const TIMEOUT_MS = 8000
const TAILLE_MAX = 500_000
const REDIRECTIONS_MAX = 3
const UA = 'TactiqBot/1.0 (analyse de prospection)'

export interface Signal {
  code: string
  label: string
  poids: number
}

export interface AnalyseSite {
  url: string | null
  joignable: boolean
  erreur: string | null
  statut_http: number | null
  https: boolean
  responsive: boolean | null
  generateur: string | null
  taille_html: number | null
  temps_reponse_ms: number | null
  annee_copyright: number | null
  signaux: Signal[]
  score: number
  analyse_le: string
}

// Le site_web vient de l'utilisateur : sans garde-fou, il pourrait faire
// interroger le réseau interne par le serveur (SSRF), y compris les IP de
// métadonnées cloud. On refuse tout ce qui ne résout pas vers du public.
function estIpPrivee(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }

  const v6 = ip.toLowerCase()
  return v6 === '::' || v6 === '::1'
    || v6.startsWith('fc') || v6.startsWith('fd')
    || v6.startsWith('fe80') || v6.startsWith('::ffff:')
}

async function refusMotif(url: URL): Promise<string | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'protocole non autorisé'
  if (isIP(url.hostname) && estIpPrivee(url.hostname)) return 'adresse interne'

  try {
    const adresses = await lookup(url.hostname, { all: true })
    if (adresses.length === 0) return 'domaine introuvable'
    if (adresses.some(a => estIpPrivee(a.address))) return 'adresse interne'
  } catch {
    return 'domaine introuvable'
  }

  return null
}

function normaliserUrl(brut: string): URL | null {
  const nettoye = brut.trim()
  if (!nettoye) return null

  // Un schéma explicite autre que http(s) est refusé ici : le préfixer de
  // "https://" masquerait le contrôle de protocole au lieu de l'appliquer.
  const schema = nettoye.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (schema && schema !== 'http' && schema !== 'https') return null

  try {
    return new URL(schema ? nettoye : `https://${nettoye}`)
  } catch {
    return null
  }
}

async function recupererHtml(depart: URL) {
  let url = depart
  let redirections = 0
  const debut = Date.now()

  while (redirections <= REDIRECTIONS_MAX) {
    const motif = await refusMotif(url)
    if (motif) return { erreur: motif, url, statut: null, html: null, ms: Date.now() - debut }

    let res: Response
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      })
    } catch {
      return { erreur: 'injoignable', url, statut: null, html: null, ms: Date.now() - debut }
    }

    // Chaque saut est revalidé : une redirection peut viser une IP interne.
    if (res.status >= 300 && res.status < 400) {
      const cible = res.headers.get('location')
      if (!cible) return { erreur: 'redirection invalide', url, statut: res.status, html: null, ms: Date.now() - debut }
      try {
        url = new URL(cible, url)
      } catch {
        return { erreur: 'redirection invalide', url, statut: res.status, html: null, ms: Date.now() - debut }
      }
      redirections++
      continue
    }

    const ms = Date.now() - debut
    if (!res.ok) return { erreur: `http ${res.status}`, url, statut: res.status, html: null, ms }

    const brut = await res.text()
    return { erreur: null, url, statut: res.status, html: brut.slice(0, TAILLE_MAX), ms }
  }

  return { erreur: 'trop de redirections', url, statut: null, html: null, ms: Date.now() - debut }
}

function anneeCopyright(html: string): number | null {
  const annees = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,20}((?:19|20)\d{2})/gi)]
    .map(m => Number(m[1]))
    .filter(a => a >= 1990 && a <= new Date().getFullYear() + 1)

  return annees.length > 0 ? Math.max(...annees) : null
}

export async function analyserSite(siteWeb: string | null | undefined): Promise<AnalyseSite> {
  const maintenant = new Date().toISOString()
  const signaux: Signal[] = []

  const base = {
    url: null as string | null,
    joignable: false,
    erreur: null as string | null,
    statut_http: null as number | null,
    https: false,
    responsive: null as boolean | null,
    generateur: null as string | null,
    taille_html: null as number | null,
    temps_reponse_ms: null as number | null,
    annee_copyright: null as number | null,
    analyse_le: maintenant,
  }

  const renseigne = Boolean(siteWeb?.trim())
  const url = renseigne ? normaliserUrl(siteWeb!) : null

  // Pas de site du tout : c'est le signal de besoin le plus fort.
  if (!renseigne) {
    signaux.push({ code: 'aucun_site', label: 'Aucun site web', poids: 7 })
    return { ...base, signaux, score: calculerScore(signaux) }
  }

  // Une adresse saisie mais inexploitable vaut un site mort, pas une absence.
  if (!url) {
    base.erreur = 'url invalide'
    signaux.push({ code: 'url_invalide', label: 'Adresse de site invalide', poids: 6 })
    return { ...base, signaux, score: calculerScore(signaux) }
  }

  const res = await recupererHtml(url)
  base.url = res.url.toString()
  base.statut_http = res.statut
  base.temps_reponse_ms = res.ms
  base.https = res.url.protocol === 'https:'

  if (res.erreur || !res.html) {
    base.erreur = res.erreur
    signaux.push({
      code: 'site_injoignable',
      label: `Site déclaré mais injoignable (${res.erreur})`,
      poids: 6,
    })
    return { ...base, signaux, score: calculerScore(signaux) }
  }

  base.joignable = true
  base.taille_html = res.html.length

  const html = res.html
  base.responsive = /<meta[^>]+name=["']?viewport["']?/i.test(html)
  base.generateur = html.match(/<meta[^>]+name=["']?generator["']?[^>]+content=["']([^"']+)/i)?.[1] ?? null
  base.annee_copyright = anneeCopyright(html)

  if (!base.https) {
    signaux.push({ code: 'https_absent', label: 'Pas de HTTPS', poids: 2.5 })
  }
  if (!base.responsive) {
    signaux.push({ code: 'non_responsive', label: 'Pas de balise viewport : non adapté au mobile', poids: 3 })
  }
  if (base.annee_copyright && new Date().getFullYear() - base.annee_copyright >= 3) {
    signaux.push({
      code: 'contenu_date',
      label: `Copyright figé en ${base.annee_copyright}`,
      poids: 1.5,
    })
  }
  if (/<(font|center|marquee)\b/i.test(html)) {
    signaux.push({ code: 'html_obsolete', label: 'Balises HTML obsolètes (font, center, marquee)', poids: 1.5 })
  }
  if (res.ms > 3000) {
    signaux.push({ code: 'lent', label: `Réponse lente (${(res.ms / 1000).toFixed(1)} s)`, poids: 1 })
  }

  return { ...base, signaux, score: calculerScore(signaux) }
}

// Score 0-10 : plus il est haut, plus le besoin est fort, donc plus le prospect
// est chaud. Aucun appel LLM ici, le calcul reste reproductible.
export function calculerScore(signaux: Signal[]): number {
  const total = signaux.reduce((acc, s) => acc + s.poids, 0)
  return Math.max(0, Math.min(10, Math.round(total)))
}
