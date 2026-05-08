'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { fetchUsers, updateUser, createUser, type UserListItem, fetchAdminStats, type AdminStats } from '@/lib/api/admin'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { useAuthStore } from '@/lib/stores/authStore'
import type { UserRole } from '@/types/user'

const ROLE_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  teacher: { label: 'Instructor', color: '#0891B2', bg: 'rgba(8,145,178,0.10)' },
  student: { label: 'Student', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.[0] || ''
  const last = lastName?.[0] || ''
  return (first + last).toUpperCase() || 'U'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return '—'
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [activeTab, setActiveTab] = useState('Profile')
  const [updating, setUpdating] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'student' as UserRole,
    is_active: true
  })
  const [creating, setCreating] = useState(false)
  
  const authUser = useAuthStore((s) => s.user)
  const authRole = useAuthStore((s) => s.role)

  const filteredUsers = useMemo(() => {
    if (selectedRole === 'all') return users
    return users.filter(u => u.role === selectedRole)
  }, [users, selectedRole])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, statsData] = await Promise.all([
        fetchUsers(1, 100, search || undefined),
        fetchAdminStats()
      ])
      if (usersData) setUsers(usersData.users)
      if (statsData) setStats(statsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadData()
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdating(true)
    try {
      await updateUser(userId, { role: newRole })
      toast.success('Role updated')
      await loadData()
    } catch (error) {
      console.error('Failed to update role:', error)
      toast.error('Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusToggle = async (user: UserListItem) => {
    setUpdating(true)
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
      await loadData()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
      toast.error('Please fill in all required fields')
      return
    }
    setCreating(true)
    try {
      const created = await createUser(newUser)
      if (created) {
        toast.success('User created successfully')
        setShowAddUserModal(false)
        setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'student', is_active: true })
        await loadData()
      } else {
        toast.error('Failed to create user')
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      toast.error('Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleSelectUser = (userId: number, checked: boolean) => {
    const newSet = new Set(selectedUsers)
    if (checked) newSet.add(userId)
    else newSet.delete(userId)
    setSelectedUsers(newSet)
  }

  const pageContent = (
    <>
      {/* Page Header */}
      <div className="page-header-modern">
        <div className="page-header-top-modern">
          <div>
            <h1 className="page-title-modern">Users & Roles</h1>
            <p className="page-sub-modern">Manage accounts, assign roles, and control system access</p>
          </div>
          <div className="header-actions-modern">
            <button className="btn-ghost-modern" onClick={() => toast.info('Import feature coming soon')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import
            </button>
            <button className="btn-primary-modern" onClick={() => setShowAddUserModal(true)}>
              <Plus width="14" height="14" />
              Add User
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="stats-strip-modern">
          <div className="stat-cell-modern">
            <div className="stat-icon-modern" style={{ background: 'rgba(37,99,235,0.08)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div className="stat-num-modern">{stats?.total_users ?? 0}</div>
              <div className="stat-lbl-modern">Total Users</div>
            </div>
            <div className="stat-delta-modern delta-up">↑ {stats?.active_last_30_days ?? 0} this month</div>
          </div>
          <div className="stat-cell-modern">
            <div className="stat-icon-modern" style={{ background: 'rgba(22,163,74,0.08)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <div className="stat-num-modern">{stats?.active_users ?? 0}</div>
              <div className="stat-lbl-modern">Active</div>
            </div>
            <div className="stat-delta-modern delta-up">
              {stats?.total_users ? Math.round((stats.active_users / stats.total_users) * 100) : 0}%
            </div>
          </div>
          <div className="stat-cell-modern">
            <div className="stat-icon-modern" style={{ background: 'rgba(124,58,237,0.08)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="stat-cell-modern stat-num-modern">{(stats?.admin_count ?? 0) + (stats?.teacher_count ?? 0)}</div>
              <div className="stat-lbl-modern">Staff</div>
            </div>
            <div className="stat-delta-modern" style={{ color: 'var(--text-light)' }}>Enum</div>
          </div>
          <div className="stat-cell-modern">
            <div className="stat-icon-modern" style={{ background: 'rgba(220,38,38,0.07)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <div className="stat-num-modern">{stats?.total_users ? stats.total_users - stats.active_users : 0}</div>
              <div className="stat-lbl-modern">Inactive</div>
            </div>
            <div className="stat-delta-modern delta-down">needs review</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-modern">
        <div className="search-wrap-modern">
          <span className="search-icon-modern">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            className="search-input-modern"
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          />
        </div>
        <div className="filter-group-modern">
          <button 
            className={`filter-btn-modern ${selectedRole === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedRole('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn-modern role-admin ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => setSelectedRole('admin')}
          >
            <span className="role-dot" style={{ background: ROLE_COLORS.admin.color }}></span>Admin
          </button>
          <button 
            className={`filter-btn-modern role-instructor ${selectedRole === 'teacher' ? 'active' : ''}`}
            onClick={() => setSelectedRole('teacher')}
          >
            <span className="role-dot" style={{ background: ROLE_COLORS.teacher.color }}></span>Instructor
          </button>
          <button 
            className={`filter-btn-modern role-student ${selectedRole === 'student' ? 'active' : ''}`}
            onClick={() => setSelectedRole('student')}
          >
            <span className="role-dot" style={{ background: ROLE_COLORS.student.color }}></span>Student
          </button>
        </div>
        <div className="toolbar-right-modern">
          <button className="view-btn-modern active" title="Table view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap-modern">
        <table className="user-table-modern">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input 
                  type="checkbox" 
                  className="row-check-modern"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.student
                return (
                  <tr 
                    key={user.id} 
                    className={selectedUser?.id === user.id ? 'active' : ''}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="row-check-modern"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="user-cell-modern">
                        <div 
                          className="u-avatar-modern" 
                          style={{ background: `linear-gradient(135deg,${roleStyle.color}cc,${roleStyle.color})` }}
                        >
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                        <div>
                          <div className="u-name-modern">{user.first_name} {user.last_name}</div>
                         <div className="u-email-modern">{user.email}</div>
                       </div>
                     </div>
                   </td>
                    <td>
                      <span 
                        className="role-badge-modern"
                        style={{ 
                          '--rc': roleStyle.color, 
                          '--rb': roleStyle.bg, 
                          '--rbo': roleStyle.color + '40' 
                        } as React.CSSProperties}
                      >
                        <span className="role-badge-dot-modern" style={{ background: roleStyle.color }}></span>
                        {roleStyle.label}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-modern status-${user.is_active ? 'active' : 'inactive'}`}>
                        <span className="status-dot-modern"></span>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="last-seen-modern">{formatDate(user.created_at)}</span>
                    </td>
                    <td>
                      <div className="row-actions-modern">
                        <button 
                          className="row-action-btn-modern" 
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedUser(user)
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className="row-action-btn-modern danger" 
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusToggle(user)
                          }}
                        >
                          {user.is_active ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          )}
                         </button>
                       </div>
                     </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        <div className={`bulk-bar-modern ${selectedUsers.size > 0 ? 'show' : ''}`}>
          <span className="bulk-count-modern">{selectedUsers.size} selected</span>
          <div className="bulk-actions-modern">
            <button className="bulk-btn-modern outline" onClick={() => toast.info('Bulk role change coming soon')}>
              Change Role
            </button>
            <button className="bulk-btn-modern outline" onClick={() => toast.info('Export coming soon')}>
              Export
            </button>
            <button className="bulk-btn-modern danger" onClick={() => toast.info('Bulk suspend coming soon')}>
              Suspend
            </button>
          </div>
        </div>
      </div>

      {/* Detail Panel - Modal instead of sidebar */}
      {selectedUser && (
        <div className="detail-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="detail-panel-modern" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header-modern">
              <div className="detail-header-top-modern">
                <span className="detail-title-modern">User Detail</span>
                <button className="detail-close-modern" onClick={() => setSelectedUser(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="detail-user-modern">
                <div 
                  className="detail-avatar-modern" 
                  style={{ 
                    background: `linear-gradient(135deg,${ROLE_COLORS[selectedUser.role]?.color || '#16A34A'}cc,${ROLE_COLORS[selectedUser.role]?.color || '#16A34A'})`
                  }}
                >
                  {getInitials(selectedUser.first_name, selectedUser.last_name)}
                </div>
                <div>
                  <div className="detail-name-modern">{selectedUser.first_name} {selectedUser.last_name}</div>
                  <div className="detail-email-modern">{selectedUser.email}</div>
                  <div className="detail-meta-modern">
                    <span 
                      className="role-badge-modern"
                      style={{ 
                        '--rc': ROLE_COLORS[selectedUser.role]?.color, 
                        '--rb': ROLE_COLORS[selectedUser.role]?.bg,
                        '--rbo': (ROLE_COLORS[selectedUser.role]?.color || '#16A34A') + '40'
                      } as React.CSSProperties}
                    >
                      <span className="role-badge-dot-modern" style={{ background: ROLE_COLORS[selectedUser.role]?.color }}></span>
                      {selectedUser.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-tabs-modern">
              {['Profile', 'Role', 'Activity'].map(tab => (
                <div
                  key={tab}
                  className={`dtab-modern ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </div>
              ))}
            </div>

            <div className="detail-body-modern">
              {activeTab === 'Profile' && (
                <div className="info-section-modern">
                  <div className="info-section-label-modern">Account</div>
                  <div className="info-row-modern">
                    <span className="info-key-modern">Full name</span>
                    <span className="info-val-modern">{selectedUser.first_name} {selectedUser.last_name}</span>
                  </div>
                  <div className="info-row-modern">
                    <span className="info-key-modern">Email</span>
                    <span className="info-val-modern mono">{selectedUser.email}</span>
                  </div>
                  <div className="info-row-modern">
                    <span className="info-key-modern">User ID</span>
                    <span className="info-val-modern mono">USR-{String(selectedUser.id).padStart(3, '0')}</span>
                  </div>
                  <div className="info-row-modern">
                    <span className="info-key-modern">Role</span>
                    <span className="info-val-modern">{ROLE_COLORS[selectedUser.role]?.label || selectedUser.role}</span>
                  </div>
                  <div className="info-row-modern">
                    <span className="info-key-modern">Status</span>
                    <span className="info-val-modern">
                      <span className={`status-badge-modern status-${selectedUser.is_active ? 'active' : 'inactive'}`}>
                        <span className="status-dot-modern"></span>
                        {selectedUser.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'Role' && (
                <div className="role-selector-modern">
                  <div className="role-selector-label-modern">Assigned Role (Enum)</div>
                  <div className="role-options-modern">
                    {Object.entries(ROLE_COLORS).map(([role, style]) => (
                      <div 
                        key={role}
                        className={`role-option-modern ${selectedUser.role === role ? 'selected' : ''}`}
                        style={{ 
                          '--rc': style.color, 
                          '--rb': style.bg 
                        } as React.CSSProperties}
                        onClick={() => handleRoleChange(selectedUser.id, role)}
                      >
                        <div className="role-option-radio-modern"></div>
                        <div className="role-option-info-modern">
                          <div className="role-option-name-modern">{style.label}</div>
                          <div className="role-option-desc-modern">
                            {role === 'admin' && 'Full system access'}
                            {role === 'teacher' && 'Create and manage courses'}
                            {role === 'student' && 'Access enrolled content'}
                  </div>
                </div>
                             </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Activity' && (
                <div className="activity-list-modern">
                  <div className="activity-item-modern">
                    <div className="activity-icon-modern" style={{ background: '#F0FDF4' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div>
                      <div className="activity-action-modern">Login successful</div>
                      <div className="activity-detail-modern">Browser · Location</div>
                      <div className="activity-time-modern">Just now</div>
                    </div>
                  </div>
                </div>
                )}
              </div>

            <div className="detail-footer-modern">
              <button className="btn-save-modern" disabled={updating} onClick={() => toast.success('Changes saved')}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </button>
              <button className="btn-more-modern" title="More actions">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="detail-modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="detail-panel-modern add-user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header-modern">
              <div className="detail-header-top-modern">
                <span className="detail-title-modern">Add New User</span>
                <button className="detail-close-modern" onClick={() => setShowAddUserModal(false)}>
                  <X width="14" height="14" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="detail-body-modern">
                <div className="info-section-modern">
                  <div className="form-grid-modern">
                  <div className="form-group-modern">
                    <label className="form-label-modern">Email *</label>
                    <input
                      type="email"
                      className="form-input-modern"
                      placeholder="user@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">Password *</label>
                    <input
                      type="password"
                      className="form-input-modern"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">First Name *</label>
                    <input
                      type="text"
                      className="form-input-modern"
                      placeholder="John"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">Last Name *</label>
                    <input
                      type="text"
                      className="form-input-modern"
                      placeholder="Doe"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">Role</label>
                    <select
                      className="form-select-modern"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group-modern">
                    <label className="form-label-modern">Status</label>
                    <div className="form-toggle-group-modern">
                      <label className="toggle-switch-modern">
                        <input
                          type="checkbox"
                          checked={newUser.is_active}
                          onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                        />
                        <span className="toggle-track-modern"></span>
                        <span className="toggle-thumb-modern"></span>
                      </label>
                      <span className="toggle-label-modern">{newUser.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="detail-footer-modern">
                <button type="submit" className="btn-save-modern" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
                </button>
                 <button type="button" className="btn-ghost-modern" onClick={() => setShowAddUserModal(false)}>
                   Cancel
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )

  return (
    <RoleGuard requiredRoles={['admin'] as UserRole[]}>
      <DashboardLayout role="admin" user={authUser ? { name: `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || 'User', email: authUser.email || '' } : null}>
        {pageContent}
      </DashboardLayout>
    </RoleGuard>
  )
}