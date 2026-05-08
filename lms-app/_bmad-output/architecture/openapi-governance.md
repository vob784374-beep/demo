# OpenAPI Governance Architecture
**LMS API — Synchronization & Enforcement Strategy**

---

## Strategy: Code-First with Spec Lock

The LMS API uses **flask-smorest** to generate the OpenAPI spec dynamically from route decorators and `@blp.doc()` annotations. This is Option B (code-first), not contract-first generation.

**The governance mechanism is a spec lock**: `openapi/openapi.json` is the committed, frozen snapshot of the spec. CI fails if the running code would generate a different spec. Developers must regenerate and commit the snapshot after every API change.

```
Code changes (routes / @blp.doc) → run check_spec_drift.py --update → commit spec → CI passes
```

This gives the same guarantees as contract-first (spec is always in version control, changes are visible in PR diffs) while being far simpler to operate for a single-team Flask project.

---

## Enforcement Layers

```
Layer 1: Pre-commit (local)        Layer 2: CI on PR          Layer 3: Runtime (dev/test)
─────────────────────────────      ──────────────────────      ──────────────────────────────
Developer edits a route            validate-spec job           response_envelope_validator
  ↓                                  ↓ openapi-spec-validator     checks every response has:
Adds @blp.doc() annotation         spec-drift job                success, code, message,
  ↓                                  ↓ diff committed vs live     data, meta, request_id
flask spec-dump -o openapi.json    test job                      Tests fail immediately if
  ↓                                  ↓ 242 tests + envelope       any route returns the
git commit (code + spec together)  contract-tests job            wrong shape
                                     ↓ schemathesis generates
                                       random requests from spec
```

---

## Change Workflow (Mandatory for Every API Change)

### Adding a new endpoint

```
1. DESIGN
   Write the endpoint contract in a @blp.doc() decorator BEFORE implementing logic:

   @courses_bp.route('/<int:course_id>/duplicate', methods=['POST'])
   @courses_bp.doc(
       summary='Duplicate a course',
       description='Creates an unpublished copy of an existing course.',
       security=[{'BearerAuth': []}],
       responses={
           201: {'description': 'Copy created'},
           403: {'description': 'Not the course owner'},
           404: {'description': 'Course not found'},
       },
   )
   @require_role('teacher', 'admin')
   def duplicate_course(course_id: int):
       pass  # implement next

2. IMPLEMENT
   Write the route logic and service function with tests.

3. UPDATE SPEC
   python scripts/check_spec_drift.py --update

4. VALIDATE
   python scripts/validate_spec.py

5. COMMIT
   git add app/api/v1/courses/routes.py openapi/openapi.json tests/...
   git commit -m "feat(courses): add POST /courses/<id>/duplicate"

6. PR
   The PR diff shows both the code change AND the spec change side-by-side.
   Reviewer checks: is the summary clear? are all error codes documented? is
   the response description accurate?
```

### Modifying an existing endpoint (backward-compatible)

```
1. Update @blp.doc() first — treat it as the contract
2. Update implementation and tests
3. python scripts/check_spec_drift.py --update
4. python scripts/validate_spec.py
5. Commit code + openapi/openapi.json together in one commit
```

### Breaking change (new API version)

```
1. Create app/api/v2/ directory
2. Add v2 blueprints with url_prefix='/api/v2/...'
3. Register in api/v2/__init__.py → register_blueprints(smorest_api)
4. Keep v1 routes intact (no changes)
5. Spec will now contain both /api/v1/* and /api/v2/* paths
6. Update spec snapshot: python scripts/check_spec_drift.py --update
```

---

## CI/CD Pipeline

```yaml
# .github/workflows/api-governance.yml

jobs:
  validate-spec:     # openapi-spec-validator — fails on malformed YAML/JSON
  spec-drift:        # diff committed spec vs generated spec — fails on divergence
  test:              # pytest + envelope validator — fails if any response missing required fields
  contract-tests:    # schemathesis — generates random valid/invalid inputs from spec, checks no 500s
```

**Build fails if**:
- Spec JSON is syntactically invalid
- Any field or path was added/removed without updating `openapi/openapi.json`
- Any route returns a response missing `success`, `code`, `message`, `data`, `meta`, or `request_id`
- Any random valid request from the spec causes a 5xx response

---

