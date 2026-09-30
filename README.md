# Tactiq

CRM de prospection mono-utilisateur pour freelance web. Il répond à une seule
question, pour un seul utilisateur : **quelles entreprises de ma ville ont un
besoin web réel, et laquelle j'appelle en premier ?**

L'outil parcourt OpenStreetMap pour trouver les établissements d'un secteur dans
une commune, les recoupe avec le registre national des entreprises, analyse
techniquement leur site (ou son absence), et attribue un score de 0 à 10. Puis
il rédige l'email d'approche et l'envoie.

---

## Le pipeline

```text
   Campagne (secteur + ville)
        │
        ├─ Import OpenStreetMap ──┐
        └─ Import CSV ────────────┤
                                  ▼
                              Prospects
                                  │
                    Enrichissement registre (SIRENE / INPI)
                    → SIRET, dirigeant, effectif, activité, entreprise cessée ?
                                  │
                        Analyse du site + scoring 0-10
                    → HTTPS, responsive, fraîcheur, vitesse, HTML obsolète
                    → détection de site non déclaré si aucun tag website
                                  │
                         Email généré par LLM
                                  │
                        Envoi SMTP + historique
```

Chaque étape s'exécute à l'unité (depuis la fiche d'un prospect) ou par lots
bornés (depuis la liste). Chaque opération laisse une `Interaction` datée, qui
sert aussi de garde-fou : un lot ne retraite jamais un prospect déjà traité.

### Sourcing

**OpenStreetMap / Overpass** — 8 catégories mappées sur des tags OSM
(`amenity=restaurant`, `craft=plumber`, `shop=car_repair`…). La requête est
lancée **depuis le navigateur**, pas depuis le serveur : les quotas Overpass
sont par IP, et celle d'un hébergeur mutualisé est saturée en permanence. Le
serveur reçoit donc des données contrôlées par le client, et les revalide
intégralement (forme du SIRET, longueurs, types).

La commune est ciblée par `admin_level=8`. Sans ça, `area["name"="Lyon"]`
sélectionne la Métropole et ramène 1072 résultats au lieu de 586.

**CSV** — parseur maison tolérant : séparateur détecté (`;`, `,`, tabulation),
BOM, guillemets échappés, retours à la ligne dans les champs, synonymes de
colonnes (`société` / `nom` / `entreprise`…).

Les deux importeurs dédupliquent via la même clé normalisée
([`src/lib/dedupe.ts`](src/lib/dedupe.ts)), donc réimporter la même ville
n'ajoute rien.

Google Places n'est pas utilisé — c'est payant, et l'outil doit rester gratuit.

### Enrichissement

`recherche-entreprises.api.gouv.fr` (SIRENE + dirigeants INPI). Quand OSM a
fourni un SIRET — environ 45 % des établissements français — la recherche se
fait par identifiant exact. Sinon, recherche floue avec un score de similarité
et un seuil de confiance à 0,6 : en dessous, on préfère ne rien écrire plutôt
qu'attribuer les données d'une autre société.

### Scoring

Volontairement **déterministe**, sans LLM : un score doit être reproductible et
explicable. Le LLM rédige le résumé, il ne note pas.

Le score est la somme de signaux pondérés, bornée à [0, 10] :

| Signal | Poids |
| --- | --- |
| Aucun site web | +5 |
| Adresse de site invalide | +4,5 |
| Pas de balise viewport (non adapté au mobile) | +3 |
| Pas de HTTPS | +2,5 |
| Contenu daté | +2 |
| Établie depuis longtemps / effectif confortable | +2 |
| Balises HTML obsolètes (`font`, `center`, `marquee`) | +1,5 |
| Email de contact connu | +1,5 |
| Réponse lente | +1 |
| Ni email ni téléphone | −2 |
| **Entreprise cessée au registre** | **score forcé à 0** |

La cessation d'activité est une règle absolue, pas un poids négatif : aucune
accumulation de bonus ne doit rattraper une entreprise fermée.

Paliers d'affichage : **≥8 PRIORITAIRE · ≥5 À QUALIFIER · ≥3 FAIBLE · ÉCARTÉ**.

Deux garde-fous contre les faux positifs « pas de site » :

- **Recherche de site non déclaré** — beaucoup d'entreprises ont un site que OSM
  ignore. Quatre variantes de domaine sont sondées en parallèle à partir du nom.
  Les redirections vers un autre domaine sont rejetées : sinon `Groupe Mercure`
  se voyait attribuer `mercure.accor.com`.
- **Détection de franchise** — un agent Century 21 n'a pas de site propre, il a
  une page sur celui du réseau. L'enseigne est reconnue et le prospect n'est pas
  crédité du bonus « aucun site ».

Toute requête sortante passe par un garde SSRF : résolution DNS, rejet des
plages privées, revalidation à chaque redirection.

---

## Stack

| Élément | Détail |
| --- | --- |
| Framework | Next.js 16.2.7 (App Router), React 19.2.4, TypeScript 5 |
| Base de données | PostgreSQL (Supabase), Prisma 7.8 + `@prisma/adapter-pg` |
| Auth | Supabase Auth, jeton Bearer vérifié côté serveur |
| Styles | Tailwind CSS 4 |
| LLM | Groq SDK — `openai/gpt-oss-120b` |
| Emails | Nodemailer (SMTP) |
| Graphiques | Recharts |
| Hébergement | Render (plan gratuit, région Francfort, Node 22) |
| APIs externes | Overpass (OSM), `recherche-entreprises.api.gouv.fr` |

Volume : 17 routes API, 11 pages, 14 modules `lib`, 6 modèles Prisma,
~5 700 lignes de TS/TSX.

---

## Démarrage

```bash
npm install
# créer .env.local (voir le tableau ci-dessous)
npx prisma migrate deploy   # applique les 4 migrations
npm run seed:secteurs       # 8 secteurs d'activité + leurs arguments
npm run dev
```

L'application est servie à la racine (`/`). Il n'y a pas de page d'inscription :
un seul compte existe, créé à la main dans le tableau de bord Supabase. Voir
« Modèle d'accès ».

### Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Postgres. **Utiliser le pooler Supavisor** (port 5432), pas la connexion directe : celle-ci est en IPv6 uniquement et Render ne route pas l'IPv6. |
| `TACTIQ_USER_ID` | UUID Supabase du propriétaire. Sans elle, **toutes** les routes authentifiées répondent 401. |
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, côté navigateur |
| `SUPABASE_SERVICE_ROLE_KEY` | Vérification du jeton côté serveur. Ne jamais exposer au client. |
| `GROQ_API_KEY` | Génération des emails et des résumés |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM` | Envoi réel. Absentes, le bouton « Envoyer » refuse explicitement au lieu d'échouer en silence. |

Avec Gmail : `smtp.gmail.com`, port `587`, et un **mot de passe d'application**
(2FA requise sur le compte Google), pas le mot de passe du compte.

### Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | `prisma generate` puis build Next |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run seed:secteurs` | Insère/met à jour les 8 secteurs (idempotent) |

---

## Modèle d'accès

Outil strictement personnel. L'autorisation tient en une fonction,
[`getUser()`](src/lib/auth.ts) :

1. Lecture du jeton Bearer de la requête.
2. Vérification auprès de Supabase avec la clé service-role.
3. Comparaison de l'ID retourné avec `TACTIQ_USER_ID`.

Fermé par défaut : si `TACTIQ_USER_ID` est absente, l'accès est refusé plutôt
que laissé ouvert. Chaque requête Prisma est en plus filtrée sur `user_id`, et
`userOwnsProspect()` / `userOwnsCampagne()` valident les identifiants reçus dans
les corps de requête.

L'allowlist ne protège que les routes de cette application. Elle n'empêche pas
la création d'un compte côté Supabase, qui se fait directement depuis le
navigateur avec la clé anonyme — publique par nature. **Il faut donc désactiver
les inscriptions dans Supabase** : Authentication > Sign In / Providers >
« Allow new users to sign up ». Sans ce réglage, un inconnu peut créer un compte
dans le projet : il n'accèdera à aucune donnée (toutes les routes répondent 401),
mais il consomme le quota d'emails d'authentification. La page `/register` a été
supprimée de l'application pour la même raison.

**L'authentification par cookies a été abandonnée : ne pas y revenir.** Le jeton
vit dans le `localStorage`, il n'accompagne donc pas les navigations du
navigateur. C'est pourquoi [`src/proxy.ts`](src/proxy.ts) ne fait aucune
authentification — il n'a aucun moyen de savoir qui est connecté. Il se limite à
poser `X-Robots-Tag: noindex, nofollow, noarchive`.

---

## Déploiement

[`render.yaml`](render.yaml) est un blueprint : « New > Blueprint » sur ce dépôt
suffit à créer le service. Les secrets sont marqués `sync: false` et se
saisissent dans l'interface — ce fichier est public.

```yaml
buildCommand: npm ci && npx prisma migrate deploy && npm run build
```

`migrate deploy` s'exécute **avant** que la nouvelle version ne démarre : une
migration qui échoue bloque le déploiement, ce qui est préférable à du code
interrogeant une colonne absente.

### Contraintes du gratuit

- **Render** — 512 Mo de RAM, 0,1 CPU, mise en veille après 15 min
  d'inactivité (jusqu'à 60 s au réveil). Les routes longues exportent
  `maxDuration = 60`.
