# Permission Matrix - LMS Application

## Overview

This document defines the complete permission system for the LMS application. It follows production best practices with both coarse-grained (role-based) and fine-grained (permission-based) access control.

---

## Roles

| Role | Description | Default User Type |
|------|-------------|-------------------|
| `admin` | Full system access | System administrator |
| `teacher` | Content creator & manager | Course instructor |
| `student` | Learning consumer | Enrolled learner |

---

## Permission Definitions

### User Management
| Permission | Description |
|------------|-------------|
| `user:list` | View all users (admin only) |
| `user:view` | View user details |
| `user:create` | Create new users |
| `user:update` | Update user information |
| `user:delete` | Delete users |
| `user:activate` | Activate user account |
| `user:deactivate` | Deactivate user account |
| `user:change_role` | Change user role |

### Course Management
| Permission | Description |
|------------|-------------|
| `course:list` | List/view course catalog |
| `course:view` | View course details |
| `course:create` | Create new course |
| `course:update` | Update own course |
| `course:delete` | Delete own course |
| `course:publish` | Publish course |
| `course:unpublish` | Unpublish course |

### Lesson Management
| Permission | Description |
|------------|-------------|
| `lesson:list` | List lessons in course |
| `lesson:view` | View lesson content |
| `lesson:create` | Create new lesson |
| `lesson:update` | Update lesson |
| `lesson:delete` | Delete lesson |

### Enrollment
| Permission | Description |
|------------|-------------|
| `enrollment:list` | List enrollments |
| `enrollment:view` | View enrollment details |
| `enrollment:create` | Enroll in course |

### Progress Tracking
| Permission | Description |
|------------|-------------|
| `progress:view_own` | View own progress |
| `progress:view_student` | View student progress (teachers view own course students) |
| `progress:update` | Update lesson progress |

### Exercises
| Permission | Description |
|------------|-------------|
| `exercise:list` | List exercises |
| `exercise:view` | View exercise |
| `exercise:create` | Create exercise |
| `exercise:update` | Update exercise |
| `exercise:delete` | Delete exercise |
| `exercise:submit` | Submit exercise answer |

### Assessments
| Permission | Description |
|------------|-------------|
| `assessment:list` | List assessments |
| `assessment:view` | View assessment |
| `assessment:create` | Create assessment |
| `assessment:update` | Update assessment |
| `assessment:delete` | Delete assessment |
| `assessment:submit` | Submit assessment |
| `assessment:grade` | Grade assessment submission |

### Media
| Permission | Description |
|------------|-------------|
| `media:upload` | Upload media files |
| `media:view` | View media content |
| `media:delete` | Delete media files |

### Dashboard & Analytics
| Permission | Description |
|------------|-------------|
| `dashboard:view_own` | View own dashboard |
| `dashboard:view_students` | View student analytics (teachers) |
| `dashboard:view_teachers` | View teacher analytics (admin) |
| `dashboard:view_admin` | View admin dashboard |

---

## Role-Permission Matrix

### Admin Permissions
```
ADMIN has ALL permissions (full system access)
```

### Teacher Permissions
```
DASHBOARD
✓ dashboard:view_own
✓ dashboard:view_students

COURSES
✓ course:list
✓ course:view
✓ course:create
✓ course:update (own only)
✓ course:delete (own only)
✓ course:publish (own only)
✓ course:unpublish (own only)

LESSONS
✓ lesson:list
✓ lesson:view
✓ lesson:create
✓ lesson:update (own courses)
✓ lesson:delete (own courses)

EXERCISES
✓ exercise:list
✓ exercise:view
✓ exercise:create
✓ exercise:update
✓ exercise:delete

ASSESSMENTS
✓ assessment:list
✓ assessment:view
✓ assessment:create
✓ assessment:update
✓ assessment:delete
✓ assessment:grade

MEDIA
✓ media:upload
✓ media:view
✓ media:delete

ENROLLMENT
✓ enrollment:list (own courses)
✓ enrollment:view

PROGRESS
✓ progress:view_student (own courses)
```

### Student Permissions
```
DASHBOARD
✓ dashboard:view_own

COURSES
✓ course:list
✓ course:view (published)

ENROLLMENT
✓ enrollment:create

LESSONS
✓ lesson:list (enrolled)
✓ lesson:view (enrolled)

PROGRESS
✓ progress:view_own
✓ progress:update

EXERCISES
✓ exercise:list
✓ exercise:view
✓ exercise:submit

ASSESSMENTS
✓ assessment:list
✓ assessment:view
✓ assessment:submit

MEDIA
✓ media:view
```

---

## API Usage Examples

### 1. Role-based (legacy compatibility)
```python
from app.middleware import require_role

@require_role('admin')
def list_all_users():
    """Admin only endpoint"""
    ...

@require_role('teacher', 'admin')
def create_course():
    """Teacher or admin"""
    ...
```

### 2. Permission-based (fine-grained)
```python
from app.middleware import require_permission, Permission

@require_permission(Permission.USER_LIST)
def list_users():
    """Requires user:list permission"""
    ...

@require_permission(Permission.COURSE_CREATE, Permission.COURSE_UPDATE)
def manage_courses():
    """Requires either permission"""
    ...
```

### 3. Resource ownership + permission
```python
from app.middleware import require_owner_or_role, Permission

@require_owner_or_role(
    lambda: get_course_teacher_id(course_id),
    Permission.COURSE_UPDATE,
    Permission.COURSE_DELETE
)
def update_course(course_id):
    """Owner OR has permission"""
    ...
```

---

## Security Considerations

1. **Least Privilege**: Each role has only the permissions needed for their functions
2. **Defense in Depth**: Both role AND ownership checks where applicable
3. **Audit Logging**: All permission denials are logged with user_id, path, required roles
4. **Backward Compatibility**: `require_role()` still works for legacy code
5. **Explicit Whitelisting**: Permissions are explicitly granted (no wildcard * except admin)

---

## Future Extensibility

To add new permissions:
1. Add to `Permission` enum in `permissions.py`
2. Add to appropriate role set in `RolePermission`
3. Use `@require_permission()` decorator on new endpoints

Example - Adding a new "super_teacher" role:
```python
# In permissions.py
SUPER_TEACHER = TEACHER | {
    Permission.USER_LIST,
    Permission.DASHBOARD_VIEW_TEACHERS,
}
```