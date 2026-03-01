# 05 — UI/UX Wireframes (Text-based)

High-level page layouts for every key screen. Organized by portal (role).

---

## Global Shell

### Login Page
```
┌──────────────────────────────────────────────┐
│                                              │
│              [EduCore Logo]                  │
│                                              │
│         Connectez-vous à votre espace        │
│                                              │
│    ┌──────────────────────────────────┐       │
│    │ Email                           │       │
│    └──────────────────────────────────┘       │
│    ┌──────────────────────────────────┐       │
│    │ Mot de passe              [👁]  │       │
│    └──────────────────────────────────┘       │
│    [Se connecter]                            │
│                                              │
│    Mot de passe oublié ?                     │
│    ─────────── ou ───────────                │
│    [Se connecter avec Microsoft]             │
│                                              │
└──────────────────────────────────────────────┘
```

### App Shell (Authenticated)
```
┌─────────────────────────────────────────────────────┐
│  TOPBAR                                             │
│  [☰]  EduCore  [🔍 Rechercher...]  [🔔 3]  [👤 JD]│
├────────────┬────────────────────────────────────────┤
│  SIDEBAR   │  BREADCRUMB: Accueil > Module > Page   │
│  (role-    │                                        │
│  dependent)│  PAGE TITLE            [+ Action btn]  │
│            │  ────────────────────────────────────   │
│  📊 Accueil│                                        │
│  📅 EDT    │  CONTENT AREA                          │
│  📋 Notes  │  (varies per page)                     │
│  📝 Devoirs│                                        │
│  📨 Msgs   │                                        │
│  📁 Docs   │                                        │
│  ────────  │                                        │
│  ⚙ Réglage│                                        │
│            │                                        │
└────────────┴────────────────────────────────────────┘

MOBILE (< 768px):
┌─────────────────────────────┐
│ [☰] EduCore     [🔔 3] [👤]│
├─────────────────────────────┤
│                             │
│  CONTENT AREA               │
│  (full width)               │
│                             │
├─────┬─────┬─────┬─────┬────┤
│ 📊  │ 📅  │ 📋  │ 📨  │ ⋯ │
│Home │ EDT │Notes│ Msgs│More│
└─────┴─────┴─────┴─────┴────┘
```

---

## Teacher Portal

### Teacher — Timetable
```
┌──────────────────────────────────────────────────┐
│  Mon emploi du temps     [◀ Sem. 10 ▶] [Mois]   │
├──────┬────────┬────────┬────────┬────────┬──────┤
│      │ Lundi  │ Mardi  │ Mercr. │ Jeudi  │ Vend.│
├──────┼────────┼────────┼────────┼────────┼──────┤
│ 8h00 │ Math   │        │ Math   │        │ Math │
│      │ 6°A    │        │ 5°B    │        │ 4°C  │
│      │ S.201  │        │ S.105  │        │ S.201│
├──────┼────────┼────────┼────────┼────────┼──────┤
│ 9h00 │ Math   │ Math   │        │ Math   │      │
│      │ 5°B    │ 3°A    │        │ 6°A    │      │
│      │ S.105  │ S.302  │        │ S.201  │      │
├──────┼────────┼────────┼────────┼────────┼──────┤
│10h00 │ ─────  │ ─────  │ ─────  │ ─────  │─────│
│10h15 │ Math   │        │        │ Math   │ Math │
│      │ 4°C    │        │        │ 3°A    │ 6°A  │
│      │ S.201  │        │        │ S.302  │ S.201│
├──────┼────────┼────────┼────────┼────────┼──────┤
│11h15 │        │ Math   │        │        │      │
│      │        │ 4°C    │        │        │      │
└──────┴────────┴────────┴────────┴────────┴──────┘
│  Click session → [📋 Appel] [📝 Cahier] [📊 Notes]│
└──────────────────────────────────────────────────┘
```

### Teacher — Gradebook Entry
```
┌──────────────────────────────────────────────────────┐
│  Notes — 6°A Mathématiques — Trimestre 2             │
│  [+ Nouvelle évaluation]                             │
├──────────────────────────────────────────────────────┤
│  ÉVALUATIONS                                         │
│  ┌─────────────────┬──────┬──────┬──────┬──────────┐ │
│  │                 │Ctrl.3│Exo.12│Ctrl.2│ Moyenne   │ │
│  │                 │/20 c2│/20 c1│/20 c2│           │ │
│  ├─────────────────┼──────┼──────┼──────┼──────────┤ │
│  │ BERNARD Lucas   │ 15   │ 16   │ 12   │ 14.0     │ │
│  │ DUPONT Emma     │ 18   │ 17   │ 16   │ 17.0     │ │
│  │ FAURE Léo       │ ABS  │ 11   │ 08   │ 09.5     │ │
│  │ MARTIN Chloé    │ 12   │ 14   │ 10   │ 11.6     │ │
│  │ MOREAU Hugo     │ 09   │ 08   │ 07   │ 08.2     │ │
│  │ ...             │      │      │      │          │ │
│  ├─────────────────┼──────┼──────┼──────┼──────────┤ │
│  │ Moy. classe     │ 13.2 │ 12.8 │ 11.5 │ 12.4     │ │
│  │ Min             │ 05   │ 04   │ 03   │          │ │
│  │ Max             │ 19   │ 18   │ 18   │          │ │
│  └─────────────────┴──────┴──────┴──────┴──────────┘ │
│  [💾 Enregistrer] [📢 Publier] [📥 Exporter CSV]     │
└──────────────────────────────────────────────────────┘
```

