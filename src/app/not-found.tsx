'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="s404">
      <div className="s404-left">
        <div className="s404-letter" style={{ width: 44, height: 44, fontSize: 20, background: '#DBEAFE', color: '#1D4ED8', top: '12%', left: '12%' }}>A</div>
        <div className="s404-letter" style={{ width: 36, height: 36, fontSize: 16, background: '#D1FAE5', color: '#065F46', top: '20%', left: '72%' }}>B</div>
        <div className="s404-letter" style={{ width: 48, height: 48, fontSize: 22, background: '#EDE9FE', color: '#5B21B6', top: '68%', left: '10%' }}>C</div>
        <div className="s404-letter" style={{ width: 38, height: 38, fontSize: 17, background: '#FEE2E2', color: '#991B1B', top: '74%', left: '75%' }}>D</div>
        <div className="s404-letter" style={{ width: 42, height: 42, fontSize: 19, background: '#FEF3C7', color: '#92400E', top: '44%', left: '80%' }}>E</div>
        <div className="s404-big-num">404</div>
      </div>
      <div className="s404-right">
        <div className="s404-content">
          <div className="s404-tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Page not found
          </div>
          <h1 className="s404-title">
            Looks like this page<br/>took a <em>wrong turn.</em>
          </h1>
          <p className="s404-sub">
            The resource you&apos;re looking for doesn&apos;t exist in this system or may have been moved. Try searching or use the quick links below.
          </p>

          <div className="s404-search">
            <input className="s404-search-input" type="text" placeholder="Search courses, students, assessments…" />
            <button className="s404-search-btn">Search</button>
          </div>

          <div className="s404-links">
            <Link href="/admin/dashboard" className="s404-link-item">
              <div className="s404-link-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <div>
                <div className="s404-link-text">Course Dashboard</div>
                <div className="s404-link-sub">View all active courses</div>
              </div>
              <span className="s404-link-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </Link>
            <Link href="/admin/users" className="s404-link-item">
              <div className="s404-link-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <div className="s404-link-text">Student Management</div>
                <div className="s404-link-sub">Learner profiles &amp; progress</div>
              </div>
              <span className="s404-link-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </Link>
            <Link href="/system/auth/login" className="s404-link-item">
              <div className="s404-link-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <div className="s404-link-text">Sign In</div>
                <div className="s404-link-sub">Access your account</div>
              </div>
              <span className="s404-link-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}