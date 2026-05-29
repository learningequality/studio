<!-- Generic guidance for all coding agents (Claude Code, Zed, Cursor, etc.) -->

# Kolibri Studio Development Guide for AI Coding Agents

**Project:** Kolibri Studio — web app for authoring and publishing learning channels to Kolibri
**Stack:** Python/Django backend, Vue.js 2.7 frontend, Kolibri Design System (KDS) + legacy Vuetify 1.5, Postgres/Redis/MinIO/Celery services, pytest/Jest testing
**Platform:** web (server-deployed, not packaged for clients)

## Quick Start

```bash
uv pip sync requirements.txt requirements-dev.txt  # Python deps
pnpm install                                       # Node deps
pre-commit install                                 # Required — commits fail without this
make dcservicesup                                  # Bring up postgres / redis / minio in docker
pnpm devsetup                                      # Migrate + load sample data + create admin
pnpm devserver                                     # Django :8080 + Webpack watcher
```

→ Full setup: `README.md` | Local production-shape stack: `make dcup` (uses `docker-compose.yml`)

## Critical Gotchas

### ⚠️ BEFORE Writing Any Vue Component, Search for Existing Ones

Do not create a new component without first searching for an existing solution:
1. **Kolibri Design System** ([docs](https://design-system.learningequality.org/)) — `KButton`, `KCircularLoader`, `KTextbox`, `KSelect`, `KModal`, `KCheckbox`, `KIcon`, `KTable`, etc.
2. **`contentcuration/contentcuration/frontend/shared/`** — Studio-specific shared components.
3. **Vuetify 1.5** — for legacy widgets KDS doesn't cover (data tables, complex layout primitives). See the next gotcha before reaching for Vuetify in new code.

If a component does 80% of what you need, wrap it — do not rewrite.

### ⚠️ Use KDS, Not Vuetify, for New Code

KDS is the design-system source of truth. Vuetify is legacy and being phased out. **Do not introduce Vuetify into a fresh component** — new files use KDS. When you're already editing a file for another reason and a Vuetify widget in it has a KDS equivalent, migrating it is welcome — **keep it small and in-scope** (the component you're touching, not a sweep of the whole file). Don't open unrelated PRs solely to migrate, and don't half-convert a component and leave it mixed.

### ⚠️ Use Theme Tokens, Not Hard-Coded Colors

Never use raw color values. Access theme colors via `$themeTokens` and `$themePalette`:
```vue
<template>
  <div :style="{ color: $themeTokens.text, backgroundColor: $themeTokens.surface }">
    <span :style="{ color: $themeTokens.annotation }">secondary text</span>
  </div>
</template>
```
For computed dynamic styles, use `$computedClass`.

### ⚠️ Style Blocks, Not Inline — RTL Depends On It

Non-dynamic styles go in `<style>` blocks. RTLCSS auto-flips directional properties (`padding-left` → `padding-right`) in style blocks but **cannot flip inline styles**. Dynamic directional styles must check `isRtl`.

### ⚠️ Prefer Composition API for New Code

Studio's existing code is largely Options API, but new components and refactors should use Composition API. It's fine to add Composition API to an existing Options API file when the existing logic isn't worth restructuring — be aware that a partial mix usually leads to a follow-up refactor.

### ⚠️ No New Vuex — Use Composition API for New State

Vuex 3 is deprecated in Studio. **New state goes through Composition API** — composables built on `ref`/`reactive`/`computed`, scoped to the consuming component or a `provide`/`inject` boundary. Existing Vuex modules live under `frontend/<app>/vuex/` (including the IndexedDB-backed sync store); when you're already editing code that leans on one and the slice is small, moving it to a composable is welcome — **keep it small and in-scope**, don't restructure a whole module in an unrelated PR. Leave the sync store alone unless the work is specifically about it.

### ⚠️ Studio Uses an IndexedDB-Backed Change-Sync Architecture — Don't Mutate Synced Models Directly

Edits in the editor write to Dexie tables in the browser via the Resource layer (`contentcuration/contentcuration/frontend/shared/data/`), which generates Change records that flow to the server's `/api/sync/` endpoint (`contentcuration/contentcuration/viewsets/sync/`). The server applies changes via a change-type registry (`viewsets/sync/base.py`, `viewsets/sync/constants.py`) and broadcasts back.

Direct `axios.post` or direct ORM `save()` on a synced model bypasses the change pipeline and corrupts the offline → online merge. **Rule:** if a model is part of the sync framework, all writes go through the Resource layer (frontend) or the change-application registry (backend). Backend system-internal operations (publishing, garbage collection) may bypass; anything user-facing must not. See `CLAUDE.md` for a fuller description.

### ⚠️ Responsive Layout: Plain CSS First, Vuetify Grid Only as a Last Resort

New layout uses plain `<div>`s with CSS (flexbox/grid) in a `<style>` block, plus KDS's `useKResponsiveWindow` composable when a breakpoint has to drive logic:
```javascript
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

const { windowIsSmall, windowWidth } = useKResponsiveWindow();
```
Vuetify's `v-container` / `v-row` / `v-col` grid is legacy, like the rest of Vuetify. Inside a file that already uses it, leave it alone — no refactor required. Reach for it in new code only when plain CSS genuinely can't express the layout.

### ⚠️ Internationalize All User-Visible Text

Use `createTranslator` from `shared/i18n` (Studio re-exports Kolibri's i18n there) — never hard-code strings in templates:
```javascript
import { createTranslator } from 'shared/i18n';

const strings = createTranslator('ChannelStrings', {
  title: { message: 'Channel title', context: 'Form field label' },
});
const { title$ } = strings;  // title$() returns the translated string
```

### ⚠️ API Calls via the Resource Pattern

For synced models, use the Resource layer in `contentcuration/contentcuration/frontend/shared/data/` (see sync gotcha above). For non-synced endpoints, use the existing Resource-style wrappers in `shared/data/resources.js`. Never use raw `fetch` or `axios` for domain operations.

### ⚠️ Backend APIs: Use `ValuesViewset`

Studio has `ValuesViewset` / `ReadOnlyValuesViewset` vendored at `contentcuration/contentcuration/viewsets/base.py`. Use them for new API endpoints — define a `values` tuple and `annotate_queryset` for computed fields rather than relying on default serializer output. Apply permission classes from `contentcuration/contentcuration/viewsets/`.

### ⚠️ Testing Is Required

- **Python:** `pytest` from repo root (uses `pytest.ini` → `contentcuration.test_settings`). Django API tests extend `APITestCase` from `rest_framework.test`. Other Django tests extend `django.test.TestCase`.
- **Frontend:** Jest runner + Vue Testing Library via `@testing-library/vue` (`render`). Write new tests with VTL. `@vue/test-utils` (`mount`/`shallowMount`) still appears in many existing tests but is **deprecated** — there are open issues to remove those tests, so do not add new ones. `describe`/`it`/`expect` are Jest globals — do NOT import them. Use `jest.fn()` and `jest.mock()`.
- **TDD:** Write a failing test first, then make it pass. Especially for bug fixes — always write a test that reproduces the bug before fixing it.

### ⚠️ Pre-commit Auto-Fixes Files

When a commit fails: pre-commit auto-fixes files → **`git add` the fixed files** → re-commit. Never bypass with `--no-verify`.

## Project Structure

```
studio/
├── contentcuration/                        # Django project root (also contains other apps)
│   ├── contentcuration/                    # Main Django app
│   │   ├── frontend/                       # Vue source
│   │   │   ├── channelEdit/
│   │   │   ├── channelList/
│   │   │   ├── settings/
│   │   │   ├── accounts/
│   │   │   ├── administration/
│   │   │   └── shared/                     # Shared components + sync data layer
│   │   ├── viewsets/                       # DRF ValuesViewsets — sync/ contains the change framework
│   │   ├── models.py, urls.py, settings.py, dev_settings.py, test_settings.py
│   │   └── static/studio/                  # webpack output (git-ignored)
│   ├── automation/                         # Django app — automation workflows
│   ├── kolibri_content/                    # Django app — Kolibri content schema
│   ├── kolibri_public/                     # Django app — public catalog API
│   ├── search/                             # Django app — full-text search
│   ├── manage.py
│   └── build/                              # webpack-stats.json (git-ignored)
├── docker/                                 # Dockerfile.{dev,prod,nginx.prod,postgres.dev}
├── integration_testing/
│   ├── features/                           # Gherkin BDD specs (manual reference)
│   └── smoke_test.py                       # CI smoke test
├── jest_config/                            # Jest config
├── webpack.config.js
├── Makefile                                # dc* targets + altprodserver
└── docker-compose.yml / docker-compose.prod.yml
```

**Settings split:**
- `contentcuration.dev_settings` — local development. Use this for local `manage.py` commands.
- `contentcuration.settings` — production. Used by `make altprodserver` and the CI smoke test.
- `contentcuration.test_settings` — pytest.

## Code Quality

Studio follows the same code-quality principles as Kolibri. → See https://kolibri-dev.readthedocs.io/en/latest/code_quality.html.md for detailed examples (LLM-friendly Markdown version; drop `.md` for the HTML rendering).

## Key Conventions

**Python:** F-strings preferred. One import per line. All imports at file top — inline imports only to prevent circular imports. Descriptive migration names (no `_auto_`).

**Vue:** PascalCase filenames. Component `name` must match filename.

**Git:** Imperative commit messages. **PR titles do NOT use Conventional Commits prefix** (e.g. `feat:`, `fix:`) — plain English titles. Individual commit messages may use CC prefixes. Black/Prettier enforced by pre-commit.

**Don't guess — look at existing code** for patterns: `contentcuration/contentcuration/viewsets/` for API patterns, `contentcuration/contentcuration/frontend/shared/data/` for sync framework, existing `__tests__/` directories for test patterns.

## Running Tests

```bash
pytest                                                  # all Python tests
pytest contentcuration/contentcuration/tests/ -k name   # filter by name
pnpm test                                               # all Jest tests
pnpm jest --config jest_config/jest.conf.js <path>      # single file
pre-commit run --all-files                              # lint all
pre-commit run --files path/to/File.vue                 # lint specific files
```

Important: bare `pnpm jest` will NOT load `modulePaths` correctly — always go through `pnpm test` or pass `--config jest_config/jest.conf.js` explicitly. Always go through `pre-commit` — do not invoke ESLint / Black / Flake8 directly.

## Docs Reference

The Kolibri-dev docs site serves an LLM-friendly Markdown variant of every page — append `.md` to any URL below. The whole index is at https://kolibri-dev.readthedocs.io/en/latest/llms.txt.

- Code quality: https://kolibri-dev.readthedocs.io/en/latest/code_quality.html.md
- Testing (general): https://kolibri-dev.readthedocs.io/en/latest/testing.html.md
- Frontend testing: https://kolibri-dev.readthedocs.io/en/latest/frontend_architecture/unit_testing.html.md
- Backend testing: https://kolibri-dev.readthedocs.io/en/latest/backend_architecture/testing.html.md
- i18n: https://kolibri-dev.readthedocs.io/en/latest/i18n.html.md
- Frontend architecture: https://kolibri-dev.readthedocs.io/en/latest/frontend_architecture/index.html.md
- Backend architecture: https://kolibri-dev.readthedocs.io/en/latest/backend_architecture/index.html.md
- Development workflow: https://kolibri-dev.readthedocs.io/en/latest/development_workflow.html.md

Local: `README.md`, `Makefile` (common commands), `docker-compose.yml` (service config).
