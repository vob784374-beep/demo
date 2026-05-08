# UI–API Synchronization Governance
**LMS App — OpenAPI ↔ Claude Design ↔ Backend**

---

## Core Principle

```
OpenAPI spec is the SINGLE source of truth.
No layer (UI, backend, design) may define its own data contract.
Every field rendered, submitted, or validated must trace back to OpenAPI.
```

The three-layer contract stack:

```
┌─────────────────────────────────────────────────────────┐
│  OpenAPI Spec (openapi/openapi.json)                    │
│  ↕ source of truth — all layers derive from here        │
├─────────────────┬───────────────────────────────────────┤
│  Backend        │  UI / Claude Design                   │
│  (Flask routes) │  (Next.js components)                 │
│  Must match     │  Must match                           │
│  spec exactly   │  spec exactly                         │
└─────────────────┴───────────────────────────────────────┘
```

---

## Layer Responsibilities

| Layer | Source of truth for | Must NOT define |
|---|---|---|
| OpenAPI spec | Field names, types, required, formats, error codes | Nothing — it defines everything |
| Backend (Flask) | Business logic, persistence, auth enforcement | Field shapes — these come from spec |
| UI (Next.js) | Rendering, UX patterns, interaction | Validation rules — these come from spec |
| Claude Design | Visual layout, component selection, error display patterns | Data fields — these come from spec |

---

## Change Workflow (Mandatory)

Every API change — new endpoint, modified request, modified response — follows this sequence without exception:

```
Step 1: SPEC FIRST
  Edit openapi/openapi.json (or @blp.doc decorator which regenerates it)
  Run: python scripts/check_spec_drift.py --update
  Run: python scripts/validate_spec.py
  Commit the spec change.

Step 2: UI DESIGN (Claude Design)
  Open openapi/openapi.json
  For each changed schema:
    - Request schema change → update form fields and Zod validation
    - Response schema change → update display components and TypeScript types
    - Error code change → update error display logic
  Update Claude Design annotations or component mapping doc.

Step 3: BACKEND
  Implement route logic to match the spec.
  Run: python scripts/check_spec_drift.py   ← must exit 0

Step 4: FRONTEND TYPES
  Update src/types/*.ts to match updated schemas.
  Update Zod schemas in src/lib/schemas/*.ts.

Step 5: VALIDATE ALL LAYERS
  Backend: pytest (envelope validator catches shape drift)
  Frontend: vitest (type errors catch field mismatches)
  CI: spec-drift job, contract-tests (schemathesis)

Step 6: PR
  Diff must show:
    openapi/openapi.json change
    src/types/ change
    Backend route change
  Reviewer checks all three change together.
```

**The rule: never implement before the spec is committed.**

---

## UI–API Field Mapping

### Mapping Conventions

| OpenAPI field type | Zod rule | React component |
|---|---|---|
| `string`, `minLength: 1` | `z.string().min(1)` | `<Input type="text">` |
| `string`, `format: email` | `z.string().email()` | `<Input type="email">` |
| `string`, `minLength: 8` | `z.string().min(8)` | `<Input type="password">` |
| `string`, `enum: [...]` | `z.enum([...])` | `<Select>` |
| `integer` | `z.number().int()` | `<Input type="number">` |
| `boolean` | `z.boolean()` | `<Checkbox>` or `<Switch>` |
| `string`, `nullable: true` | `.nullable()` | conditional render |
| Response: `string` display field | — | `<p>`, `<span>` |
| Response: `enum` status field | — | `<Badge variant>` |
| Response: `integer` count field | — | `<span>` numeric display |
| Response: pagination `meta` | — | `<Pagination>` nav |

### Concrete LMS Example: Course Creation Form

**OpenAPI request schema (POST /api/v1/courses):**
```json
{
  "required": ["title"],
  "properties": {
    "title":       { "type": "string", "minLength": 1, "maxLength": 200 },
    "description": { "type": "string", "nullable": true },
    "category":    { "type": "string", "nullable": true }
  }
}
```