### Teacher — Cahier de textes Entry
```
┌──────────────────────────────────────────────────┐
│  Cahier de textes — 6°A Math — Lundi 03/03 8h00 │
├──────────────────────────────────────────────────┤
│  CONTENU DE LA SÉANCE                            │
│  ┌──────────────────────────────────────────────┐│
│  │ [Rich text editor]                           ││
│  │ Chapitre 4 — Introduction aux fractions     ││
│  │ - Définition et vocabulaire                 ││
│  │ - Fractions sur la droite graduée           ││
│  └──────────────────────────────────────────────┘│
│  📎 Fichiers joints: [+ Ajouter]                 │
│  └── cours_ch4_fractions.pdf ✕                   │
│                                                  │
│  TRAVAIL À FAIRE                                 │
│  Pour le: [Jeudi 06/03 ▼]                       │
│  ┌──────────────────────────────────────────────┐│
│  │ [Rich text editor]                           ││
│  │ Exercices 1 à 5 page 124                    ││
│  └──────────────────────────────────────────────┘│
│  ☑ Autoriser le rendu en ligne                   │
│  📎 Fichiers joints: [+ Ajouter]                 │
│                                                  │
│  [💾 Enregistrer]  [Annuler]                     │
└──────────────────────────────────────────────────┘
```

### Teacher — Roll Call
```
┌──────────────────────────────────────────────────┐
│  Appel — 6°A — Math — Lun 03/03 8h00            │
│  [Tous présents] [Enregistrer]                   │
├──────────────────────────────────────────────────┤
│  ┌───────────────────┬─────┬─────┬─────┬───────┐│
│  │ Élève             │  P  │  A  │  R  │ Motif ││
│  ├───────────────────┼─────┼─────┼─────┼───────┤│
│  │ BERNARD Lucas     │ (●) │ ( ) │ ( ) │       ││
│  │ DUPONT Emma       │ (●) │ ( ) │ ( ) │       ││
│  │ FAURE Léo         │ ( ) │ (●) │ ( ) │ [___] ││
│  │ MARTIN Chloé      │ ( ) │ ( ) │ (●) │ 5 min ││
│  │ MOREAU Hugo       │ (●) │ ( ) │ ( ) │       ││
│  │ ...               │     │     │     │       ││
│  └───────────────────┴─────┴─────┴─────┴───────┘│
│                                                  │
│  Résumé: 26P / 1A / 1R                          │
│  [💾 Enregistrer l'appel]                        │
└──────────────────────────────────────────────────┘
```

---

## Student Portal

### Student — Dashboard
```
┌──────────────────────────────────────────────────┐
│  Bonjour Lucas !                    Mar 01, 2026 │
├────────────────────────┬─────────────────────────┤
│  EMPLOI DU TEMPS       │  TRAVAIL À FAIRE        │
│  ┌──────────────────┐  │  📕 Math: Ex p.124 (06/03)│
│  │ 8h Français      │  │  📗 Franç: Rédac. (10/03) │
│  │ 9h Mathématiques │  │  📘 Hist: Lire ch.8 (11/03)│
│  │ 10h Hist-Géo     │  │  [Voir tout →]            │
│  │ 11h EPS          │  │                           │
│  │ 13h30 Anglais    │  │                           │
│  │ 14h30 SVT        │  │                           │
│  └──────────────────┘  │                           │
├────────────────────────┼─────────────────────────┤
│  DERNIÈRES NOTES       │  MESSAGES (2 non lus)    │
│  Math: 15/20 ↑         │  📩 M. Dupont: "Bonjour…"│
│  Franç: 12/20 →        │  📩 Vie scolaire: "Info…"│
│  Hist: 16/20 ↑         │                          │
│  ─────────────         │  MOY. GÉNÉRALE           │
│  Moy. gén: 13.8/20    │  ██████████████░░ 13.8   │
└────────────────────────┴──────────────────────────┘
```

### Student — My Grades
```
┌──────────────────────────────────────────────────┐
│  Mes notes              Trimestre: [T2 ▼]        │
├──────────────────────────────────────────────────┤
│  📕 Mathématiques                    Moy: 14.5   │
│  ├── Contrôle Ch.3     15/20  c.2  28/02        │
│  ├── Exercice maison   16/20  c.1  21/02        │
│  └── Contrôle Ch.2    12/20  c.2  07/02        │
│      Classe: 13.2 | Min: 5 | Max: 19            │
│                                                  │
│  📗 Français                         Moy: 12.2   │
│  ├── Dictée            14/20  c.1  27/02        │
│  ├── Rédaction         10/20  c.2  20/02        │
│  └── Grammaire         13/20  c.1  10/02        │
│      Classe: 11.8 | Min: 4 | Max: 18            │
│                                                  │
│  📘 Histoire-Géo                     Moy: 16.0   │
│  └── Contrôle          16/20  c.2  25/02        │
│                                                  │
│  ───────────────────────────────────────────     │
│  MOYENNE GÉNÉRALE: 13.8/20                       │
│  Rang: 5ème / 28                                 │
└──────────────────────────────────────────────────┘
```