## Spec Drift Detection (Core Mechanism)

```python
# scripts/check_spec_drift.py
# CI usage:
python scripts/check_spec_drift.py          # exits 1 if drift, 0 if clean

# Developer usage (after route changes):
python scripts/check_spec_drift.py --update # regenerates openapi/openapi.json
```

The script generates the live spec by instantiating `create_app('development')` in-process, calls `app.extensions['smorest'].spec.to_dict()`, and diffs it against the committed file using `json.dumps(sort_keys=True)` for deterministic comparison.

---

## Runtime Envelope Validation

Active in **development** and **testing** environments via `VALIDATE_RESPONSE_ENVELOPE = True`:

```python
# app/middleware/response_envelope_validator.py

# Every JSON response is checked for:
required = {'success', 'code', 'message', 'data', 'meta', 'request_id'}

# Invariants:
# - success=True  → status 2xx
# - success=False → status 4xx or 5xx
# - 204 responses are excluded
```

In **testing**: raises `AssertionError` immediately (test fails hard).
In **development**: logs `WARNING` via structlog (never raises, never crashes prod).
In **production**: completely disabled (zero overhead).

---

## API Versioning Strategy

```
URL versioning:  /api/v1/*  /api/v2/*
Spec location:   Both versions in a single openapi.json (flask-smorest merges all blueprints)
Breaking changes: require v2 — v1 routes are kept intact until deprecated
Deprecation:     Add x-deprecated: true to the @blp.doc() and set a sunset date
```

**Breaking change definition** (requires version bump):
- Removing an endpoint
- Renaming a field that clients read
- Changing a field type
- Making a previously optional field required

**Non-breaking** (safe in same version):
- Adding optional response fields
- Adding new endpoints
- Adding new optional query parameters
- Expanding enum values

---

## Developer CLI Reference

```bash
# Preview docs locally (opens browser)
python scripts/preview_docs.py

# Check if spec is up to date
python scripts/check_spec_drift.py

# Regenerate spec snapshot after route changes
python scripts/check_spec_drift.py --update

# Validate spec syntax and LMS style rules
python scripts/validate_spec.py

# Export spec as YAML
flask spec-dump --format yaml -o openapi/openapi.yaml

# Export spec as JSON (stdout)
flask spec-dump

# Run contract tests locally (requires running app)
schemathesis run http://localhost:5000/api/openapi.json \
  --checks=not_a_server_error \
  --hypothesis-max-examples=50
```

---

## Git Workflow

```
main        (protected — direct push blocked)
  └── develop  (integration branch)
        └── feature/add-course-duplicate   ← feature branch
              Step 1: implement code
              Step 2: check_spec_drift.py --update
              Step 3: git commit code + openapi.json
              Step 4: open PR → CI runs 4 governance jobs
              Step 5: reviewer checks spec diff for contract correctness
              Step 6: merge to develop → merge to main
```

**PR review checklist for API changes**:
- [ ] `openapi/openapi.json` diff included in the PR
- [ ] New endpoints have `summary`, `description`, and all error response codes documented
- [ ] Breaking changes → new API version proposed
- [ ] `security` declared on all authenticated routes
- [ ] All CI jobs passing (validate-spec, spec-drift, test, contract-tests)

---

## Swagger UI and Documentation

- **Development**: `http://localhost:5000/api/docs` — live, always current
- **Staging/Production**: served at `{APP_URL}/api/docs` — updated on every deployment
- **Raw spec**: `{APP_URL}/api/openapi.json` — consumed by frontend SDK generators

Since flask-smorest generates the spec dynamically at startup from the registered routes, Swagger UI always reflects the running code. There is no separate documentation deployment step.

---

## What This Architecture Prevents

| Scenario | Prevention Mechanism |
|---|---|
| Developer adds endpoint, forgets to document it | `spec-drift` CI job: committed spec won't include new route → drift detected |
| Developer changes error message format | Envelope validator: tests fail if `message` field structure changes |
| Route returns raw dict instead of success_response() | Envelope validator: `AssertionError` raised in test |
| Spec has broken JSON syntax | `validate-spec` CI job with openapi-spec-validator |
| Route causes 500 on valid input | Schemathesis contract tests catch it |
| Breaking change merged to v1 without version bump | PR review checklist + diffing the spec change |
