import { useState } from 'react'
import { toast } from 'sonner'
import { createPermission } from '@/lib/api/permissions'

interface CreatePermissionModalProps {
  onClose: () => void
  onCreated?: () => void
}

export function CreatePermissionModal({ onClose, onCreated }: CreatePermissionModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Dashboard',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category) {
      toast.error('Please fill in the required fields')
      return
    }
    setLoading(true)
    try {
      const created = await createPermission(formData)
      if (created) {
        toast.success('Permission created successfully')
        onCreated?.()
        onClose()
      } else {
        toast.error('Failed to create permission')
      }
    } catch (error) {
      console.error('Failed to create permission:', error)
      toast.error('Failed to create permission')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Create New Permission</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Permission Name (e.g., user:create)"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Dashboard">Dashboard</option>
            <option value="Course">Course</option>
            <option value="User">User</option>
            <option value="Assessment">Assessment</option>
          </select>
          <button type="submit">Create Permission</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  )
}