import { useEffect, useState } from 'react'

/** Nom du script de l'application (« portail-XXXX.js ») : il change à chaque publication. */
const SCRIPT = /portail-[\w-]+\.js/

const INTERVALLE_MS = 10 * 60 * 1000

/**
 * Un onglet ou l'application installée peut rester ouvert des jours sans se
 * recharger : l'utilisateur ne voit alors jamais les corrections publiées.
 * On relit la page publiée à intervalles réguliers et au retour sur l'onglet ;
 * si elle charge un autre script que celui en cours, on propose de recharger.
 */
export function MiseAJour() {
  const [disponible, setDisponible] = useState(false)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    const courant = [...document.scripts].map((s) => s.src.match(SCRIPT)?.[0]).find(Boolean)
    if (!courant) return

    async function verifier() {
      try {
        const r = await fetch(location.pathname, { cache: 'no-store' })
        const publie = (await r.text()).match(SCRIPT)?.[0]
        if (publie && publie !== courant) setDisponible(true)
      } catch {
        /* hors connexion : on réessaiera */
      }
    }
    const auRetour = () => {
      if (document.visibilityState === 'visible') void verifier()
    }
    void verifier()
    const minuterie = window.setInterval(() => void verifier(), INTERVALLE_MS)
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      window.clearInterval(minuterie)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])

  if (!disponible) return null
  return (
    <div className="mise-a-jour" role="status">
      <span>Une nouvelle version de Mana est disponible.</span>
      <button className="btn btn-primary btn-sm" onClick={() => location.reload()}>
        Mettre à jour
      </button>
    </div>
  )
}
