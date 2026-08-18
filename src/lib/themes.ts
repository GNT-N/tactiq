export const themes = {
  // Châssis acier, électronique cyan. Le dégradé va du cyan au teal profond
  // pour évoquer du métal anodisé plutôt qu'un fondu néon.
  tactique:  { nom: 'Tactique',  primary: '#00e5d4', secondary: '#157f76', bg: '#0d0f12', card: '#12151a' },
  cyberpunk: { nom: 'Cyberpunk', primary: '#00f5ff', secondary: '#bf00ff', bg: '#030712', card: '#0a0f1e' },
  aurora:    { nom: 'Aurora',    primary: '#f472b6', secondary: '#a855f7', bg: '#0d0718', card: '#130a1f' },
  fire:      { nom: 'Fire',      primary: '#f97316', secondary: '#ef4444', bg: '#0f0805', card: '#1a0e08' },
  matrix:    { nom: 'Matrix',    primary: '#22c55e', secondary: '#06b6d4', bg: '#030f05', card: '#071a0a' },
  gold:      { nom: 'Gold',      primary: '#f5c842', secondary: '#b8860b', bg: '#080600', card: '#110e00' },
}

export type ThemeKey = keyof typeof themes

export const THEME_PAR_DEFAUT: ThemeKey = 'tactique'

export function estThemeValide(valeur: unknown): valeur is ThemeKey {
  return typeof valeur === 'string' && valeur in themes
}

// Déclinaisons alpha exposées en variables CSS : les pages y accèdent
// sans avoir à consommer le contexte React.
const ALPHA = {
  '04': '0a',
  '05': '0d',
  '10': '1a',
  '15': '26',
  '20': '33',
  '30': '4d',
  '50': '80',
  '60': '99',
}

export function variablesCss(theme: ThemeKey): React.CSSProperties {
  const t = themes[theme]
  const vars: Record<string, string> = {
    '--theme-primary': t.primary,
    '--theme-secondary': t.secondary,
    '--theme-bg': t.bg,
    '--theme-card': t.card,
  }

  for (const [niveau, hex] of Object.entries(ALPHA)) {
    vars[`--theme-primary-${niveau}`] = `${t.primary}${hex}`
  }

  return vars as React.CSSProperties
}