**Derived Zod schema (src/lib/schemas/course.ts):**
```typescript
export const createCourseSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  description: z.string().nullable().optional(),
  category:    z.string().nullable().optional(),
})
```

**Derived TypeScript type (src/types/course.ts):**
```typescript
export interface Course {
  id:          number
  teacher_id:  number
  title:       string
  description: string | null
  category:    string | null
  is_published: boolean
  created_at:  string
  updated_at:  string
}
```

**Derived UI component mapping:**
```
title       → <Input type="text"> required, maxLength=200
description → <Textarea> optional
category    → <Input type="text"> optional
```

**No field in the form that is not in the spec. No spec field omitted from the form.**

### Course Catalog Card Mapping

**OpenAPI response item (GET /api/v1/courses):**
```json
{
  "id":           integer,
  "title":        string,
  "description":  string | null,
  "category":     string | null,
  "is_published": boolean,
  "created_at":   string (ISO 8601),
  "updated_at":   string (ISO 8601)
}
```

**UI component mapping:**
```
id           → key prop only (not displayed)
title        → <CardTitle>
description  → <p className="line-clamp-3"> (conditional — omit when null)
category     → <Badge variant="secondary"> (conditional — omit when null)
is_published → not displayed on public catalog (filter condition only)
created_at   → not displayed (internal metadata)
updated_at   → not displayed (internal metadata)
```

---

## Validation Consistency Strategy

### The Rule

Every validation constraint in the OpenAPI spec must appear in both:
1. The Zod schema (frontend)
2. The Marshmallow schema (backend)

If either deviates, there is a contract breach.

### Enforcement Table

| OpenAPI constraint | Marshmallow equivalent | Zod equivalent |
|---|---|---|
| `required: [field]` | field without `load_default` | `.min(1)` or without `.optional()` |
| `minLength: N` | `validate=Length(min=N)` | `.min(N)` |
| `maxLength: N` | `validate=Length(max=N)` | `.max(N)` |
| `format: email` | `validate=Email()` | `.email()` |
| `minimum: N` | `validate=Range(min=N)` | `.min(N)` |
| `maximum: N` | `validate=Range(max=N)` | `.max(N)` |
| `enum: [a, b]` | `validate=OneOf([a, b])` | `.enum([a, b])` |
| `nullable: true` | `allow_none=True` | `.nullable()` |

### Validation Error Display Pattern (Standardized)

**API error format (from spec):**
```json
{
  "success":    false,
  "code":       "VALIDATION_ERROR",
  "message":    "title: Field may not be blank.",
  "data":       null,
  "meta":       null,
  "request_id": "uuid"
}
```

**UI error display rules (Claude Design standard):**

| Error type | Display method | Trigger |
|---|---|---|
| Field validation (Zod) | Inline below field — `<p className="text-sm text-destructive">` | `onSubmit` (not `onChange`) |
| API validation error (422) | `toast.error(body.message)` | API response |
| Auth error (401) | `toast.error('Invalid email or password')` | 401 response |
| Auth error (403) | Redirect to login or show toast | 403 response |
| Server error (5xx) | `toast.error('Something went wrong')` | 5xx response |
| Network error | `toast.error('Something went wrong')` | No response |

**Implementation pattern (used in LoginForm, RegisterForm):**
```typescript
catch (err) {
  if (axios.isAxiosError(err) && err.response) {
    const body = err.response.data as ApiResponse<unknown>
    if (err.response.status === 401) {
      toast.error('Invalid email or password')       // specific message
    } else {
      toast.error(body.message ?? 'Something went wrong')  // API message
    }
  } else {
    toast.error('Something went wrong')             // network fallback
  }
}
```

**The message field in the API response IS the user-facing error text. Design UI to display it directly.**

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHANGE TRIGGER                                    │
│  (new feature / modify request / modify response / new error code)  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: OpenAPI Spec Update                                        │
│  • Edit @blp.doc() decorator OR openapi/openapi.json directly      │
│  • python scripts/check_spec_drift.py --update                     │
│  • python scripts/validate_spec.py                                 │
│  • git commit openapi/openapi.json                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴───────────────┐
              │                            │
              ▼                            ▼
