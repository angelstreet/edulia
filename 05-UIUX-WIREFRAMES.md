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