---

## Parent Portal

### Parent — Dashboard
```
┌──────────────────────────────────────────────────┐
│  Espace parent          Enfant: [Lucas ▼] [Emma ▼]│
├────────────────────────┬─────────────────────────┤
│  AUJOURD'HUI — Lucas   │  ALERTES                │
│  ┌──────────────────┐  │  🔴 Absence 28/02 non   │
│  │ 8h Français      │  │     justifiée            │
│  │ 9h Mathématiques │  │  📝 Nouvelle note: Math  │
│  │ 10h Hist-Géo     │  │  📨 Message de M.Dupont  │
│  │ 11h EPS          │  │                          │
│  └──────────────────┘  │  [Justifier l'absence →] │
├────────────────────────┼─────────────────────────┤
│  NOTES RÉCENTES        │  VIE SCOLAIRE           │
│  Math: 15/20           │  Absences: 2 ce trim.   │
│  Franç: 12/20          │  Retards: 1 ce trim.    │
│  Hist: 16/20           │  Sanctions: 0           │
│  Moy: 13.8/20         │                          │
├────────────────────────┼─────────────────────────┤
│  DEVOIRS À VENIR       │  PAIEMENTS              │
│  Ex. Math p.124 (06/03)│  Fact. #1234: €450      │
│  Rédac. Franç (10/03) │  Échéance: 15/03        │
│  Lire Hist ch.8(11/03)│  [💳 Payer en ligne]     │
└────────────────────────┴─────────────────────────┘
```

### Parent — Messaging
```
┌──────────────────────────────────────────────────┐
│  Messagerie                    [+ Nouveau message]│
├──────────────────┬───────────────────────────────┤
│  CONVERSATIONS   │  M. Dupont — Math             │
│                  │  ────────────────────────────  │
│  ● M. Dupont    │  M. Dupont (27/02 14:30):     │
│    Re: Lucas...  │  "Bonjour Mme Bernard,         │
│                  │   Lucas a bien progressé en    │
│  ○ Vie scolaire │   algèbre ce trimestre..."     │
│    Info sortie   │                                │
│                  │  Vous (27/02 18:15):           │
│  ○ Administration│  "Merci M. Dupont, nous        │
│    Facture       │   encourageons Lucas à..."     │
│                  │                                │
│                  │  ┌──────────────────────────┐  │
│                  │  │ Votre réponse...         │  │
│                  │  │                          │  │
│                  │  └──────────────────────────┘  │
│                  │  📎 Joindre  [Envoyer]         │
└──────────────────┴───────────────────────────────┘
```

---

## Admin Portal

### Admin — Users Management
```
┌──────────────────────────────────────────────────────┐
│  Utilisateurs           [+ Ajouter] [📥 Importer CSV]│
│  [Tous ▼] [Enseignants ▼] [Élèves ▼] [Parents ▼]   │
│  🔍 Rechercher...                                    │
├──────────────────────────────────────────────────────┤
│  ┌──────┬────────────────┬──────────┬──────┬───────┐ │
│  │ #    │ Nom            │ Rôle     │ Stat │ Actions│ │
│  ├──────┼────────────────┼──────────┼──────┼───────┤ │
│  │ 1    │ DUPONT Marc    │ Enseign. │ ✅   │ [✏][🗑]│ │
│  │ 2    │ MARTIN Sophie  │ Enseign. │ ✅   │ [✏][🗑]│ │
│  │ 3    │ BERNARD Lucas  │ Élève    │ ✅   │ [✏][🗑]│ │
│  │ 4    │ BERNARD Anne   │ Parent   │ ✅   │ [✏][🗑]│ │
│  │ 5    │ FAURE Léo      │ Élève    │ ⏸    │ [✏][🗑]│ │
│  │ ...  │                │          │      │       │ │
│  └──────┴────────────────┴──────────┴──────┴───────┘ │
│  Page 1 of 12  [◀ 1 2 3 ... 12 ▶]                   │
└──────────────────────────────────────────────────────┘
```

