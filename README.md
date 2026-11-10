# SQL Mastery

A desktop SQL trainer that takes you from your first `SELECT` to recursive CTEs, window functions, indexes and transactions. Every answer is graded by **actually running SQL** against an isolated database, including hidden tests. The app works fully offline and keeps all progress on your computer. The interface is available in English and Russian.

![Dashboard](docs/screenshots/dashboard.png)

## Features

- **Local accounts**: sign up, sign in, "remember me", recovery codes, password change, account deletion, several users on one computer.
- **Learning path**: 5 levels, 55 modules, theory with examples, exercises, a final test per module and a level exam.
- **Exercise catalog**: search and filters by level, topic, type, difficulty, status, XP reward and time to solve.
- **10 exercise types**: write a query, fix the bug, predict the result, choose the query, fill in the blanks, JOIN builder, assemble the query, explain the query, business case, SQL challenge.
- **Practice modes**: module tests, level exams, capstone projects, speed round, daily challenge, mistake review.
- **SQL Playground**: Monaco editor, 6 training databases, query history, database reset.
- **Analytics and gamification**: XP, levels, ranks, streaks, 30 achievements, statistics by topic and by mistake type.
- **Multilingual**: English (default) and Russian, switchable at any time; content can be translated with overlay files.

## Walkthrough