┌──────────────────────┐      ┌───────────────────────────────────────┐
│  Step 2: Backend     │      │  Step 3: Frontend (Claude Design)     │
│  • Implement route   │      │  • Update src/types/*.ts              │
│  • Marshmallow       │      │  • Update src/lib/schemas/*.ts (Zod)  │
│    schema matches    │      │  • Update components to match fields  │
│    OpenAPI           │      │  • Update error display per spec code │
│  • pytest passes     │      │  • vitest passes                      │
└──────────┬───────────┘      └─────────────────┬─────────────────────┘
           │                                     │
           └──────────────┬──────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: CI Validation (all must pass)                              │
│  • validate-spec   — OpenAPI syntax valid                          │
│  • spec-drift      — committed spec matches running code           │
│  • test            — 242+ backend tests pass, envelope valid       │
│  • contract-tests  — schemathesis finds no 5xx on valid inputs     │
│  • frontend-test   — vitest passes, TypeScript compiles            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 5: PR Review Checklist                                        │
│  ✓ openapi/openapi.json diff included                              │
│  ✓ src/types/ updated to match new schema                          │
│  ✓ Zod schema updated to match new validation                      │
│  ✓ Component mapping updated (no missing fields)                   │
│  ✓ No breaking change without API version bump                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Claude Design Integration Protocol

Claude Design is the UI design system. Its inputs and outputs are constrained by the OpenAPI spec.

### What Claude Design receives (inputs)

1. `openapi/openapi.json` — the full spec
2. `_bmad-output/architecture/ui-api-sync-governance.md` — this document (field mapping rules)
3. `_bmad-output/planning-artifacts/epics.md` — user stories with acceptance criteria

### What Claude Design produces (outputs)

For each endpoint or screen:
```
Screen: [Name]
Endpoint: [METHOD /path]

Form fields (from request schema):
  [field_name]  type=[openapi_type]  required=[yes/no]  component=[Input|Select|...]
  ...

Display fields (from response schema):
  [field_name]  type=[openapi_type]  component=[Text|Badge|...]
  ...

Validation (from schema constraints):
  [field_name]  rule=[minLength|email|enum...]  message="..."

Error display:
  [http_code]   display=[toast|inline|redirect]  message=[from body.message | hardcoded]
```

### Design audit checklist (before handoff to dev)

- [ ] Every required request field has a form input
- [ ] Every optional request field has a corresponding optional input or is intentionally omitted with justification
- [ ] Every response field used in UI has a mapped component
- [ ] Response fields NOT shown in UI are explicitly listed as "not displayed — internal"
- [ ] Validation messages in the design match what the API returns in `body.message`
- [ ] Error codes (401, 403, 422, 500) all have a defined display behavior

---

## Change Propagation Example

**Scenario:** Add `level` field to Course (beginner / intermediate / advanced)

### Step 1: Update OpenAPI spec

In `app/api/v1/courses/routes.py`:
```python
@courses_bp.doc(
    summary='Create a course',
    # ... existing doc
)
```

In `app/api/v1/courses/schemas.py`, add `level` to `CreateCourseSchema`:
```python
level = fields.Str(
    load_default=None,
    validate=validate.OneOf(['beginner', 'intermediate', 'advanced']),
)
```

Regenerate spec:
```bash
python scripts/check_spec_drift.py --update
python scripts/validate_spec.py
git add openapi/openapi.json app/api/v1/courses/schemas.py
git commit -m "feat(courses): add level field (beginner/intermediate/advanced)"
```

### Step 2: Claude Design update

New field appears in OpenAPI request schema. Design must add:
```
Form field:  level  enum=[beginner, intermediate, advanced]  optional
Component:   <Select> with three options
Validation:  none (optional field, enum enforced server-side)
Display:     <Badge variant="outline"> on course card if level is not null
```

### Step 3: Backend update

`app/models/course.py` — add `level` column:
```python
level = db.Column(db.Enum('beginner', 'intermediate', 'advanced'), nullable=True)
```

`app/services/course_service.py` — add `level` to `_course_to_dict()`:
```python
'level': course.level,
```

### Step 4: Frontend update

`src/types/course.ts`:
```typescript
level: 'beginner' | 'intermediate' | 'advanced' | null
```

`src/lib/schemas/course.ts` (Zod):
```typescript
level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
```

`src/components/catalog/CourseCard.tsx`:
```tsx
{course.level && (
  <Badge variant="outline">{course.level}</Badge>
)}
```

`src/app/(teacher)/teacher/courses/CreateCourseForm.tsx`:
```tsx
<Select name="level" options={['beginner', 'intermediate', 'advanced']} optional />
```

### Step 5: Validate

```bash
python scripts/check_spec_drift.py   # exit 0
pytest                               # all pass
cd frontend && npx vitest run        # all pass
```

All three layers now reflect the same `level` field from the same spec definition.

---

## CI/CD Checks for UI–API Alignment

The existing 4 CI jobs cover backend. Add frontend type-check:

```yaml
# .github/workflows/api-governance.yml (addition)

  frontend-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npx tsc --noEmit   # catches type drift vs backend
      - run: cd frontend && npx vitest run     # catches logic drift vs spec
```

**TypeScript `--noEmit` is the UI's spec-drift detector.** If the backend changes a field name and the frontend type is not updated, the compile fails. This is the equivalent of the backend's `check_spec_drift.py` for the UI layer.

---

## Field Mapping Reference (LMS Entities)

### User (auth responses)

| API field | TS type | UI component | Notes |
|---|---|---|---|
| `id` | `number` | — | key prop only |
| `email` | `string` | `<Input type="email">` / `<span>` | form + display |
| `first_name` | `string` | `<Input type="text">` | form input |
| `last_name` | `string` | `<Input type="text">` | form input |
| `role` | `'student' \| 'teacher' \| 'admin'` | `<Badge>` | display only |
| `is_active` | `boolean` | `<Switch>` (admin) | admin only |
| `access_token` | `string` | — | stored in memory, never displayed |
| `created_at` | `string` | — | not displayed in current stories |

### Course (catalog + management)

| API field | TS type | UI component | Notes |
|---|---|---|---|
| `id` | `number` | — | key prop, URL param |
| `teacher_id` | `number` | — | not displayed |
| `title` | `string` | `<CardTitle>` / `<Input>` | display + form |
| `description` | `string \| null` | `<p className="line-clamp-3">` | conditional |
| `category` | `string \| null` | `<Badge variant="secondary">` | conditional |
| `is_published` | `boolean` | `<Badge>` published/draft | display only |
| `created_at` | `string` | — | internal metadata |
| `updated_at` | `string` | — | internal metadata |

### PaginationMeta (all list responses)

| API field | TS type | UI component |
|---|---|---|
| `page` | `number` | current page indicator |
| `per_page` | `number` | items-per-page display |
| `total` | `number` | total count display, page math |

### Error envelope (all error responses)

| API field | TS type | UI usage |
|---|---|---|
| `success` | `false` | check to determine error path |
| `code` | `string` | switch for specific error handling (401 → hardcoded msg) |
| `message` | `string` | primary user-facing error text |
| `data` | `null` | ignored on errors |
| `meta` | `null` | ignored on errors |
| `request_id` | `string \| null` | log for support (not displayed to user) |

---

## What This Prevents

| Risk | Prevention |
|---|---|
| Designer adds a field the API doesn't return | Claude Design audit checklist — every field must trace to spec |
| Frontend uses `error.detail` but API returns `message` | ApiResponse type enforces `message: string`; no `error` field exists in type |
| Backend renames `first_name` to `firstName` | TypeScript `--noEmit` fails immediately on CI |
| Zod requires `minLength: 5` but backend allows empty | Marshmallow and Zod constraint comparison in PR review |
| New error code added to spec, UI not updated | PR review checklist: error codes must have defined display behavior |
| Response adds a field, UI shows stale data | Type diff visible in PR; `Course` interface updated in same commit |