### Admin — Class Structure
```
┌──────────────────────────────────────────────────┐
│  Classes & Groupes       [+ Nouvelle classe]     │
│  Année: [2025-2026 ▼]   Campus: [Principal ▼]   │
├──────────────────────────────────────────────────┤
│  📁 6ème                                         │
│  ├── 6°A  (28 élèves, 12 enseignants)  [✏]     │
│  ├── 6°B  (27 élèves, 12 enseignants)  [✏]     │
│  └── 6°C  (29 élèves, 11 enseignants)  [✏]     │
│                                                  │
│  📁 5ème                                         │
│  ├── 5°A  (26 élèves)  [✏]                     │
│  └── 5°B  (28 élèves)  [✏]                     │
│                                                  │
│  📁 4ème                                         │
│  ├── 4°A  (27 élèves)  [✏]                     │
│  └── 4°C  (25 élèves)  [✏]                     │
│                                                  │
│  📁 3ème                                         │
│  └── 3°A  (30 élèves)  [✏]                     │
└──────────────────────────────────────────────────┘
```

---

## Tutoring Portal

### Tutor — Calendar (see 03-TUTORING-SCOPE for full wireframe)

### Parent (Tutoring) — Book Session
```
┌──────────────────────────────────────────────────┐
│  Réserver une séance pour Lucas                  │
├──────────────────────────────────────────────────┤
│  Tuteur: M. Dupont | Matière: Math               │
│  Forfait: Pack 10h — 7h restantes               │
│                                                  │
│  Choisissez un créneau:                          │
│  ┌──────────────────────────────────────────┐    │
│  │       Lun 10  Mar 11  Mer 12  Jeu 13    │    │
│  │ 9h    ░       ░               ░          │    │
│  │ 10h   ░                       ░          │    │
│  │ 11h   ░       ░       ░       ░          │    │
│  │ 14h                   ░                  │    │
│  │ 15h   ░                       ░          │    │
│  │ 16h   ░                                  │    │
│  └──────────────────────────────────────────┘    │
│  ░ = disponible  (click to select)               │
│                                                  │
│  Sélectionné: Lundi 10 à 11h00 (1h)             │
│  Lieu: (●) En ligne  ( ) Sur place               │
│  Récurrence: ( ) Unique  (●) Hebdomadaire        │
│                                                  │
│  [Confirmer la réservation]                      │
└──────────────────────────────────────────────────┘
```

### Center Admin — Billing Overview
```
┌──────────────────────────────────────────────────┐
│  Facturation              [+ Nouvelle facture]   │
│  Mois: [Mars 2026 ▼]  Statut: [Tous ▼]          │
├──────────────────────────────────────────────────┤
│  ┌──────┬────────────┬────────┬────────┬───────┐ │
│  │ #    │ Client     │ Total  │ Statut │ Action│ │
│  ├──────┼────────────┼────────┼────────┼───────┤ │
│  │ F-042│ Fam.Bernard│ €360   │ 💳 Payé│ [👁]  │ │
│  │ F-043│ Fam.Dupont │ €240   │ 📩 Envoyé│[👁] │ │
│  │ F-044│ Fam.Faure  │ €480   │ 🔴 Retard│[👁] │ │
│  │ F-045│ Fam.Martin │ €180   │ ✏ Brouil│[👁]  │ │
│  └──────┴────────────┴────────┴────────┴───────┘ │
│                                                  │
│  RÉSUMÉ DU MOIS                                  │
│  Total facturé: €4,320  |  Payé: €2,880         │
│  En attente: €960       |  En retard: €480       │
│  [📥 Exporter]  [📧 Relancer impayés]            │
└──────────────────────────────────────────────────┘
```

---

## Common Components

### Notification Panel (dropdown from 🔔)
```
┌─────────────────────────────────┐
│  Notifications           [Tout lire]│
├─────────────────────────────────┤
│  ● 📝 Nouvelle note: Math 15/20│
│    il y a 2 heures              │
│  ● 📨 Message de M. Dupont     │
│    il y a 3 heures              │
│  ● 📅 Séance demain 9h         │
│    il y a 5 heures              │
│  ○ ✅ Devoir rendu validé       │
│    hier                         │
│  [Voir toutes →]                │
└─────────────────────────────────┘
```

### Settings Page
```
┌──────────────────────────────────────────────────┐
│  Paramètres                                      │
├──────────────────────────────────────────────────┤
│  PROFIL                                          │
│  Prénom: [Marc          ]  Nom: [Dupont        ] │
│  Email:  [m.dupont@...  ]  Tél: [06 12 34 56  ] │
│  Avatar: [📷 Changer]                            │
│  [Enregistrer]                                   │
│                                                  │
│  SÉCURITÉ                                        │
│  Mot de passe: [Modifier le mot de passe]        │
│  Double auth:  [Activer]                         │
│                                                  │
│  NOTIFICATIONS                                   │
│  ☑ Email — nouvelles notes                       │
│  ☑ Email — absences                              │
│  ☑ Email — messages                              │
│  ☐ Email — annonces                              │
│  ☑ Push — toutes (si app mobile)                 │
│                                                  │
│  LANGUE: [Français ▼]                            │
│  THÈME:  (●) Clair  ( ) Sombre  ( ) Système      │
└──────────────────────────────────────────────────┘
```

---

## Admin — Branding Settings

