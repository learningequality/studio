@AGENTS.md

## Extended Conventions

These supplement the gotchas in AGENTS.md. With Claude's large context window, the additional detail has negligible cost.

### Code Quality Principles

- **Compute, don't store**: Don't add DB fields derivable from other fields. Use `@property` on Django models or DRF `SerializerMethodField` on the backend; `computed()` in Vue on the frontend.
- **Let errors propagate**: Don't wrap calls in try/catch that just log and rethrow. DRF's exception handling catches unhandled exceptions.
- **Composition over inheritance**: Prefer composables / utility modules over mixins, delegation over subclassing. Reserve inheritance for true is-a relationships.
- **Tell, don't ask**: Don't inspect state → decide → update. Tell the object what to do.
- **Tests assert behavior, not implementation**: Mock only at hard boundaries (network, filesystem, external services, browser APIs).
- **Follow project vocabulary**: Use Studio's domain terms — `Channel`, `ContentNode`, `Tree`, `File`, `User`, `Invitation`. Don't introduce synonyms.
- **Escalate unclear decisions**: If an architectural choice isn't covered by docs or existing patterns, ask rather than deciding independently.
- **Don't weaken existing tests**: Only modify tests when the tested behavior has intentionally changed.
- **Small interfaces**: If something can be private, it must be.
- **Externalize configuration**: Use Django `settings.py` / `dev_settings.py` and environment variables, not hardcoded values.
- **Accessibility**: `aria-*` attributes on interactive elements. Keyboard navigation must work.
- **Identical code is not always duplication**: Only deduplicate when the knowledge is genuinely the same, not just when code looks similar.
- **Keep code simple**: Prefer the simplest solution that achieves the goal. Code should be readable without extensive comments.
- **DRY, but avoid premature abstraction**: Don't abstract too early — wait until a pattern appears at least three times (Rule of Three).
- **Complete your refactors**: When changing a function signature, API, or pattern, update all usages — not just the one you're working on.
- **Security**: API endpoints must have appropriate authentication and permissions. Validate submitted data. Don't bypass security practices (e.g., raw SQL instead of ORM queries).
- **One concern, one layer**: Don't reimplement validation, error handling, or permission logic that already exists at another layer.
- **Preserve existing comments**: Don't strip comments to "clean up." Only remove when the described code is deleted or the comment is provably incorrect.
- **Don't rely on undocumented behavior**: If a behavior isn't in the API contract or language spec, don't depend on it.
- **Whoever allocates a resource releases it**: Use context managers in Python (`with`), `beforeDestroy` cleanup in Vue Options-API components.

→ See https://kolibri-dev.readthedocs.io/en/latest/code_quality.html.md for detailed examples (LLM-friendly Markdown version; drop `.md` for the HTML rendering). The full docs index is at https://kolibri-dev.readthedocs.io/en/latest/llms.txt.

### Python Conventions (Extended)

- **Logging**: `logger = logging.getLogger(__name__)` at module level.
- **Constants**: Uppercase strings in dedicated modules with `choices` tuples for model fields.
- **Model permissions**: DRF permission classes applied via `permission_classes = [...]` on viewsets. Studio's project-specific classes live alongside the viewset code in `contentcuration/contentcuration/viewsets/`.

### Sync Architecture (Studio-Specific)

Studio is unique among Learning Equality codebases in that domain state is propagated via durable change records rather than direct mutations. This enables collaborative editing of channels and offline tolerance.

**Why it exists.** Channel authoring is a multi-user, often-offline workflow. Direct ORM writes on every edit would lose concurrent work and would not survive a temporarily-disconnected client. Instead, edits in the editor produce change records that can be merged on the server and replayed on reconnection.

**Frontend shape — `contentcuration/contentcuration/frontend/shared/data/`:**
- `db.js` — Dexie schema (browser IndexedDB).
- `resources.js` — Resource wrappers around Dexie tables. Frontend code reads and writes via these, not via Dexie directly.
- `changes.js` — generates change records on writes.
- `serverSync.js` — POSTs pending changes to the server sync endpoint and applies returned changes.
- `mergeChanges.js` / `applyRemoteChanges.js` — merge and apply logic.
- `registry.js` — change-table registry.
- `locks.js` — write coordination.

New synced fields or models require updates in three places: the Dexie schema, the resource definition, and the change registry. **Partial additions silently fail to sync** — there is no startup-time validation that catches a model registered in two of three places.

**Backend shape — `contentcuration/contentcuration/viewsets/sync/`:**
- `endpoint.py` — the `/api/sync/` DRF view.
- `base.py` — change application infrastructure.
- `constants.py` — change-type constants. **Must stay in lockstep with the frontend's `constants.js`.**

Server-side direct ORM mutations on synced models are only safe for system-internal operations (publishing, garbage collection, etc.). Anything user-facing must flow through the change pipeline so other connected clients see the update via the sync broadcast.

### Multi-Worktree Isolation

The `Makefile` derives `COMPOSE_PROJECT_NAME` from the current git branch name (`COMPOSE_PROJECT_NAME=studio_$(BRANCH_NAME)`, near the `BRANCH_NAME := $(shell git rev-parse --abbrev-ref HEAD ...)` definition), so docker-compose stacks from different worktrees don't collide. For multiple worktrees running concurrently against the same machine, unique ports are also needed (Django on `:8080`, webpack dev server on `:4000`, MinIO on `:9000`, Postgres on `:5432`) — override via env or override-files.