The screenshots below follow a typical first session. They are generated from the real app by `npm run docs:screenshots` (see [Screenshots](#regenerating-screenshots)).

### 1. Create an account

![Sign up](docs/screenshots/register.png)

Accounts are local: the username, email and an Argon2id password hash are stored in the app database on this computer. The language switcher in the top-right corner works before you sign in.

### 2. Save the recovery code

![Recovery code](docs/screenshots/recovery-code.png)

Right after sign-up the app shows a one-time recovery code. It is the only way to reset a forgotten password, because there is no server to send an email from. Only its hash is stored.

### 3. Sign in

![Sign in](docs/screenshots/sign-in.png)

Accounts that exist on this computer are listed for quick access. "Remember me" keeps you signed in with a random token encrypted by the operating system keychain (`safeStorage`). Repeated failed attempts are rate-limited.

### 4. Dashboard

![Dashboard](docs/screenshots/dashboard.png)

The home page shows your level, total XP, solved exercises, streak and learning time. It also has a "Continue learning" card that opens the next unsolved exercise, today's daily challenge, a 30-day activity chart and recent achievements.

### 5. Learning path

![Learning path](docs/screenshots/learning-path.png)

Five levels, from **SQL Beginner** to **Expert SQL**, each split into modules with progress bars. Every level ends with a level exam.

### 6. Module: theory and exercises

![Module](docs/screenshots/module.png)

A module page combines the theory (Markdown with examples and tables) with the module's exercises and the final test. Solved exercises are marked, and "Continue" jumps to the first unsolved one.

### 7. Solving an exercise

![Solved exercise](docs/screenshots/exercise-solved.png)

The task, theory, hints, schema and personal notes are on the left; the SQL editor and results are on the right. **Run** executes the query and shows the result. **Submit** grades it against the main scenario and hidden tests, then shows the explanation and the XP earned.

### 8. Other exercise types

![Explain the query](docs/screenshots/exercise-explain.png)

Not every exercise is about writing SQL from scratch. This "explain the query" exercise asks you to pick what a query does. Other types include predicting the result, choosing the correct query, filling in blanks, assembling a query from fragments, fixing a bug and building a JOIN.

### 9. Safety checks

![Forbidden statement](docs/screenshots/exercise-guard.png)

Queries are checked before they run. Each exercise defines which statements are allowed (by default only `SELECT`), so `DROP TABLE` is rejected with a clear message and never reaches a database.

### 10. Exercise catalog

![Exercise catalog](docs/screenshots/catalog.png)

All 500 exercises in one searchable list with filters, sorting, favorites and per-exercise status.

### 11. Practice

![Practice](docs/screenshots/practice.png)

The practice hub contains the daily challenge (three exercises picked for your level), a 5-minute speed round, a review of exercises you got wrong, level exams and capstone projects. Each project is a sequence of tasks on one database.

### 12. Module test

![Module test](docs/screenshots/module-test.png)

A test draws 6 random exercises from the module. The numbered tabs at the top show which questions are answered correctly or incorrectly; hints and solutions are hidden during a test.

### 13. Test result

![Test result](docs/screenshots/module-test-result.png)

70% correct answers pass the test and award bonus XP. Each question links back to its exercise for review.

### 14. SQL Playground

![Playground](docs/screenshots/playground.png)

A free-form editor on any of the 6 training databases, with a schema browser and query history. Every user works on a private copy of the database that can be reset at any time, so data-changing statements are safe to try.

### 15. Analytics

![Analytics](docs/screenshots/analytics.png)

Accuracy, average solving time, streaks, 90-day activity charts, progress by level and the topics that are your strengths or need practice.

### 16. Achievements

![Achievements](docs/screenshots/achievements.png)

30 achievements in five groups (progress, mastery, habits, challenges and exploration), with progress bars for the ones still locked.

### 17. Profile and settings

![Profile](docs/screenshots/profile.png)

Edit the username and email, change the password, generate a new recovery code or delete the account. Settings include the interface language, daily XP goal, editor preferences and reduced motion. The page also shows where the data is stored.

### 18. Russian interface

![Learning path in Russian](docs/screenshots/learning-path-ru.png)

Switching the language updates the whole app immediately, including server-side messages and the curriculum. The choice is remembered across restarts.

## Training content

Exercise counts are verified automatically (`tests/integration/content.test.ts`) and printed by `npm run content:report`.

| Level | Modules | Exercises |
|-------|---------|-----------|
| SQL Beginner | 11 | 120 |
| SQL Fundamentals | 10 | 120 |
| Intermediate SQL | 13 | 120 |
| Advanced SQL | 13 | 100 |
| Expert SQL | 8 | 40 |
| **Total** | **55** | **500** |

`data/curriculum.json` also defines 7 capstone projects (sequences of exercises on a single database).

There are 6 training databases in `data/datasets`: an online store, a company's employees, movies, sales, a bank and a university. Each database has a `hidden.sql` file with extra data that forms the hidden test scenario, so a solution is graded on data the learner has never seen.

## Requirements

- Node.js 20 LTS or newer, npm 10+.
- macOS, Windows or Linux.

## Quick start

```bash
npm install
npm run dev
```

The app window opens. Create an account; all data stays on your computer.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run in development mode with hot reload |
| `npm start` | Run the built app (`electron-vite preview`) |
| `npm run typecheck` | TypeScript checks for main/preload and renderer |
| `npm test` | Unit and integration tests (Vitest) |
| `npm run test:content` | Grade all 500 exercises with the real grader |
| `npm run test:e2e` | Build and run Electron E2E tests (Playwright) |
| `npm run docs:screenshots` | Build and regenerate the screenshots in `docs/screenshots` |
| `npm run content:report` | Report exercise counts, types and content issues |
| `npm run build` | Typecheck, build and create an installer for the current OS |
| `npm run build:dir` | Unpacked build without an installer (quick check) |
| `npm run build:win` / `build:mac` / `build:linux` | Installers for a specific OS |

Builds are written to `release/<version>/`: an NSIS installer for Windows, DMG and ZIP for macOS, AppImage and DEB for Linux. Build the macOS installer on macOS; for Windows, use Windows or CI.

### Regenerating screenshots

`npm run docs:screenshots` launches the built app in a temporary data directory, registers a demo user, seeds progress through the regular IPC API and captures every page at 1440×900 into `docs/screenshots/`. The script lives in `scripts/screenshots/capture.spec.ts`.

## Architecture

```
src/
  main/            Electron main process
    engine/        SQL engine: guard, worker thread, result comparison
    content/       exercise loading and validation (Zod), reference programs, translations
    services/      auth, catalog, grading, progress, assessments, achievements, stats, locale
    database/      Drizzle schema, migrations, atomic database persistence
    i18n/          main-process message catalog (English and Russian)
    ipc/           typed IPC dispatcher
    security/      password hashing, rate limiting, token storage, hardening
  preload/         minimal contextBridge API
  renderer/        React UI (features/*, components/*, i18n)
  shared/          types, Zod schemas and the IPC contract shared by main and renderer
data/
  curriculum.json  levels, modules, projects
  theory/          module theory (Markdown)
  exercises/       exercises (JSON) by level
  datasets/        schemas, data and hidden scenarios of the training databases
  i18n/en/         English content overlays
tests/
  unit/            guard, result comparison, progression, passwords, messages, snippets
  renderer/        interface dictionaries and plural rules
  integration/     full application flow and validation of all content
  e2e/             Playwright scenarios for the built app
scripts/
  screenshots/     documentation screenshot capture
```

Stack: Electron 37, electron-vite, React 19, TypeScript, Tailwind CSS, shadcn/ui, Lucide, Framer Motion, Monaco Editor, TanStack Query, Zustand; SQLite (sql.js/WebAssembly) and Drizzle ORM; Zod; Vitest and Playwright.

### How an answer is graded

1. The renderer sends the **answer** (SQL, selected option, blank values and so on) and the exercise ID. Reference solutions and correct option numbers are never sent to the renderer, except on an explicit "Show solution" request, which is recorded in the progress.
2. The main process runs a static guard: the statement types allowed for the exercise, plus a ban on system commands.
3. For each scenario (main and hidden), a worker thread creates a **fresh in-memory database** from the schema and data, then runs both the user's answer and the reference.
4. Results are compared with attention to row order (when the reference uses `ORDER BY`), numeric precision and, if required, column names. For data-changing exercises (`mode: "mutation"`) the result of a `check` query is compared instead.

## Security

- **Passwords** are hashed with Argon2id (hash-wasm) using a random salt; only the hash is stored. Passwords and tokens are never kept in `localStorage`.
- **"Remember me"** uses a random token: its hash is stored in the database and the value is encrypted on disk with the OS `safeStorage`.
- **Brute force protection**: after several failed attempts, sign-in is temporarily blocked with an increasing delay.
- **Electron**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, a strict Content Security Policy, and blocked navigation, new windows and permission requests.
- **IPC**: a single channel with an allowlist of methods. Every request is validated with a Zod schema in the main process, and errors are returned in one format. The renderer has no access to the application database.
- **User SQL** never runs against the application database. It runs only in temporary isolated databases in a separate thread.
  - `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM`, extensions and changes to `sqlite_*` system tables are always forbidden.
  - `DROP` and `ALTER` are forbidden in exercises; the allowed statements are configured per exercise (only `SELECT` by default).
  - Limits: 4 s per run (8 s for full grading, after which the worker is terminated), at most 1000 result rows, 25 statements and 20,000 characters.
  - In the Playground every user works on a personal copy of the training database, which can be reset.
- **Application database queries** go through Drizzle ORM with bound parameters; only fixed SQL migrations run outside the ORM.

## Data storage

All data lives in the app's data folder; the exact path is shown on the Profile page.

- `sql-mastery.db`: users, progress, attempts, achievements and the interface language. Writes are atomic (temporary file, `fsync`, rename), and a backup is made before schema migrations.
- `session.json`: the encrypted "remember me" token.
- `content/exercises/`: your own exercises (see below).

## Localization

The interface ships in **English** (default) and **Russian**. The language is an app-wide setting: it can be changed on the sign-in screen, in the sidebar or in Profile → Settings. It is stored in the app database and applies to every account on this computer.

- **Interface strings** live in `src/renderer/i18n/en.ts` and `ru.ts`. Both dictionaries must have the same keys and placeholders, which a unit test enforces. Plurals use the `{n:one|other}` syntax (Russian uses `{n:one|few|many}`) and are resolved with `Intl.PluralRules`. Dates and numbers are formatted for the selected locale.
- **Main-process messages** (guard errors, grading results, timeouts, test titles) live in `src/main/i18n/messages.ts`, so errors produced by the backend are shown in the selected language too.
- **Content** is written in Russian and translated with overlay files in `data/i18n/<locale>/`. Any text without a translation falls back to the original:
  - `curriculum.json`: titles and descriptions of levels, modules and projects.
  - `datasets.json`: database descriptions and table descriptions.
  - `exercises/<level>.json`: per exercise ID, any of `title`, `description`, `hints`, `explanation`, `theory` and `options` (the number of options must match the original).
  - `theory/<module id>.md`: translated module theory.

Overlays are validated at startup: translations for unknown IDs or with a wrong number of options are reported and skipped. The English overlay currently covers the whole curriculum, all databases, all achievements and the titles of all 500 exercises. The full exercise text and theory are translated for the "What is SQL" and "SELECT" modules; other exercises show their task text in Russian until translated.

To add a language, add its code to `src/shared/constants/locale.ts`, create a renderer dictionary and a main-process message table, and optionally add `data/i18n/<code>/` overlays.

## Adding exercises

Exercises are stored in JSON files. Built-in ones are in `data/exercises/<level>/`. You can also put your own files into `content/exercises/` inside the app data folder; they are loaded on the next start, and progress on built-in exercises is preserved. Invalid files never break the app: problematic exercises are skipped and the reason is logged.

File format:

```json
{
  "module": "fundamentals.group-by",
  "dataset": "ecommerce",
  "exercises": [
    {
      "id": "my-orders-by-country",
      "type": "write_query",
      "title": "Orders by country",
      "description": "Return each country and the number of orders placed by its customers. Sort by the number of orders descending, then by country.",
      "difficulty": "medium",
      "solution": "SELECT c.country, COUNT(*) AS orders FROM orders o JOIN customers c ON c.id = o.customer_id GROUP BY c.country ORDER BY orders DESC, c.country",
      "hints": ["Join orders with customers.", "Group by country."],
      "explanation": "GROUP BY on a column of the joined table."
    }
  ]
}
```

Main fields:

- Common: `id` (unique; lowercase Latin letters, digits and hyphens), `type`, `title`, `description`, `difficulty` (`easy`, `medium`, `hard`, `expert`), `hints` (1–5), `explanation`. Optional: `xp`, `minutes`, `tags`, `module`, `dataset`.
- SQL exercises (`write_query`, `fix_bug`, `business_case`, `challenge`): `solution`; optional `alt` (alternative references), `starter` (required for `fix_bug`), `orderMatters`, `columnNames`, `hidden` (custom hidden scenarios `{ "name", "setup" }`), and `mode: "mutation"` together with `check` and `allow` for data-changing exercises.
- `predict_result`: `sql`, `ask` (`value` or `rowCount`), optional `options`.
- `choose_query`: `options` (SQL variants), `correct`.
- `fill_blank`: `template` with `{{1}}` blanks, `answers`, optional `choices`.
- `join_builder`: `tables`, `select`, `suffix`, `answer`.
- `order_parts`: `parts` (in the correct order), `distractors`.
- `explain_query`: `sql`, `options` (text), `correct`.

Modules are listed in `data/curriculum.json`, and module theory is in `data/theory/<module id>.md`. After changing built-in content, run `npm run test:content`. It runs every reference solution on all scenarios and checks that wrong options, `fix_bug` starters and empty actions in data-changing exercises are rejected.

## License

Educational project. All training data is fictional.
