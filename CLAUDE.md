# Diagnostic Running — Contexte pour Claude Code

## Qu'est-ce que ce projet ?
Application web mobile de diagnostic des blessures de course à pied. L'utilisateur répond à un interrogatoire clinique adaptatif (piloté par IA), et reçoit un diagnostic complet avec protocole de reprise et diagnostic différentiel argumenté.

## Architecture
```
diagnostic-running/
├── api/
│   ├── chat.js          ← Fonction serverless Vercel — proxy vers Anthropic API
│   ├── checkout.js      ← Crée une session Stripe Checkout (paywall 1€)
│   └── verify.js        ← Vérifie le paiement au retour de Stripe
├── public/
│   └── index.html       ← Application complète (HTML/CSS/JS vanilla, mobile-first)
├── vercel.json          ← Routing Vercel
├── package.json         ← Dépendances (@anthropic-ai/sdk + stripe)
└── CLAUDE.md            ← Ce fichier
```

## Déploiement
- **Hébergeur** : Vercel (compte existant)
- **Dépôt** : GitHub (compte existant)
- **Modèle utilisé** : `claude-sonnet-4-6` par défaut (configurable via `CLAUDE_MODEL`), température 0.3 pour un raisonnement clinique stable. Pour une précision maximale : `CLAUDE_MODEL=claude-opus-4-8`.