- **Supabase** — un projet gratuit se met en pause après 7 jours sans requête,
  et sa reprise est manuelle. [Un workflow GitHub Actions](.github/workflows/keep-alive.yml)
  appelle `/api/secteurs` chaque jour à 06h17 UTC, avec 3 tentatives espacées
  pour absorber le réveil de Render. L'adresse de l'instance vient du **secret**
  Actions `CRM_URL`, à définir dans Settings > Secrets and variables >
  Actions. Un secret et non une variable : ce dépôt est public, donc ses
  journaux d'exécution le sont aussi, et GitHub ne masque que les secrets.
  Sans ce secret, le workflow échoue franchement au lieu de laisser Supabase
  s'endormir en silence.

---

## Conventions du dépôt

Voir [AGENTS.md](AGENTS.md). En résumé, ce qui surprend :

- **Next 16** — `middleware.ts` s'appelle désormais `proxy.ts` et exporte
  `proxy()`. Les pages applicatives sont dans le groupe de routes `(app)`.
  Consulter `node_modules/next/dist/docs/` avant d'écrire du code : cette
  version a des ruptures d'API.
- **Prisma 7** — la datasource est déclarée dans
  [`prisma.config.ts`](prisma.config.ts), pas dans le schéma. Ce fichier charge
  `.env.local` puis `.env` (le premier chargé gagne), parce que dotenv ne lit
  pas `.env.local` de lui-même alors que Next le fait.