### Branding Customization Page
```
┌──────────────────────────────────────────────────────────────────┐
│  Paramètres > Personnalisation                                   │
├────────────────────────────────────┬─────────────────────────────┤
│  IDENTITÉ                          │  APERÇU EN DIRECT          │
│  Nom affiché:                      │  ┌───────────────────────┐ │
│  [École Saint-Joseph          ]    │  │  [Logo]               │ │
│  Domaine personnalisé:             │  │  Bienvenue sur...     │ │
│  [ecole.saint-joseph.fr       ]    │  │                       │ │
│  (plan Pro/Enterprise requis)      │  │  ┌─────────────────┐  │ │
│                                    │  │  │ Email            │  │ │
│  LOGO & IMAGES                     │  │  ├─────────────────┤  │ │
│  Logo:    [📷 Changer] (500KB max) │  │  │ Mot de passe    │  │ │
│  Favicon: [📷 Changer] (100KB max) │  │  ├─────────────────┤  │ │
│  Fond login: [📷 Changer] (2MB)    │  │  │ [Se connecter]  │  │ │
│                                    │  │  └─────────────────┘  │ │
│  COULEURS                          │  │                       │ │
│  Principale:  [■ #1B4F72] [🎨]    │  │  Powered by EduCore   │ │
│  Secondaire:  [■ #F39C12] [🎨]    │  └───────────────────────┘ │
│  Accent:      [■ #27AE60] [🎨]    │                            │
│                                    │  Aperçu: [Login] [Sidebar] │
│  TEXTES                            │                            │
│  Message d'accueil:                │                            │
│  [Bienvenue sur l'espace       ]   │                            │
│  [numérique de l'École St-Joseph]  │                            │
│  Pied de page:                     │                            │
│  [École Saint-Joseph — 12 rue  ]   │                            │
│  [des Lilas, 75005 Paris       ]   │                            │
│                                    │                            │
│  MENTION                           │                            │
│  ☑ Afficher "Powered by EduCore"   │                            │
│  (grisé si plan gratuit)           │                            │
│                                    │                            │
│  [Enregistrer]  [Réinitialiser]    │                            │
└────────────────────────────────────┴─────────────────────────────┘
```

---

## Admin — Calendar Management

### School Calendar Admin Page
```
┌──────────────────────────────────────────────────────────────────┐
│  Calendrier scolaire 2025-2026             [+ Ajouter événement] │
├──────────────────────────────────────────────────────────────────┤
│  [◀ Mars 2026 ▶]          Vue: [Mois] [Liste] [Année]           │
│                                                                  │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                   │
│  │ Lun │ Mar │ Mer │ Jeu │ Ven │ Sam │ Dim │                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                   │
│  │     │     │     │     │     │     │  1  │                   │
│  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │                   │
│  │     │     │     │     │     │     │     │                   │
│  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │ 15  │                   │
│  │     │ 📝  │     │     │ 🎓  │     │     │                   │
│  │ 16  │ 17  │ 18  │ 19  │ 20  │ 21  │ 22  │                   │
│  │     │     │     │     │     │     │     │                   │
│  │ 23  │ 24  │ 25  │ 26  │ 27  │ 28  │ 29  │                   │
│  │     │     │     │     │ 🏖  │ 🏖  │ 🏖  │                   │
│  │ 30  │ 31  │     │     │     │     │     │                   │
│  │ 🏖  │ 🏖  │     │     │     │     │     │                   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                   │
│                                                                  │
│  📝 10/03: Conseil de classe 6eA (14h, salle B12)               │
│  🎓 13/03: Brevet blanc                                         │
│  🏖 27/03-31/03: Vacances de printemps                           │
│                                                                  │
│  FILTRES: [☑ Vacances] [☑ Examens] [☑ Réunions] [☑ Événements]  │
│                                                                  │
│  TYPES RAPIDES                                                   │
│  [+ Vacances]  [+ Examen]  [+ Réunion parents]  [+ Événement]   │
└──────────────────────────────────────────────────────────────────┘
```

### Add Calendar Event Modal
```
┌──────────────────────────────────────────────┐
│  Nouvel événement                      [✕]   │
├──────────────────────────────────────────────┤
│  Titre:    [Conseil de classe 6eA       ]    │
│  Type:     [Réunion ▼]                       │
│  Date:     [10/03/2026]  Journée entière: ☐  │
│  Début:    [14:00]  Fin: [16:00]             │
│  Lieu:     [Salle B12                   ]    │
│                                              │
│  Public concerné:                            │
│  (●) Toute l'école                           │
│  ( ) Personnel uniquement                    │
│  ( ) Classe spécifique: [_____ ▼]            │
│  ( ) Parents uniquement                      │
│                                              │
│  Récurrence: [Aucune ▼]                      │
│  Description:                                │
│  [Ordre du jour: bilan T2, orientation... ]  │
│                                              │
│  [Enregistrer]  [Annuler]                    │
└──────────────────────────────────────────────┘
```

---

## Admin — Enrollment Management

