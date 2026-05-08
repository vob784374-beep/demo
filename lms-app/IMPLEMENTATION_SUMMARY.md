Permission management system - implementation summary

## Overview
Implemented full RBAC (Role-Based Access Control) UI for admin to manage permissions per role.

---

## Backend Implementation

### 1. Database Models
- **Permission model** (`backend/app/models/permission.py`): Stores permission definitions (id, name, description, category)
- **RolePermission** (association table): Links roles to permissions (many-to-many)

### 2. Migration
- **Alembic migration**: `migrations/versions/add_permissions_tables.py`
- Creates `permissions` and `role_permissions` tables

### 3. Service Layer
- **Permission service** (`backend/app/services/permission_service.py`)
  - `get_all_permissions()` - fetch all from DB with optional enum fallback
  - `get_role_permissions(role_name)` - DB-first lookup with hardcoded fallback
  - `assign_permission_to_role()`, `remove_permission_from_role()`, `set_role_permissions()`
  - `sync_permissions_from_enum()` - auto-create missing permissions from Permission enum

### 4. Middleware Updates
- **`permissions.py`**: Modified `get_role_permissions()` to check DB first, fallback to hardcoded RolePermission sets
- Keeps `require_permission` and `require_owner_or_role` decorators

### 5. API Endpoints
- **Blueprint**: `backend/app/api/v1/permissions/`
  - `GET /api/v1/permissions/all` - grouped by category
  - `GET /api/v1/permissions/flat` - flat list
  - `GET /api/v1/permissions/roles` - all roles with permissions
  - `GET /api/v1/permissions/roles/<role>` - specific role
  - `PUT /api/v1/permissions/roles/<role>` - replace role permissions
  - `POST /api/v1/permissions/roles/<role>/permissions/<perm>` - add permission
  - `DELETE /api/v1/permissions/roles/<role>/permissions/<perm>` - remove permission
  - `POST /api/v1/permissions/sync` - create missing permissions from enum

All require admin-level permission (`SYSTEM_SETTINGS_VIEW` / `SYSTEM_SETTINGS_UPDATE`).

### 6. CLI Commands
- `flask seed-db` - now also syncs permissions and assigns default role permissions
- `flask sync-permissions` - create missing permissions from enum
- `flask set-role-permissions` - (re)assign default permission sets to admin/teacher/student

---

## Frontend Implementation

### 1. API Client
- **`frontend/src/lib/api/permissions.ts`**
  - `fetchPermissionCategories()` - grouped data
  - `fetchAllPermissions()` - flat list
  - `fetchRolesWithPermissions()` - roles + their permissions
  - `updateRolePermissions()` - bulk update
  - `addPermissionToRole()`, `removePermissionFromRole()`

### 2. UI Components
- **`frontend/src/app/admin/permissions/page.tsx`** - Main permissions management page
  - Tabs for each role (Admin, Teacher, Student)
  - Permissions grouped by category with checkboxes
  - Save button per role
  - Shows user count per role
  
- **`frontend/src/components/admin/PermissionGroup.tsx`** - Renders a category card with permission checkboxes

### 3. Navigation
- Added "Permission Management" card to Admin Dashboard (`admin/dashboard/page.tsx`)
- Links to `/admin/permissions`

---

## Usage

### First-time setup
1. Run migration: `flask db upgrade`
2. Seed data: `flask seed-db`
   - Creates all permissions from enum
   - Assigns default permissions to admin/teacher/student roles
   - Adds test users

### Using the UI
1. Log in as admin
2. Go to Admin Dashboard → Permission Management
3. Select role tab (Admin/Teacher/Student)
4. Toggle permissions with checkboxes
5. Click "Save Changes"

### Permissions reference
All permissions are defined in `backend/app/middleware/permissions.py` as `Permission` enum:
- User Management (user:list, user:create, ...)
- Course Management (course:list, course:create, ...)
- Lesson Management
- Enrollment
- Progress Tracking
- Exercises
- Assessments
- Media
- Dashboard & Analytics
- System Settings

---

## Design Decisions

1. **DB-backed with enum fallback**: DB is source of truth for assignments; permissions themselves exist in both DB and enum. DB allows UI to edit; enum provides defaults and validation.

2. **Role-centric UI**: Permissions are edited per role (not per user) - standard RBAC pattern.

3. **Permission categories**: Grouped by resource type for easier management.

4. **Backward compatibility**: Existing `require_role` decorator unchanged; `get_role_permissions` enhanced but falls back to hardcoded if DB fails.

5. **Automatic sync on seed**: Ensures fresh dev databases always have permissions synced.

---

## Notes
- The permission update API replaces all permissions for a role (simpler than incremental adds/removes)
- UI state is local per-role; only saves when Save clicked
- No audit logging yet (can be added later via existing `log_permission_denied` pattern)
- Admin role has all permissions implicitly (if DB missing, falls back to hardcoded full set)
