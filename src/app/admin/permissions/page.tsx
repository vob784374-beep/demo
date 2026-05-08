'use client'

import { useEffect, useState, useMemo, Fragment, createPortal } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, X } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { fetchRolesWithPermissions, updateRolePermissions, createPermission, createRole, type RoleWithPermissions, type Permission } from '@/lib/api/permissions'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { useAuthStore } from '@/lib/stores/authStore'
import type { UserRole } from '@/types/user'

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  teacher: { label: 'Instructor', color: '#0891B2', bg: 'rgba(8,145,178,0.10)' },
  student: { label: 'Student', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
}

function getPermissionsByCategory(permissions: RoleWithPermissions['permissions']) {
  return permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = []
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, typeof permissions>)
}

function getCategoryIconSimple(category: string) {
  switch (category) {
    case 'Dashboard':
      return <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3"/>
    case 'Course':
      return <><path d="M4 19V7l8-4 8 4v12"/><path d="M9 19v-5h6v5"/></>
    case 'User':
      return <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>
    case 'Assessment':
      return <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>
    default:
      return <circle cx="12" cy="12" r="10"/>
  }
}

function getCategoryColor(category: string): { bg: string; color: string } {
  switch (category) {
    case 'Dashboard':
      return { bg: 'rgba(37,99,235,0.10)', color: '#2563EB' }
    case 'Course':
      return { bg: 'rgba(8,145,178,0.10)', color: '#0891B2' }
    case 'User':
      return { bg: 'rgba(124,58,237,0.10)', color: '#7C3AED' }
    case 'Assessment':
      return { bg: 'rgba(217,119,6,0.10)', color: '#D97706' }
    default:
      return { bg: 'rgba(22,163,74,0.10)', color: '#16A34A' }
  }
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('admin')
  const [activeTab, setActiveTab] = useState<'matrix' | 'role'>('matrix')
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, Set<string>>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showAddPermModal, setShowAddPermModal] = useState(false)
  const [newPerm, setNewPerm] = useState({
    name: '',
    description: '',
    category: 'Dashboard'
  })
  const [creatingPerm, setCreatingPerm] = useState(false)
  const [showAddRoleModal, setShowAddRoleModal] = useState(false)
  const [newRole, setNewRole] = useState({
    name: '',
    label: '',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.10)',
    description: ''
  })
  const [creatingRole, setCreatingRole] = useState(false)
  const [debug, setDebug] = useState('')

  const authUser = useAuthStore((s) => s.user)
  const authRole = useAuthStore((s) => s.role)

  useEffect(() => {
    setDebug(`activeTab=${activeTab}, showAddRoleModal=${showAddRoleModal}, rolesCount=${roles.length}`)
  }, [activeTab, showAddRoleModal, roles.length])

  const currentRole = roles.find(r => r.name === selectedRole)
  const groupedPermissions = useMemo(() => {
    if (!currentRole) return {}
    return getPermissionsByCategory(currentRole.permissions)
  }, [currentRole])

  // Get all unique categories and permissions across all roles
  const allPermissions = useMemo(() => {
    const permMap = new Map<string, { name: string; scope: string; category: string; description: string | null }>()
    roles.forEach(role => {
      role.permissions.forEach(perm => {
        if (!permMap.has(perm.name)) {
          permMap.set(perm.name, {
            name: perm.name,
            scope: perm.name,
            category: perm.category,
            description: perm.description
          })
        }
      })
    })
    return Array.from(permMap.values())
  }, [roles])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    allPermissions.forEach(p => cats.add(p.category))
    return Array.from(cats)
  }, [allPermissions])

  const getPermissionsForCategory = (category: string) => {
    return allPermissions.filter(p => p.category === category)
  }

  const hasPermission = (roleName: string, permName: string): boolean => {
    const role = roles.find(r => r.name === roleName)
    if (!role) return false
    const tempSelected = selectedPermissions[roleName]
    if (tempSelected) {
      return tempSelected.has(permName)
    }
    return role.permissions.some(p => p.name === permName)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchRolesWithPermissions()
      setRoles(data)
      // Initialize selectedPermissions
      const initial: Record<string, Set<string>> = {}
      data.forEach(role => {
        initial[role.name] = new Set(role.permissions.map(p => p.name))
      })
      setSelectedPermissions(initial)
    } catch (error) {
      console.error('Failed to load permissions:', error)
      toast.error('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Debug: log modal state changes
  useEffect(() => {
    console.log('Modal state changed:', { showAddRoleModal, showAddPermModal, activeTab })
  }, [showAddRoleModal, showAddPermModal, activeTab])

  const handleTogglePermission = (roleName: string, permName: string, checked: boolean) => {
    setSelectedPermissions(prev => {
      const current = new Set(prev[roleName] || new Set<string>())
      if (checked) {
        current.add(permName)
      } else {
        current.delete(permName)
      }
      setHasChanges(true)
      return { ...prev, [roleName]: current }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [roleName, perms] of Object.entries(selectedPermissions)) {
        const role = roles.find(r => r.name === roleName)
        if (role) {
          const currentPerms = new Set(role.permissions.map(p => p.name))
          const newPerms = Array.from(perms)
          // Add new permissions
          newPerms.forEach(p => {
            if (!currentPerms.has(p)) {
              currentPerms.add(p)
            }
          })
          await updateRolePermissions(roleName, Array.from(currentPerms))
        }
      }
      toast.success('Permissions saved successfully')
      setHasChanges(false)
      await loadData()
    } catch (error) {
      console.error('Failed to save permissions:', error)
      toast.error('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    loadData()
    setHasChanges(false)
    toast.info('Changes discarded')
  }

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPerm.name || !newPerm.category) {
      toast.error('Please fill in the required fields')
      return
    }
    setCreatingPerm(true)
    try {
      const created = await createPermission(newPerm)
      if (created) {
        toast.success('Permission created')
        setShowAddPermModal(false)
        setNewPerm({ name: '', description: '', category: 'Dashboard' })
        await loadData()
      } else {
        toast.error('Failed to create permission')
      }
    } catch (error) {
      console.error('Failed to create permission:', error)
      toast.error('Failed to create permission')
    } finally {
      setCreatingPerm(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRole.name || !newRole.label) {
      toast.error('Please fill in the required fields')
      return
    }
    setCreatingRole(true)
    try {
      const created = await createRole({
        name: newRole.name,
        description: newRole.description || null
      })
      if (created) {
        toast.success('Role created successfully')
        setShowAddRoleModal(false)
        setNewRole({ name: '', label: '', color: '#2563EB', bg: 'rgba(37,99,235,0.10)', description: '' })
        await loadData()
      } else {
        toast.error('Failed to create role')
      }
    } catch (error) {
      console.error('Failed to create role:', error)
      toast.error('Failed to create role')
    } finally {
      setCreatingRole(false)
    }
  }

  const grantAllForRole = (roleName: string, category?: string) => {
    setSelectedPermissions(prev => {
      const current = new Set(prev[roleName] || new Set<string>())
      allPermissions.forEach(p => {
        if (!category || p.category === category) {
          current.add(p.name)
        }
      })
      setHasChanges(true)
      return { ...prev, [roleName]: current }
    })
  }

  const revokeAllForRole = (roleName: string, category?: string) => {
    setSelectedPermissions(prev => {
      const current = new Set(prev[roleName] || new Set<string>())
      allPermissions.forEach(p => {
        if (!category || p.category === category) {
          current.delete(p.name)
        }
      })
      setHasChanges(true)
      return { ...prev, [roleName]: current }
    })
  }

  const pageContent = (
    <>
      {/* Page Header */}
      <div className="page-header-permissions">
        <div className="page-header-top-permissions">
          <div>
            <h1 className="page-title-permissions">Permissions</h1>
            <p className="page-sub-permissions">Manage role-based access control and system permissions</p>
          </div>
          <div className="header-actions-permissions">
            <button className="btn-ghost-permissions" onClick={() => setShowAddPermModal(true)}>
              <Plus width="14" height="14" />
              Add Permission
            </button>
            <button className="btn-primary-permissions" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="view-tabs-permissions">
          <div
            className={`view-tab-permissions ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            Matrix View
          </div>
          <div
            className={`view-tab-permissions ${activeTab === 'role' ? 'active' : ''}`}
            onClick={() => setActiveTab('role')}
          >
            Role View
          </div>
        </div>
      </div>

      {/* Changes Bar */}
      <div className={`changes-bar-permissions ${hasChanges ? 'show' : ''}`}>
        <div className="changes-bar-text-permissions">
          You have <strong>{Object.values(selectedPermissions).flatMap(s => Array.from(s)).length}</strong> unsaved changes
        </div>
        <button className="btn-save-bar-permissions" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
        </button>
        <button className="btn-discard-permissions" onClick={handleDiscard}>
          Discard
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* MATRIX VIEW */}
          {activeTab === 'matrix' && (
            <div className="matrix-container-permissions">
              <table className="matrix-table-permissions">
                <thead className="matrix-head-permissions">
                  <tr>
                    <th className="matrix-corner-permissions">
                      <div className="matrix-corner-title-permissions">Permission</div>
                    </th>
                    {roles.map(role => (
                      <th key={role.name} className="role-col-header-permissions">
                        <div className="role-header-card-permissions">
                          <div
                            className="role-header-icon-permissions"
                            style={{ background: ROLE_CONFIG[role.name]?.color || '#2563EB' }}
                          >
                            {role.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="role-header-name-permissions">
                            {ROLE_CONFIG[role.name]?.label || role.name}
                          </div>
                          <div
                            className="role-header-enum-permissions"
                            style={{
                              background: ROLE_CONFIG[role.name]?.bg,
                              color: ROLE_CONFIG[role.name]?.color
                            }}
                          >
                            {role.name.toUpperCase()}
                          </div>
                          <div className="role-header-count-permissions">
                            {role.permissions.length} permissions
                          </div>
                          <div className="col-actions-permissions">
                            <button
                              className="col-action-btn"
                              onClick={() => grantAllForRole(role.name)}
                            >
                              Grant all
                            </button>
                            <button
                              className="col-action-btn"
                              onClick={() => revokeAllForRole(role.name)}
                            >
                              Revoke all
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <Fragment key={category}>
                      {/* Module Row */}
                      <tr className="module-row-permissions">
                        <td className="module-cell-permissions" colSpan={roles.length + 1}>
                          <div className="module-name-permissions">
                            <span
                              className="module-icon-permissions"
                              style={{
                                background: getCategoryColor(category).bg,
                                color: getCategoryColor(category).color
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {getCategoryIconSimple(category)}
                              </svg>
                            </span>
                            {category}
                          </div>
                        </td>
                      </tr>
                      {/* Permission Rows */}
                      {getPermissionsForCategory(category).map(perm => (
                        <tr key={perm.name} className="perm-row-permissions">
                          <td className="perm-label-cell-permissions">
                            <div className="perm-label-name-permissions">{perm.name}</div>
                            <div className="perm-label-scope-permissions">{perm.scope}</div>
                            {perm.description && <div className="perm-label-desc-permissions">{perm.description}</div>}
                          </td>
                          {roles.map(role => {
                            const isGranted = hasPermission(role.name, perm.name)
                            const roleStyle = ROLE_CONFIG[role.name]
                            return (
                              <td key={role.name} className="perm-cell-permissions">
                                <button
                                  className={`cell-toggle-permissions ${isGranted ? 'granted' : ''}`}
                                  style={{
                                    '--role-color': roleStyle?.color,
                                    '--role-bg': roleStyle?.bg,
                                    '--role-border': roleStyle?.color + '40'
                                  } as React.CSSProperties}
                                  onClick={() => handleTogglePermission(role.name, perm.name, !isGranted)}
                                >
                                  {isGranted ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="18" y1="6" x2="6" y2="18"/>
                                      <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ROLE VIEW */}
          {activeTab === 'role' && (
            <div className="role-view-permissions">
               <div className="role-select-bar-permissions">
                {roles.map(role => {
                  const roleStyle = ROLE_CONFIG[role.name]
                  return (
                    <button
                      key={role.name}
                      className={`role-select-btn-permissions ${selectedRole === role.name ? 'active' : ''}`}
                      style={{ '--rc': roleStyle?.color, '--rb': roleStyle?.bg } as React.CSSProperties}
                      onClick={() => setSelectedRole(role.name)}
                    >
                      <span className="role-select-dot-permissions" style={{ background: roleStyle?.color }}></span>
                      <span className="role-select-name-permissions">{roleStyle?.label || role.name}</span>
                      <span className="role-select-enum-permissions">{role.name.toUpperCase()}</span>
                    </button>
                  )
                })}
                <button
                  className="role-select-btn-permissions add-role-btn"
                  title="Add new role"
                  onClick={() => {
                    console.log('Add Role clicked - showing modal')
                    setShowAddRoleModal(true)
                    // Force switch to role tab too
                    setActiveTab('role')
                  }}
                >
                  <Plus width="14" height="14" />
                </button>
              </div>

              <div className="role-detail-permissions">
                {/* Role Info Sidebar */}
                <div className="role-info-side-permissions">
                  {currentRole && (
                    <>
                      <div
                        className="role-info-badge-permissions"
                        style={{ background: ROLE_CONFIG[currentRole.name]?.color || '#2563EB' }}
                      >
                        {currentRole.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="role-info-name-permissions">
                        {ROLE_CONFIG[currentRole.name]?.label || currentRole.name}
                      </div>
                      <div
                        className="role-info-enum-permissions"
                        style={{
                          background: ROLE_CONFIG[currentRole.name]?.bg,
                          color: ROLE_CONFIG[currentRole.name]?.color
                        }}
                      >
                        {currentRole.name.toUpperCase()}
                      </div>
                      <div className="role-info-desc-permissions">
                        {currentRole.description || `${ROLE_CONFIG[currentRole.name]?.label} role for the LMS system`}
                      </div>
                      <div className="role-info-stats-permissions">
                        <div className="role-stat-permissions">
                          <span className="role-stat-label-permissions">Total Permissions</span>
                          <span className="role-stat-val-permissions highlight">{currentRole.permissions.length}</span>
                        </div>
                        <div className="role-stat-permissions">
                          <span className="role-stat-label-permissions">Users Assigned</span>
                          <span className="role-stat-val-permissions">{currentRole.user_count}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Permission List */}
                <div className="perm-list-wrap-permissions">
                  {categories.map(category => (
                    <div key={category} className="perm-module-group-permissions">
                      <div className="perm-module-header-permissions">
                        <span className="perm-module-icon-wrap-permissions" style={{ background: getCategoryColor(category).bg, color: getCategoryColor(category).color }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {getCategoryIconSimple(category)}
                          </svg>
                        </span>
                        <span className="perm-module-label-permissions">{category}</span>
                        <span className="perm-module-badge-permissions">
                          {getPermissionsForCategory(category).filter(p => hasPermission(selectedRole, p.name)).length}/{getPermissionsForCategory(category).length}
                        </span>
                      </div>
                      {getPermissionsForCategory(category).map(perm => {
                        const isGranted = hasPermission(selectedRole, perm.name)
                        return (
                          <div key={perm.name} className="perm-list-item-permissions">
                            <div className="perm-list-text-permissions">
                              <div className="perm-list-name-permissions">{perm.name}</div>
                              <div className="perm-list-scope-permissions">{perm.scope}</div>
                              {perm.description && <div className="perm-list-desc-permissions">{perm.description}</div>}
                            </div>
                            <label className="toggle-lg-permissions">
                              <input
                                type="checkbox"
                                checked={isGranted}
                                onChange={(e) => handleTogglePermission(selectedRole, perm.name, e.target.checked)}
                              />
                              <span className="toggle-lg-track-permissions"></span>
                              <span className="toggle-lg-thumb-permissions"></span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Permission Modal */}
      {showAddPermModal && (
        <div className="detail-modal-overlay" onClick={() => setShowAddPermModal(false)}>
          <div className="detail-panel-modern add-perm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header-modern">
              <div className="detail-header-top-modern">
                <span className="detail-title-modern">Add New Permission</span>
                <button className="detail-close-modern" onClick={() => setShowAddPermModal(false)}>
                  <X width="14" height="14" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreatePermission}>
              <div className="detail-body-modern">
                <div className="info-section-modern">
                  <div className="form-grid-modern">
                    <div className="form-group-modern full-width">
                      <label className="form-label-modern">Permission Name *</label>
                      <input
                        type="text"
                        className="form-input-modern"
                        placeholder="e.g., view_dashboard, edit_course"
                        value={newPerm.name}
                        onChange={(e) => setNewPerm({ ...newPerm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group-modern">
                      <label className="form-label-modern">Category *</label>
                      <select
                        className="form-select-modern"
                        value={newPerm.category}
                        onChange={(e) => setNewPerm({ ...newPerm, category: e.target.value })}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group-modern full-width">
                      <label className="form-label-modern">Description</label>
                      <input
                        type="text"
                        className="form-input-modern"
                        placeholder="Optional description"
                        value={newPerm.description}
                        onChange={(e) => setNewPerm({ ...newPerm, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
               <div className="detail-footer-modern">
                 <button type="submit" className="btn-save-modern" disabled={creatingPerm}>
                   {creatingPerm ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Permission'}
                 </button>
                 <button type="button" className="btn-ghost-modern" onClick={() => setShowAddPermModal(false)}>
                   Cancel
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

        {/* Add Role Modal - Inline styles with !important flags */}
        {showAddRoleModal && (
          <div
            style={{
              position: 'fixed' as const,
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex !important',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2147483647,
              pointerEvents: 'auto' as const,
            }}
            onClick={() => setShowAddRoleModal(false)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '460px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                pointerEvents: 'auto' as const,
              }}
              onClick={e => e.stopPropagation()}
            >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '460px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                border: '2px solid red', // DEBUG: thêm border đỏ để dễ thấy
              }}
              onClick={e => e.stopPropagation()}
              ref={(el) => {
                if (el) {
                  console.log('🟢 Panel mounted:', el)
                  console.log('Panel computed style:', getComputedStyle(el))
                  console.log('Panel dimensions:', el.offsetWidth, 'x', el.offsetHeight)
                }
              }}
            >
              <form onSubmit={handleCreateRole}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 22px 16px',
                  borderBottom: '1px solid #E2E8F0',
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B' }}>Add New Role</span>
                  <button
                    type="button"
                    onClick={() => setShowAddRoleModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X width="14" height="14" />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Role Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., editor, moderator"
                        value={newRole.name}
                        onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Display Label *</label>
                      <input
                        type="text"
                        placeholder="e.g., Editor"
                        value={newRole.label}
                        onChange={e => setNewRole({ ...newRole, label: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Color</label>
                      <input
                        type="color"
                        value={newRole.color}
                        onChange={e => setNewRole({ ...newRole, color: e.target.value })}
                        style={{
                          width: '100%',
                          height: '38px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Background (CSS)</label>
                      <input
                        type="text"
                        placeholder="rgba(...) or hex"
                        value={newRole.bg}
                        onChange={e => setNewRole({ ...newRole, bg: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Description</label>
                      <input
                        type="text"
                        placeholder="Role description"
                        value={newRole.description}
                        onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', marginBottom: '0' }}>
                    Creates a new role in the database. You can assign permissions to it in the matrix above.
                  </p>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  padding: '16px 22px',
                  borderTop: '1px solid #E2E8F0',
                  background: '#F9FAFB',
                  borderRadius: '0 0 12px 12px',
                }}>
                  <button
                    type="submit"
                    disabled={creatingRole}
                    style={{
                      padding: '8px 16px',
                      background: creatingRole ? '#9CA3AF' : '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: creatingRole ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {creatingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {creatingRole ? 'Creating...' : 'Create Role'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRoleModal(false)}
                    style={{
                      padding: '8px 16px',
                      background: 'white',
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
               </form>
              </div>
            </div>
          )}
      // Đóng fragment của pageContent
      </>
    )

    // Render modal via portal to body
    if (showAddRoleModal) {
      return createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647,
          }}
          onClick={() => setShowAddRoleModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '460px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '3px solid #2563EB',
            }}
            onClick={e => e.stopPropagation()}
          >
          <form onSubmit={handleCreateRole}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 16px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Add New Role</h3>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B7280',
                }}
              >
                <X width="16" height="16" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Role Name *</label>
                <input
                  type="text"
                  placeholder="e.g., editor, moderator"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #2563EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Display Label *</label>
                <input
                  type="text"
                  placeholder="e.g., Editor"
                  value={newRole.label}
                  onChange={e => setNewRole({ ...newRole, label: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #2563EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Color</label>
                  <input
                    type="color"
                    value={newRole.color}
                    onChange={e => setNewRole({ ...newRole, color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '40px',
                      border: '2px solid #2563EB',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Background</label>
                  <input
                    type="text"
                    placeholder="rgba() or hex"
                    value={newRole.bg}
                    onChange={e => setNewRole({ ...newRole, bg: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #2563EB',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Description</label>
                <input
                  type="text"
                  placeholder="Role description (optional)"
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #2563EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
                Creates a new role in the database. Assign permissions to it in the matrix above.
              </p>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              background: '#F9FAFB',
              borderRadius: '0 0 12px 12px',
            }}>
              <button
                type="submit"
                disabled={creatingRole}
                style={{
                  padding: '8px 16px',
                  background: creatingRole ? '#9CA3AF' : '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: creatingRole ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {creatingRole ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'white' }} /> : null}
                {creatingRole ? 'Creating...' : 'Create Role'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    )
  }

   return (
    <RoleGuard requiredRoles={['admin'] as UserRole[]}>
      <DashboardLayout role="admin" user={authUser ? { name: `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || 'User', email: authUser.email || '' } : null}>
        {pageContent}
      </DashboardLayout>
    </RoleGuard>
  )
}