### Enrollment Admin Review Queue
```
┌──────────────────────────────────────────────────────────────────┐
│  Inscriptions 2026-2027                    [⚙ Formulaire]       │
├──────────────────────────────────────────────────────────────────┤
│  FILTRES: [Tous ▼]  [En attente ▼]  Rechercher: [________]     │
│                                                                  │
│  En attente: 12  |  Acceptées: 45  |  Rejetées: 3  |  Liste: 5 │
│                                                                  │
│  ┌────┬──────────────┬───────────┬─────────┬────────┬──────────┐│
│  │ #  │ Élève        │ Classe    │ Statut  │ Docs   │ Actions  ││
│  ├────┼──────────────┼───────────┼─────────┼────────┼──────────┤│
│  │  1 │ MARTIN Léa   │ 6ème      │ ⏳ Att. │ 3/4 ⚠ │ [Voir]   ││
│  │  2 │ DUPONT Hugo  │ 5ème      │ ⏳ Att. │ 4/4 ✅ │ [Voir]   ││
│  │  3 │ FAURE Emma   │ 6ème      │ ⏳ Att. │ 2/4 ❌ │ [Voir]   ││
│  │  4 │ PETIT Lucas  │ CM2→6ème  │ ⏳ Att. │ 4/4 ✅ │ [Voir]   ││
│  │  5 │ MOREAU Julie │ 4ème      │ ⏳ Att. │ 4/4 ✅ │ [Voir]   ││
│  └────┴──────────────┴───────────┴─────────┴────────┴──────────┘│
│                                                                  │
│  [Tout exporter CSV]  [Relancer documents manquants]            │
└──────────────────────────────────────────────────────────────────┘
```

### Enrollment Detail Review Page
```
┌──────────────────────────────────────────────────────────────────┐
│  ← Retour    Dossier d'inscription: DUPONT Hugo                  │
├──────────────────────────────────────────────────────────────────┤
│  INFORMATIONS ÉLÈVE                  RESPONSABLE LÉGAL           │
│  Nom: DUPONT Hugo                    Père: DUPONT Marc           │
│  Né le: 15/06/2014                   Mère: DUPONT Claire         │
│  Classe demandée: 5ème               Tél: 06 12 34 56 78        │
│  Adresse: 12 rue des Lilas, 75005    Email: dupont@email.com     │
│                                                                  │
│  DOCUMENTS                                                       │
│  ✅ Certificat de scolarité        [📎 Voir]                    │
│  ✅ Livret de famille              [📎 Voir]                    │
│  ✅ Assurance scolaire             [📎 Voir]                    │
│  ✅ Photo d'identité               [📎 Voir]                    │
│                                                                  │
│  E-SIGNATURE                                                     │
│  ✅ Règlement intérieur — signé le 02/03/2026                    │
│  ✅ Consentement RGPD — signé le 02/03/2026                     │
│  ⏳ Autorisation de sortie — en attente                          │
│     [📧 Relancer la signature]                                   │
│                                                                  │
│  PAIEMENT                                                        │
│  Frais d'inscription: €350                                       │
│  Méthode: Carte bancaire                                         │
│  Statut: ✅ Payé le 03/03/2026                                  │
│                                                                  │
│  NOTES INTERNES                                                  │
│  [                                                        ]      │
│                                                                  │
│  DÉCISION                                                        │
│  [✅ Accepter]  [📋 Liste d'attente]  [❌ Refuser]  [💬 Demander info]│
└──────────────────────────────────────────────────────────────────┘
```

---

## Admin — Report Card Management

