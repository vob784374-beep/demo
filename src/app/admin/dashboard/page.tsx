'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { fetchAdminStats } from '@/lib/api/admin'
import type { AdminStats } from '@/lib/api/admin'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    const load = async () => {
      const data = await fetchAdminStats()
      setStats(data)
    }
    load()
  }, [])

  const displayStats = stats || {
    total_courses: 0,
    student_count: 0,
    teacher_count: 0,
    total_enrollments: 0,
  }

  return (
    <>
      <Header user={null} />
      <main className="container mx-auto max-w-6xl px-4 py-8 page-content">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">LMS System Management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-primary">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Courses</p>
                <p className="text-2xl font-bold">{displayStats.total_courses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-blue-600">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{displayStats.student_count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-green-600">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">{displayStats.teacher_count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-400">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-purple-600">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enrollments</p>
                <p className="text-2xl font-bold">{displayStats.total_enrollments}</p>
              </div>
            </div>
          </div>
        </div>

         <div>
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-semibold animate-fade-in-up">Management</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Link href="/admin/users" className="animate-fade-in-up delay-500">
               <div className="border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover-lift bg-card">
                 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-primary">
                     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                     <circle cx="9" cy="7" r="4" />
                     <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                     <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                   </svg>
                 </div>
                 <h3 className="font-semibold mb-1">User Management</h3>
                 <p className="text-sm text-muted-foreground">Manage student and teacher accounts</p>
               </div>
             </Link>
             
             <Link href="/admin/permissions" className="animate-fade-in-up delay-600">
               <div className="border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover-lift bg-card">
                 <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-purple-600">
                     <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                     <path d="M9 12l2 2 4-4" />
                   </svg>
                 </div>
                 <h3 className="font-semibold mb-1">Permission Management</h3>
                 <p className="text-sm text-muted-foreground">Configure role-based access controls</p>
               </div>
             </Link>
             
             <Link href="/student/courses" className="animate-fade-in-up delay-700">
               <div className="border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover-lift bg-card">
                 <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-green-600">
                     <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                   </svg>
                 </div>
                 <h3 className="font-semibold mb-1">Course Management</h3>
                 <p className="text-sm text-muted-foreground">Create and edit courses</p>
               </div>
             </Link>
           </div>
         </div>
      </main>
    </>
  )
}