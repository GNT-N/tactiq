// Le score est l'objet central de l'outil : c'est là que converge le sourcing,
// l'enrichissement et l'analyse. Il mérite mieux qu'une pastille colorée.
// Jauge segmentée en dix crans, comme un indicateur d'équipement — la valeur
// se lit d'un coup d'œil dans une liste, sans avoir à lire le chiffre.

const PALIERS = [
  { min: 8, couleur: '#ff3b30', libelle: 'PRIORITAIRE' },
  { min: 5, couleur: '#ff8c00', libelle: 'À QUALIFIER' },
  { min: 3, couleur: '#c8a020', libelle: 'FAIBLE' },
  { min: 0, couleur: '#4a5058', libelle: 'ÉCARTÉ' },
]

export function palierScore(score: number) {
  return PALIERS.find(p => score >= p.min) ?? PALIERS[PALIERS.length - 1]
}

interface Props {
  score: number
  format?: 'compact' | 'complet'
}

export default function ScoreTactique({ score, format = 'compact' }: Props) {
  const valeur = Math.max(0, Math.min(10, Math.round(score)))
  const palier = palierScore(valeur)

  const crans = (
    <div className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={format === 'complet' ? 'w-2 h-5' : 'w-[3px] h-3'}
          style={{
            backgroundColor: i < valeur ? palier.couleur : 'rgba(200,204,208,0.12)',
            // Les crans franchis s'éclairent, les autres restent creux.
            boxShadow: i < valeur ? `0 0 6px ${palier.couleur}55` : 'none',
          }}
        />
      ))}
    </div>
  )

  if (format === 'compact') {
    return (
      <div className="flex items-center gap-2" title={`${valeur}/10 · ${palier.libelle}`}>
        {crans}
        <span className="donnee text-sm font-medium" style={{ color: palier.couleur }}>
          {valeur}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="titre text-4xl font-bold leading-none" style={{ color: palier.couleur }}>
          {valeur}
        </span>
        <span className="donnee text-xs" style={{ color: 'var(--texte-attenue)' }}>/ 10</span>
        <span
          className="titre text-xs tracking-[0.2em] ml-auto"
          style={{ color: palier.couleur }}
        >
          {palier.libelle}
        </span>
      </div>
      {crans}
    </div>
  )
}
