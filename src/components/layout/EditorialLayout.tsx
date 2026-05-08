"use client"

import { Header } from "./Header"
import { Sidebar } from "./Sidebar"

interface EditorialLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    role: "student" | "teacher" | "admin"
  } | null
  showSidebar?: boolean
}

export function EditorialLayout({
  children,
  user,
  showSidebar = false,
}: EditorialLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <div className="flex flex-1">
        {showSidebar && user && <Sidebar role={user.role} />}
        <main
          className={`flex-1 ${
            showSidebar && user ? "lg:pl-64" : ""
          }`}
        >
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header user={null} />
      <main>{children}</main>
    </div>
  )
}