### Variables d'environnement (Vercel → Settings → Environment Variables)
| Variable | Rôle | Obligatoire |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (diagnostic IA) | ✅ Oui |
| `CLAUDE_MODEL` | Surcharge du modèle (déf. `claude-sonnet-4-6`) | Non |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (paywall 1€). **Si absente → mode démo** : le programme se débloque sans paiement (pour tester l'UX) | Non |
| `PREMIUM_PRICE_CENTS` | Prix en centimes (déf. `100` = 1€) | Non |
| `PREMIUM_CURRENCY` | Devise (déf. `eur`) | Non |

> **Activer les vrais paiements** : créer un compte Stripe, copier la clé secrète (`sk_live_…` ou `sk_test_…`) dans `STRIPE_SECRET_KEY`. Aucune autre config nécessaire (le prix est créé à la volée). Tant que la clé n'est pas posée, l'app fonctionne en mode démo.

## Comment ça fonctionne
1. `public/index.html` : interface chat mobile. Envoie les messages à `/api/chat`
2. `api/chat.js` : fonction serverless qui reçoit `{messages: [...]}`, appelle l'API Anthropic avec le SYSTEM_PROMPT, retourne la réponse
3. Le modèle répond en JSON structuré (types: `question`, `multi_question`, `test`, `diagnosis`)
4. Le frontend parse le JSON et affiche l'interface appropriée

## Format JSON des réponses du modèle

### Question simple
```json
{"type":"question","phase":1,"text":"...","choices":["...","Autre / aucune de ces réponses"],"multi_select":false,"progress":15}
```

### Questions groupées (multi_question)
```json
{"type":"multi_question","phase":2,"intro":"...","questions":[{"id":"q1","text":"...","choices":["..."],"multi_select":false}],"progress":30}
```

### Test clinique
```json
{"type":"test","phase":4,"name":"Noble compression test","rationale":"Discrimine BIT vs ménisque externe","instruction":"...","choices":["Positif","Négatif","Partiel","Impossible"],"progress":75}
```

### Diagnostic final
```json
{
  "type": "diagnosis",
  "summary": "Le scénario le plus probable est une/un [PATHOLOGIE]. [2 phrases.]",
  "pathologies": [{
    "name": "...",
    "tissue_type": "tendon|bursa|nerve|ligament|muscle|bone|cartilage|vascular|systemic|other",
    "confidence": 82,
    "likelihood": "high|medium|low",
    "description": "...",
    "location": "...",
    "mechanism": "...",
    "differentials": "...",
    "tests": "...",
    "specialist": "...",
    "immediate_action": "...",
    "plan_b": {
      "name": "Diagnostic alternatif",
      "arguments_for": "...",
      "arguments_against": "..."
    },
    "phases": [{"number":1,"title":"...","duration":"...","objectives":"...","allowed":"...","forbidden":"..."}],
    "exercises": [{"name":"...","category":"mobility|strengthening|core|proprioception|stretching|running|cardio","phase":"Phase X","goal":"...","how":"...","sets":"...","reps":"...","frequency":"...","progression":"...","caution":"..."}],
    "return_to_run": {
      "prerequisites": "Critères à valider avant de commencer",
      "program": [{"week":"S1","session":"...","frequency":"...","notes":"..."}],
      "rules": ["..."]
    }
  }],
  "red_flags": ["..."],
  "recommendations": ["..."]
}
```

## Ce qui a déjà été fait
- ✅ Interface chat mobile (bulles, phases, barre de progression)
- ✅ Interrogatoire adaptatif piloté par IA (questions selon les réponses)
- ✅ Questions groupées (multi_question) pour réduire les appels API
- ✅ Sélection multiple (multi_select) avec cases à cocher
- ✅ Tests cliniques ciblés avec raisonnement affiché
- ✅ Diagnostic avec confidence bar et badge tissu
- ✅ Plan B (diagnostic différentiel argumenté) en accordéon
- ✅ Plan de reprise en phases colorées
- ✅ **Programme de reprise enrichi** : 5 à 8 exercices par pathologie, catégorisés (mobilité, renforcement, gainage, proprioception, étirement, course, cardio)
- ✅ **Bibliothèque d'exercices de référence** dans le prompt pour les pathologies les plus fréquentes (BIT, SFP, fasciose, Achille, périostite, etc.)
- ✅ **Protocole de reprise course (walk-run)** avec paliers S1→S6+, prérequis et règles d'or
- ✅ **Suivi de progression** : cases à cocher par exercice avec persistance localStorage et barre de progression
- ✅ **Filtres par catégorie** d'exercices
- ✅ Accordéons "Programme de reprise" et "Reprise course" ouverts par défaut pour le diagnostic principal
- ✅ Red flags et recommandations
- ✅ Gestion JSON tronqué (max_tokens) avec continuation automatique
- ✅ "Autre / aucune de ces réponses" dans tous les choix
- ✅ Prompt épidémiologique (BIT/TFL 35%, SFP 25%...) avec priors bayésiens
- ✅ 160+ pathologies couvertes dont toutes les neuropathies périphériques
- ✅ **Modèle plus capable + température 0.3** et **bloc de calibration de la confiance** (anti-fermeture prématurée, confiance honnête, cohérence multi-axes, sécurité red flags) pour des diagnostics plus justes
- ✅ **Monétisation freemium (paywall Stripe 1€)** : le diagnostic + différentiel + red flags restent GRATUITS ; le **programme de rééducation complet** (exercices détaillés, plan par phases, reprise walk-run) se débloque pour 1€ (paiement unique, accès à vie sur l'appareil)
- ✅ **Bannière d'offre + teasers verrouillés** (aperçu flouté, nombre d'exercices/phases/paliers) pour maximiser la conversion
- ✅ **Persistance du diagnostic** pendant la redirection Stripe + vérification du paiement au retour
- ✅ **Export PDF / impression** du programme (bonus premium)
- ✅ **Mode démo** automatique si Stripe non configuré

## Modèle économique
- **Gratuit** : interrogatoire adaptatif, diagnostic principal, diagnostics différentiels argumentés (plan B), localisation, mécanisme, tests en cabinet, spécialiste à consulter, red flags, recommandations. → crée la confiance et la valeur perçue.
- **Premium 1€ (one-shot)** : programme de rééducation complet = exercices guidés (tempo/séries/reps/progression), plan de reprise par phases, programme walk-run de retour à la course, suivi de progression, export PDF.
- **Pistes d'évolution commerciale** : prix de lancement barré (ex. 4,99€ → 1€), pack multi-diagnostics, abonnement « suivi illimité + rappels », partenariats kinés/podologues (géoloc), version EN.

## Prompt clinique — points clés
Le SYSTEM_PROMPT dans api/chat.js contient :
1. **Priors épidémiologiques** : BIT/TFL exploré EN PREMIER pour genou externe, SFP pour genou antérieur, etc.
2. **Arbre décisionnel obligatoire** par zone avec questions discriminantes
3. **Trois groupes de releveurs** distincts : tibial antérieur (dorsiflexion), tibial postérieur (voûte), fibulaires (latéraux)
4. **Tests cliniques complets** : Noble, Ober, Zohlen, McMurray, Lachman, FADIR, Pace, Thompson, Windlass, etc.
5. **Discriminant périostite vs tendinopathie** : douleur diffuse >5cm = os / localisée <3cm = tendon

## Améliorations possibles
- [ ] Persistance des diagnostics (base de données / localStorage)
- [ ] Mode "historique" pour revoir les diagnostics passés
- [ ] Export PDF du diagnostic
- [ ] Internationalisation (EN)
- [ ] Illustrations anatomiques pour les tests cliniques
- [ ] Score de probabilité bayésien visible pendant l'interrogatoire
- [ ] Intégration avec une API de géolocalisation des professionnels de santé

## Instructions de déploiement
1. `git clone` ou `git pull` sur le dépôt GitHub
2. Remplacer les fichiers par ceux-ci
3. `npm install` pour installer @anthropic-ai/sdk
4. Sur Vercel : ajouter `ANTHROPIC_API_KEY` dans Environment Variables
5. `vercel --prod` ou push sur la branche main (déploiement automatique)

## Clé API
L'API Anthropic est payante (pay-per-use). Alternatives avec tier gratuit :
- **Google Gemini** : tier gratuit généreux, compatible avec l'architecture (changer le SDK)
- **Mistral AI** : modèle français, tier gratuit limité
- **Groq** : inférence très rapide, modèles open source gratuits (Llama, Mixtral)
- **Scaleway Generative APIs** : 1M tokens gratuits au démarrage, hébergé en France

Pour utiliser Groq (gratuit) : remplacer dans api/chat.js le client Anthropic par le client Groq (compatible OpenAI), changer le modèle pour `llama-3.3-70b-versatile` ou `mixtral-8x7b-32768`.
