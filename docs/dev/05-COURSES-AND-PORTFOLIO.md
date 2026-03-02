# 05 — Courses, Curriculum & Portfolio

## Vision

Edulia becomes a **learning hub**: browse curated courses, track what you've learned, collect certificates, and share achievements. Not a content host — a learning organizer and portfolio builder.

Three pillars:
1. **Curriculum** — What you should learn (national programs, skill frameworks)
2. **Course catalog** — Where to learn it (curated external links + teacher materials)
3. **Portfolio** — Proof you learned it (certificates, badges, completions)

---

## Pillar 1: National Curriculum (France first)

### Data source

French programs are published by the Ministère de l'Éducation nationale on **eduscol.education.fr** and in the **Bulletin Officiel (BO)**.

| Cycle | Ages | Grades | Key subjects |
|---|---|---|---|
| Cycle 1 | 3-5 | Maternelle (PS/MS/GS) | Langage, motricité, explorer le monde |
| Cycle 2 | 6-8 | CP/CE1/CE2 | Lire, écrire, compter, calculer |
| Cycle 3 | 9-11 | CM1/CM2/6e | Français, maths, sciences, histoire-géo |
| Cycle 4 | 12-14 | 5e/4e/3e | All disciplines, preparation brevet |
| Lycée | 15-17 | 2nde/1ère/Tle | Tronc commun + spécialités |

### Data format

NOT available as structured API/CSV on data.gouv.fr (verified: 0 results). Programs are published as:
- PDF documents (Bulletin Officiel arrêtés)
- HTML pages on eduscol.education.fr

### Extraction approach

1. **Manual curation + AI parsing** of BO PDFs
2. Store as structured seed data in Edulia
3. Hierarchy: `Country > Cycle > Grade > Discipline > Domain > Competency > Objective`
4. Each objective has: code, label, description, expected level
5. Update frequency: rare (BO changes every 3-5 years per cycle)

### Data model

```sql
-- National curriculum framework
CREATE TABLE curriculum_framework (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL DEFAULT 'FR',  -- ISO 3166-1
    name VARCHAR(255) NOT NULL,                      -- "Programme français 2024"
    version VARCHAR(50),                             -- "BO 2024-07"
    active BOOLEAN DEFAULT true
);

CREATE TABLE curriculum_level (
    id SERIAL PRIMARY KEY,
    framework_id INTEGER REFERENCES curriculum_framework(id),
    cycle VARCHAR(50),          -- "cycle_2"
    grade VARCHAR(50),          -- "CP", "CE1"
    age_min INTEGER,            -- 6
    age_max INTEGER,            -- 7
    label VARCHAR(255)          -- "Cours Préparatoire"
);

CREATE TABLE curriculum_competency (
    id SERIAL PRIMARY KEY,
    level_id INTEGER REFERENCES curriculum_level(id),
    discipline VARCHAR(100),    -- "Mathématiques"
    domain VARCHAR(255),        -- "Nombres et calculs"
    code VARCHAR(50),           -- "M.C2.N.1"
    label TEXT NOT NULL,        -- "Comprendre et utiliser des nombres entiers"
    description TEXT,           -- Full BO description
    position INTEGER            -- Display order
);
```

### Testing the data

1. Parse one cycle first (Cycle 2 / CP-CE2) as proof of concept
2. Validate against official BO document (cross-reference every competency)
3. Have a teacher review the structured output for accuracy
4. Only then expand to other cycles

### Future: other countries