### Report Card Generation Page
```
┌──────────────────────────────────────────────────────────────────┐
│  Bulletins — Trimestre 2 (2025-2026)                             │
├──────────────────────────────────────────────────────────────────┤
│  WORKFLOW:  ① Notes finalisées → ② Commentaires → ③ Conseil     │
│             → ④ Validation → ⑤ Publication                      │
│                                                                  │
│  CLASSES                                                         │
│  ┌──────────┬──────────┬────────────┬──────────┬───────────────┐│
│  │ Classe   │ Notes    │ Comment.   │ Conseil  │ Statut        ││
│  ├──────────┼──────────┼────────────┼──────────┼───────────────┤│
│  │ 6ème A   │ ✅ 12/12 │ ✅ 12/12   │ ✅ Done  │ 🟢 Prêt      ││
│  │ 6ème B   │ ✅ 10/10 │ ⚠ 8/10    │ ⏳ Att.  │ 🟡 En cours  ││
│  │ 5ème A   │ ✅ 11/11 │ ✅ 11/11   │ ✅ Done  │ 🟢 Prêt      ││
│  │ 5ème B   │ ⚠ 9/11  │ ⚠ 6/11    │ ⏳ Att.  │ 🔴 Incomplet ││
│  │ 4ème A   │ ✅ 12/12 │ ✅ 12/12   │ ✅ Done  │ 🟢 Prêt      ││
│  └──────────┴──────────┴────────────┴──────────┴───────────────┘│
│                                                                  │
│  ACTIONS                                                         │
│  [📝 Saisir commentaires conseil]  — pour classes en attente    │
│  [👁 Prévisualiser bulletins]      — pour classes prêtes        │
│  [✅ Valider et publier]           — envoie aux parents         │
│  [📥 Télécharger PDF (lot)]        — ZIP de tous les bulletins  │
│                                                                  │
│  ⚠ 2 classes avec commentaires manquants                        │
│  [📧 Relancer les enseignants]                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Report Card Preview (Admin/Principal)
```
┌──────────────────────────────────────────────────────────────────┐
│  Bulletin — DUPONT Lucas — 6ème A — Trimestre 2                  │
│  [◀ Précédent]  Élève 3/28  [Suivant ▶]                        │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ÉCOLE SAINT-JOSEPH — BULLETIN TRIMESTRIEL               │  │
│  │  Élève: DUPONT Lucas  Classe: 6ème A  Trimestre 2        │  │
│  │                                                           │  │
│  │  ┌──────────┬──────┬──────┬──────┬─────┬───────────────┐ │  │
│  │  │ Matière  │ Moy. │ Cl.  │ Min  │ Max │ Appréciation  │ │  │
│  │  ├──────────┼──────┼──────┼──────┼─────┼───────────────┤ │  │
│  │  │ Français │14.5  │12.3  │ 6.0  │18.5 │ Bon trimestre │ │  │
│  │  │ Maths    │16.0  │13.1  │ 4.5  │19.0 │ Excellent     │ │  │
│  │  │ Histoire │12.0  │11.8  │ 5.0  │17.5 │ Peut mieux    │ │  │
│  │  │ Anglais  │15.5  │13.0  │ 7.0  │18.0 │ Très bien     │ │  │
│  │  │ SVT      │13.0  │12.5  │ 6.5  │17.0 │ Satisfaisant  │ │  │
│  │  │ EPS      │16.0  │14.2  │ 8.0  │18.0 │ Sportif       │ │  │
│  │  └──────────┴──────┴──────┴──────┴─────┴───────────────┘ │  │
│  │                                                           │  │
│  │  Moyenne générale: 14.5/20  (classe: 12.8)  Rang: 5/28   │  │
│  │                                                           │  │
│  │  Avis du conseil de classe:                               │  │
│  │  [Trimestre sérieux. Encouragements.             ]        │  │
│  │                                                           │  │
│  │  Avis du chef d'établissement:                            │  │
│  │  [Continuez ainsi. Félicitations.                ]        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [✏ Modifier commentaire]  [📥 PDF]  [✅ Valider]               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Admin — Vie Scolaire Overview

### School Life Admin Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│  Vie scolaire — Tableau de bord          [+ Signaler incident]   │
├──────────────────────────────────────────────────────────────────┤
│  PÉRIODE: [Trimestre 2 ▼]   CLASSE: [Toutes ▼]                  │
│                                                                  │
│  ┌───────────────┬───────────────┬───────────────┬─────────────┐│
│  │ 📊 Absences   │ ⏰ Retards    │ ⚠ Incidents   │ 📋 Sanctions││
│  │     127       │     84        │     23        │     15      ││
│  │  (+12 vs T1)  │  (-5 vs T1)   │  (+3 vs T1)   │  (+1 vs T1) ││
│  └───────────────┴───────────────┴───────────────┴─────────────┘│
│                                                                  │
│  ABSENCES NON JUSTIFIÉES (7)                                     │
│  ┌──────────────┬────────┬──────────┬────────────┬─────────────┐│
│  │ Élève        │ Date   │ Cours    │ Nb total   │ Action      ││
│  ├──────────────┼────────┼──────────┼────────────┼─────────────┤│
│  │ MARTIN Léa   │ 28/02  │ Math 9h  │ 5 ce trim. │ [Justifier] ││
│  │ FAURE Hugo   │ 28/02  │ Fr. 10h  │ 3 ce trim. │ [Justifier] ││
│  │ PETIT Emma   │ 27/02  │ EPS 14h  │ 2 ce trim. │ [Justifier] ││
│  └──────────────┴────────┴──────────┴────────────┴─────────────┘│
│                                                                  │
│  INCIDENTS OUVERTS (5)                                           │
│  ┌──────────────┬────────┬──────────────┬──────────┬───────────┐│
│  │ Élève        │ Date   │ Type         │ Gravité  │ Action    ││
│  ├──────────────┼────────┼──────────────┼──────────┼───────────┤│
│  │ BERNARD Lucas│ 28/02  │ Comportement │ 🟡 Moyen │ [Traiter] ││
│  │ DUPONT Chloé │ 27/02  │ Discipline   │ 🔴 Grave │ [Traiter] ││
│  └──────────────┴────────┴──────────────┴──────────┴───────────┘│
│                                                                  │
│  TOP 5 ÉLÈVES À SUIVRE                                           │
│  1. MARTIN Léa — 5 absences, 3 retards, 1 incident              │
│  2. FAURE Hugo — 3 absences, 2 incidents                        │
│  3. BERNARD Lucas — 2 incidents (dont 1 grave)                   │
│                                                                  │
│  [📥 Export absences]  [📥 Export incidents]  [📊 Statistiques]  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tutoring — Center Admin: Tutor Management

