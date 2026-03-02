# EduliaHub — Learning Hub Frontend

Public learning marketplace and portfolio builder. Self-signup, free to use.

## Features

- **Landing page** with theme switcher (3 themes)
- **Course catalog** — browse free courses from 15+ platforms
- **Platform directory** — discover learning platforms with ratings
- **Curriculum browser** — national programs (France first)
- **Certificates** — upload and store proof of completion
- **Portfolio** — public profile with achievements, LinkedIn sharing
- **Community** — course reviews, ratings, discussions

## Setup

```bash
npm install
npm run dev    # http://localhost:3004
```

## Environment

No `.env` required for local dev (API defaults to `http://localhost:8000`).

Shares the same backend as Edulia (`apps/api/`).

## Stack

React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + shadcn/ui + Zustand + react-router-dom v7 + i18next (fr/en)

## Structure

```
src/
├── app/           # Router, providers
├── features/
│   ├── landing/   # Hub landing page
│   ├── auth/      # Login, signup (self-registration)
│   ├── catalog/   # Course catalog + platform directory
│   ├── course/    # Course detail + reviews
│   ├── certificates/  # Upload & manage certificates
│   ├── portfolio/     # Public portfolio builder
│   ├── curriculum/    # National program browser
│   ├── community/     # Discussions
│   ├── dashboard/     # Learner dashboard
│   └── profile/       # User settings
├── components/
│   ├── layout/    # HubNavbar, HubFooter
│   └── common/    # ThemeSwitcher, LanguageSwitcher
├── hooks/         # useLandingTheme (shared with Edulia)
├── stores/
├── api/
├── locales/       # fr/ + en/
└── styles/
```

See [root README](../../README.md) for full architecture.