Same schema, different `country_code`. Potential sources:
- **Senegal**: Curricula nationaux (Ministère de l'Éducation)
- **Belgium**: Référentiels de compétences (Fédération Wallonie-Bruxelles)
- **Switzerland**: Plan d'études romand (PER)
- **UK**: National Curriculum (gov.uk — well-structured)

---

## Pillar 2: Course Catalog

### Concept

A curated library of external learning resources. Each course links OUT to the provider — Edulia does not host or download content. Courses are tagged with:
- Competencies they cover (mapped to curriculum)
- Learning format (what kind of learning experience)
- Certification (does it give you something at the end?)
- Domain/skills (for career-oriented learning)

### Learning format tags

| Tag | Icon | Description |
|---|---|---|
| `reading` | 📖 | Text-based content, articles, documentation |
| `video` | 🎥 | Video lectures, tutorials, recorded sessions |
| `slides` | 📊 | Slide decks, presentations |
| `interactive` | 🖥️ | Hands-on labs, coding exercises, simulations |
| `quiz` | ✅ | Quizzes, assessments, practice tests |
| `discussion` | 💬 | Forum-based, peer discussion, cohort-based |
| `project` | 🛠️ | Project-based, build something |
| `audio` | 🎧 | Podcasts, audio lectures |

A course can have multiple format tags (e.g., video + quiz + project).

### Certification tags

| Tag | Meaning |
|---|---|
| `certificate_completion` | Certificate of completion (non-verified) |
| `certificate_verified` | Verified certificate (identity-checked, paid) |
| `badge` | Digital badge (Open Badges standard) |
| `professional_cert` | Industry certification (AWS, Azure, Google, etc.) |
| `none` | No certificate, just learning |

### Skill domains (career-oriented)

Not just school subjects — also professional skills:

| Domain | Examples |
|---|---|
| **Cloud & DevOps** | AWS, Azure, GCP, Docker, Kubernetes |
| **AI & Data** | Machine Learning, Data Science, LLMs, MCP |
| **Programming** | Python, JavaScript, Rust, Go |
| **Cybersecurity** | Network security, ethical hacking, compliance |
| **Business** | Project management, marketing, finance |
| **Soft skills** | Communication, leadership, time management |
| **Creative** | Design, video editing, writing |
| **Languages** | English, French, Spanish, etc. |

### Example courses (seed data)

| Provider | Course | URL | Formats | Cert | Domain |
|---|---|---|---|---|---|
| **Anthropic** | Introduction to MCP | anthropic.skilljar.com/introduction-to-model-context-protocol | video, interactive, quiz | certificate_completion | AI & Data |
| **AWS** | Cloud Practitioner Essentials | skillbuilder.aws (free tier) | video, quiz, interactive | professional_cert | Cloud & DevOps |
| **Microsoft** | Azure Fundamentals (AZ-900) | learn.microsoft.com/training/paths/az-900 | reading, interactive, quiz | professional_cert | Cloud & DevOps |
| **NVIDIA** | Fundamentals of Deep Learning | nvidia.com/en-us/training/ | video, interactive | certificate_completion | AI & Data |
| **Google** | Data Analytics Certificate | grow.google/certificates/data-analytics | video, project, quiz | professional_cert | AI & Data |
| **freeCodeCamp** | Responsive Web Design | freecodecamp.org/learn | interactive, project | certificate_completion | Programming |
| **Khan Academy** | Algebra 1 | khanacademy.org/math/algebra | video, interactive, quiz | none | Maths (Cycle 4) |
| **Coursera** | Learning How to Learn | coursera.org/learn/learning-how-to-learn | video, quiz, discussion | certificate_completion | Soft skills |
| **OpenClassrooms** | Apprenez à créer votre site web | openclassrooms.com/fr/courses/... | video, quiz, project | certificate_completion | Programming |
| **France Université Numérique** | Various | fun-mooc.fr | video, quiz, discussion | certificate_completion | Multiple |

### Data model

```sql
CREATE TABLE course_provider (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,         -- "Anthropic", "AWS", "Microsoft"
    logo_url VARCHAR(500),
    website VARCHAR(500),
    description TEXT
);

CREATE TABLE course (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenant(id) NULL,  -- NULL = global catalog
    provider_id INTEGER REFERENCES course_provider(id) NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    url VARCHAR(1000) NOT NULL,         -- External link
    language VARCHAR(10) DEFAULT 'en',  -- ISO 639-1
    level VARCHAR(50),                  -- beginner, intermediate, advanced
    duration_hours DECIMAL,             -- Estimated duration
    free BOOLEAN DEFAULT true,
    formats TEXT[] DEFAULT '{}',        -- ARRAY['video', 'quiz', 'interactive']
    certification VARCHAR(50),          -- 'certificate_completion', 'professional_cert', etc.
    domains TEXT[] DEFAULT '{}',        -- ARRAY['ai_data', 'cloud_devops']
    thumbnail_url VARCHAR(500),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Map courses to curriculum competencies
CREATE TABLE course_competency (
    course_id INTEGER REFERENCES course(id),
    competency_id INTEGER REFERENCES curriculum_competency(id),
    PRIMARY KEY (course_id, competency_id)
);

-- Map courses to skill domains / job opportunities
CREATE TABLE skill_domain (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- 'cloud_devops'
    label VARCHAR(255) NOT NULL,        -- 'Cloud & DevOps'
    description TEXT,
    career_paths TEXT[]                  -- ARRAY['Cloud Engineer', 'DevOps Engineer', 'SRE']
);
```

### Purpose-driven learning

Every course links to **why** you're learning it:

1. **Curriculum mapping** (for students): "This course covers Cycle 4 Maths — Nombres et calculs"
2. **Career mapping** (for professionals): "This course prepares you for → Cloud Engineer, DevOps Engineer"
3. **Skill tree** (visual): Show interconnected skills, what unlocks what

The UI shows: "Learn this → Get certified → Qualify for these jobs"

---

## Pillar 3: Portfolio & Certificates

### Flow

1. User browses catalog, clicks course link → opens on provider's site
2. User completes course, gets certificate from provider
3. User uploads certificate to Edulia (PDF, image, or verification URL)
4. Edulia stores it, maps it to competencies/skills
5. User can share on LinkedIn or via public portfolio page

### Data model

```sql
CREATE TABLE certificate (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    course_id INTEGER REFERENCES course(id) NULL,   -- Optional link to catalog
    title VARCHAR(500) NOT NULL,                     -- "AWS Cloud Practitioner"
    provider VARCHAR(255),                           -- "Amazon Web Services"
    issued_date DATE,
    expiry_date DATE NULL,                           -- Some certs expire
    credential_id VARCHAR(255),                      -- Provider's credential ID
    verification_url VARCHAR(1000),                  -- URL to verify on provider site
    file_id INTEGER REFERENCES files(id) NULL,       -- Uploaded PDF/image
    competencies INTEGER[] DEFAULT '{}',             -- curriculum_competency IDs
    domains TEXT[] DEFAULT '{}',                      -- skill domain slugs
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE portfolio (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,      -- username for public URL
    public BOOLEAN DEFAULT false,
    bio TEXT,
    headline VARCHAR(255),                  -- "Cloud Engineer in training"
    linkedin_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### LinkedIn sharing

Use LinkedIn Share API (no special partnership needed):
```
https://www.linkedin.com/sharing/share-offsite/?url={portfolio_url}
```

Or structured certificate share:
```
https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME
  &name={cert_title}
  &organizationName={provider}
  &issueYear={year}&issueMonth={month}
  &certUrl={verification_url}
  &certId={credential_id}
```

### Public portfolio page

`https://edulia.angelstreet.io/portfolio/{slug}`

Shows:
- User bio + headline
- Certificates grid (with provider logos)
- Competency map (what they've proven)
- Skill domains covered
- "Hire me" or contact section (optional)

---

## API Endpoints

### Curriculum
| Method | Path | Description |
|---|---|---|
| GET | `/api/curriculum/frameworks` | List frameworks (FR, etc.) |
| GET | `/api/curriculum/frameworks/{id}/levels` | Levels for a framework |
| GET | `/api/curriculum/levels/{id}/competencies` | Competencies for a level |

### Courses
| Method | Path | Description |
|---|---|---|
| GET | `/api/courses` | Browse catalog (filters: domain, level, format, free, language) |
| GET | `/api/courses/{id}` | Course detail |
| POST | `/api/courses` | Add course (admin/teacher) |
| GET | `/api/courses/providers` | List providers |
| GET | `/api/courses/domains` | List skill domains with career paths |

### Certificates
| Method | Path | Description |
|---|---|---|
| GET | `/api/certificates` | My certificates |
| POST | `/api/certificates` | Upload certificate (file + metadata) |
| DELETE | `/api/certificates/{id}` | Remove certificate |

### Portfolio
| Method | Path | Description |
|---|---|---|
| GET | `/api/portfolio` | My portfolio settings |
| PUT | `/api/portfolio` | Update portfolio (bio, public, etc.) |
| GET | `/api/portfolio/{slug}` | Public portfolio (no auth) |

---

## Frontend Pages

| Page | Path | Description |
|---|---|---|
| Course catalog | `/courses` | Browse, filter, search courses. Card grid with format/cert badges |
| Course detail | `/courses/{id}` | Description, formats, competencies mapped, "Go to course" button |
| My certificates | `/certificates` | Grid of uploaded certs, upload button |
| Upload certificate | `/certificates/new` | Form: title, provider, file, date, verification URL |
| My portfolio | `/portfolio` | Edit bio, toggle public, preview |
| Public portfolio | `/portfolio/{slug}` | Public page (no auth, SEO-friendly) |
| Curriculum browser | `/curriculum` | Browse national programs by cycle/grade/subject |

---

## Implementation Plan

### Phase 1: Course catalog (Small)
- `course_provider` + `course` tables
- Seed with 10-15 free courses (examples above)
- Browse/filter UI
- Admin can add courses

### Phase 2: Certificates & portfolio (Medium)
- Certificate upload + storage
- Portfolio page (public/private)
- LinkedIn sharing

### Phase 3: French curriculum (Medium)
- Parse Cycle 2 BO as proof of concept
- Structured competency data
- Map existing courses to competencies
- Teacher review + validation

### Phase 4: Career mapping (Small)
- Skill domains + career paths
- "Learn this → Become this" UI
- Course recommendations based on career goals

### Phase 5: Extend (Future)
- More countries (UK, Senegal, Belgium, Switzerland)
- Course ratings/reviews by users
- Learning paths (ordered sequences of courses)
- Community-contributed courses (moderated)

---

## Dependencies

- `files` module (certificate uploads)
- `users` module (portfolio ownership)
- No external API integration needed (just links out)
- LinkedIn sharing uses standard web URL (no API key needed)

---

## Pillar 4: Learning Hub (Platform Directory + Community Ratings)

### Concept

Edulia acts as a **hub for learning platforms** — like an app store for education. Two levels:

1. **Platform directory** — List of learning platforms (Coursera, Khan Academy, AWS Skill Builder, etc.) with descriptions, ratings, and what they're best for
2. **Course ratings & reviews** — Community-driven stars + comments on individual courses

Users don't need to leave Edulia to discover where to learn. They browse the hub, read reviews, pick a course, and link out.

### Platform directory

```sql
CREATE TABLE learning_platform (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,             -- "Coursera"
    slug VARCHAR(100) UNIQUE NOT NULL,      -- "coursera"
    description TEXT,
    website VARCHAR(500) NOT NULL,
    logo_url VARCHAR(500),
    free_tier BOOLEAN DEFAULT false,        -- Has free content?
    paid_plans TEXT,                        -- "Free / $49/mo / $399/yr"
    domains TEXT[] DEFAULT '{}',            -- ['ai_data', 'business', 'programming']
    formats TEXT[] DEFAULT '{}',            -- ['video', 'quiz', 'project']
    certifications TEXT[] DEFAULT '{}',     -- ['certificate_completion', 'professional_cert']
    languages TEXT[] DEFAULT '{}',          -- ['en', 'fr', 'es']
    avg_rating DECIMAL(2,1) DEFAULT 0,     -- Computed from reviews
    review_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Seed platforms

| Platform | Free? | Best for | Cert? |
|---|---|---|---|
| Khan Academy | Yes | K-12, math, science | No |
| Coursera | Freemium | University courses, professional certs | Yes |
| edX | Freemium | University courses (MIT, Harvard) | Yes |
| OpenClassrooms | Freemium | French-language tech/business | Yes |
| FUN-MOOC | Yes | French university MOOCs | Yes |
| freeCodeCamp | Yes | Web dev, JS, Python | Yes (free) |
| AWS Skill Builder | Freemium | AWS cloud | Yes (pro cert) |
| Microsoft Learn | Yes | Azure, M365, Power Platform | Yes (pro cert) |
| Google Skillshop | Yes | Google Ads, Analytics, Cloud | Yes (pro cert) |
| NVIDIA DLI | Freemium | Deep learning, AI | Yes |
| Anthropic Academy | Yes | AI safety, MCP, Claude | Yes |
| Udemy | Paid | Everything (variable quality) | Yes (non-verified) |
| LinkedIn Learning | Paid | Business, soft skills, tech | Yes |
| Codecademy | Freemium | Interactive coding | Yes |
| Duolingo | Freemium | Languages | No |

### Ratings & Reviews

```sql
CREATE TABLE course_review (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES course(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,        -- Upvotes on the review
    verified BOOLEAN DEFAULT false,         -- User uploaded cert for this course
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(course_id, user_id)              -- One review per user per course
);

CREATE TABLE platform_review (
    id SERIAL PRIMARY KEY,
    platform_id INTEGER REFERENCES learning_platform(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(platform_id, user_id)
);

CREATE TABLE review_vote (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES course_review(id) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    helpful BOOLEAN NOT NULL,               -- true = helpful, false = not
    UNIQUE(review_id, user_id)
);
```

### Features

- **5-star ratings** on both platforms and individual courses
- **Written reviews** with title + comment
- **Verified badge** on reviews where user uploaded completion certificate
- **"Was this helpful?"** voting on reviews
- **Sort courses by**: rating, review count, newest, most popular
- **Filter by**: format, domain, free/paid, certification, language, rating >= N
- **Community-contributed courses**: any user can submit a course link for review (moderated by admin before publishing)

### API additions

| Method | Path | Description |
|---|---|---|
| GET | `/api/platforms` | Browse learning platforms |
| GET | `/api/platforms/{slug}` | Platform detail + its courses |
| POST | `/api/courses/{id}/reviews` | Submit review (auth required) |
| GET | `/api/courses/{id}/reviews` | List reviews for a course |
| POST | `/api/reviews/{id}/vote` | Vote helpful/not helpful |
| POST | `/api/courses/suggest` | Community suggests a course (moderated) |

### Frontend additions

| Page | Path | Description |
|---|---|---|
| Platforms hub | `/platforms` | Grid of learning platforms with logos, ratings, filters |
| Platform detail | `/platforms/{slug}` | About, courses from this platform, community rating |
| Course reviews | (on course detail) | Stars + written reviews below course info |
| Suggest course | `/courses/suggest` | Form for community course submissions |
