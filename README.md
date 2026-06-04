# Portfolio Thomas Leloup — Next.js

## 🚀 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.local.example .env.local

# 3. Remplir .env.local avec tes vraies valeurs (voir ci-dessous)

# 4. Créer les tables dans Neon
# → neon.tech → ton projet → SQL Editor → coller schema.sql → Run

# 5. Générer le hash de ton mot de passe admin
node -e "require('bcryptjs').hash('Thom@sllp1112',10).then(console.log)"
# → Copier le résultat dans schema.sql ligne INSERT INTO admin_users
# → Re-exécuter le INSERT dans Neon SQL Editor

# 6. Lancer en local
npm run dev
# → http://localhost:3000
```

## 📋 Variables d'environnement (.env.local)

| Variable | Où la trouver |
|----------|--------------|
| `DATABASE_URL` | neon.tech → ton projet → Connection Details → Nodejs |
| `JWT_SECRET` | generate-secret.vercel.app/32 |
| `ADMIN_PASSWORD_HASH` | `node -e "require('bcryptjs').hash('TonMdp',10).then(console.log)"` |
| `SMTP_USER` | Ton adresse Gmail |
| `SMTP_PASS` | Gmail → Compte → Sécurité → Mots de passe d'application |
| `CONTACT_EMAIL` | leloupthomas.pro@gmail.com |

## 🌐 Déploiement Vercel

```bash
# Pousser sur GitHub
git init && git add . && git commit -m "init portfolio"
git remote add origin https://github.com/TON_COMPTE/portfolio-thomas.git
git push -u origin main

# Sur Vercel
# → Import le repo GitHub
# → Ajouter les variables d'environnement (Settings → Environment Variables)
# → Deploy
```

## 📡 API Routes

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/projects` | GET | Non | Liste tous les projets |
| `/api/projects` | POST | Oui | Créer un projet |
| `/api/projects/[id]` | PUT | Oui | Modifier un projet |
| `/api/projects/[id]` | DELETE | Oui | Supprimer un projet |
| `/api/tags` | GET | Non | Liste tous les tags |
| `/api/tags` | POST | Oui | Créer/modifier un tag |
| `/api/tags` | DELETE | Oui | Supprimer un tag |
| `/api/testimonials` | GET | Non | Liste les témoignages |
| `/api/testimonials` | POST | Oui | Créer/modifier un témoignage |
| `/api/auth/login` | POST | Non | Login admin → retourne JWT |
| `/api/contact` | POST | Non | Envoie un email |
| `/api/analytics` | POST | Non | Enregistre un événement |
| `/api/analytics` | GET | Oui | Récupère les stats |