### Tutor Management Page
```
┌──────────────────────────────────────────────────────────────────┐
│  Gestion des tuteurs                         [+ Ajouter tuteur]  │
├──────────────────────────────────────────────────────────────────┤
│  FILTRES: [Tous ▼]  [Actif ▼]  Matière: [Toutes ▼]             │
│                                                                  │
│  ┌─────┬──────────────┬──────────┬────────┬───────┬────────────┐│
│  │     │ Tuteur       │ Matières │ Tarif  │ Élèves│ Ce mois    ││
│  ├─────┼──────────────┼──────────┼────────┼───────┼────────────┤│
│  │ [👤]│ DUPONT Marc  │ Math,Phy.│ €35/h  │ 6     │ 24 séances ││
│  │ [👤]│ MARTIN Julie │ Français │ €30/h  │ 4     │ 16 séances ││
│  │ [👤]│ FAURE Antoine│ Anglais  │ €32/h  │ 5     │ 20 séances ││
│  │ [👤]│ PETIT Sophie │ Math     │ €35/h  │ 3     │ 12 séances ││
│  └─────┴──────────────┴──────────┴────────┴───────┴────────────┘│
│                                                                  │
│  RÉSUMÉ                                                          │
│  Total tuteurs: 4 actifs  |  72 séances ce mois  |  €2,380      │
└──────────────────────────────────────────────────────────────────┘
```

### Tutor Detail / Edit Page (Admin)
```
┌──────────────────────────────────────────────────────────────────┐
│  ← Retour    Fiche tuteur: DUPONT Marc                           │
├──────────────────────────────────────────────────────────────────┤
│  PROFIL                              STATISTIQUES                │
│  Nom: [DUPONT          ]             Depuis: Janv. 2025          │
│  Prénom: [Marc          ]            Élèves actifs: 6            │
│  Email: [m.dupont@...   ]            Heures ce mois: 30h         │
│  Tél: [06 12 34 56     ]            Taux complétion: 96%         │
│  Bio: [Professeur certifié...]       Note moy. parents: ★★★★☆   │
│                                                                  │
│  MATIÈRES: [Math ✕] [Physique ✕] [+ Ajouter]                    │
│  TARIF HORAIRE: [35.00] €/h                                     │
│  MAX ÉLÈVES: [8]                                                 │
│                                                                  │
│  DISPONIBILITÉS PAR DÉFAUT                                       │
│  ┌──────┬─────────────────────────────────┐                      │
│  │ Lun  │ [09:00] — [12:00], [14:00] — [18:00]│                 │
│  │ Mar  │ ☐ Non disponible                │                      │
│  │ Mer  │ [09:00] — [12:00]              │                      │
│  │ Jeu  │ [09:00] — [12:00], [14:00] — [18:00]│                 │
│  │ Ven  │ [09:00] — [12:00]              │                      │
│  └──────┴─────────────────────────────────┘                      │
│  [+ Ajouter créneau]                                             │
│                                                                  │
│  ÉLÈVES ASSIGNÉS                                                 │
│  Lucas B. (Math) — Pack 10h, 7h restantes                        │
│  Emma D. (Math) — Pack 10h, 2h restantes ⚠                      │
│  Léo F. (Physique) — Pack 5h, 5h restantes                      │
│  Chloé M. (Physique) — À l'heure, pas de forfait                │
│  [Voir tous →]                                                   │
│                                                                  │
│  [Enregistrer]  [Désactiver le tuteur]                           │
└──────────────────────────────────────────────────────────────────┘
```

### Student Package Management (Admin)
```
┌──────────────────────────────────────────────────────────────────┐
│  Forfaits élèves                          [+ Attribuer forfait]  │
├──────────────────────────────────────────────────────────────────┤
│  FILTRES: [Tous ▼]  [Actifs ▼]  [Solde bas ▼]                   │
│                                                                  │
│  ┌──────────────┬──────────┬────────┬──────────┬───────┬───────┐│
│  │ Élève        │ Forfait  │ Tuteur │ Restant  │ Exp.  │Action ││
│  ├──────────────┼──────────┼────────┼──────────┼───────┼───────┤│
│  │ Lucas B.     │ Pack 10h │ Dupont │ 7h / 10h │ 15/04 │ [👁]  ││
│  │ Emma D.      │ Pack 10h │ Dupont │ 2h / 10h │ 20/03 │ [👁] ⚠││
│  │ Léo F.       │ Pack 5h  │ Dupont │ 5h / 5h  │ 01/05 │ [👁]  ││
│  │ Hugo M.      │ Pack 10h │ Faure  │ 0h / 10h │ Exp.  │ [👁] 🔴││
│  │ Chloé M.     │ — aucun —│ Dupont │ —        │ —     │ [👁]  ││
│  └──────────────┴──────────┴────────┴──────────┴───────┴───────┘│
│                                                                  │
│  ⚠ 1 forfait bientôt épuisé  |  🔴 1 forfait expiré             │
│  [📧 Relancer renouvellement]                                    │
└──────────────────────────────────────────────────────────────────┘
```