- **Tailwind 4** — les jetons sont redéfinis dans `@theme`, dans
  [`globals.css`](src/app/globals.css). Tous les arrondis y sont neutralisés
  (`--radius-*: 0px`) : le parti pris visuel est anguleux, avec des biseaux via
  les classes `.biseau` et `.biseau-cadre`.
- **Le modèle Groq est centralisé** dans [`src/lib/groq.ts`](src/lib/groq.ts).
  Il avait été codé en dur en deux endroits, et sa disparition du catalogue a
  cassé la génération sans message clair. Ne pas le dupliquer.
- **Budget de jetons** — le canal `reasoning` du modèle consomme le budget avant
  la réponse. 200 jetons pour deux phrases renvoyaient du vide ; il en faut
  ~1200.
- **Le thème** vient du profil utilisateur, source unique de vérité
  ([`src/lib/themes.ts`](src/lib/themes.ts), 6 palettes, `tactique` par défaut).
- **Les classes de caractères d'accents** s'écrivent `/[\u0300-\u036f]/g`, jamais
  avec les caractères combinants littéraux — invisibles dans un éditeur,
  impossibles à corriger ensuite.

⚠️ En développement, `.env.local` pointe sur **la base de production**. Une
migration appliquée en local est appliquée en production.

---

## Dette connue

- La colonne `Prospect.proposition_ia` existe en base mais n'est lue ni écrite
  par aucun code. Elle attend la fonctionnalité « signaux LLM + proposition
  commerciale » (le LLM produit des signaux plafonnés à ±2, trois au maximum,
  jamais le score lui-même).
- Responsive à reprendre : l'interface est conçue pour un écran large.
- Le tableau de bord, les campagnes, les emails et les paramètres utilisent
  encore l'ancien vocabulaire visuel, d'avant la refonte.
- Aucun test automatisé. ~26 avertissements ESLint, majoritairement des `any`.
- Pas de limitation de débit sur les appels Groq.
