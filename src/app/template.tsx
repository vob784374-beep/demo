'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, type ReactNode } from 'react'

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState<ReactNode>(null)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    setIsExiting(true)
    
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children)
      setIsExiting(false)
    }, 150)

    return () => clearTimeout(exitTimer)
  }, [pathname, children])

  return (
    <div 
      className={isExiting ? 'opacity-0 translate-x-[-10px]' : 'opacity-100 translate-x-0'}
      style={{
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '100vh',
      }}
    >
      {displayChildren}
    </div>
  )
}