'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="s500">
      <div className="s500-static"></div>
      <div className="s500-glow-left"></div>
      <div className="s500-glow-right"></div>
      <div className="s500-layout">
        <div className="s500-left">
          <div className="s500-status-chip">
            <div className="s500-status-dot"></div>
            <span className="s500-status-text">System Fault</span>
          </div>
          <div className="s500-big-num">500</div>
          <h1 className="s500-title">Internal Server Error</h1>
          <p className="s500-sub">
            Something broke on our end. Our engineering team has been automatically notified and is investigating.
          </p>
          <div className="s500-actions">
            <button className="btn-purple" onClick={reset}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Retry Request
            </button>
            <button className="btn-purple-outline" onClick={() => router.push('/admin/dashboard')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 12l6-6M3 12l6 6"/>
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="s500-right">
          <div className="s500-term-header">
            <div className="s500-term-dots">
              <div className="s500-term-dot r"></div>
              <div className="s500-term-dot y"></div>
              <div className="s500-term-dot g"></div>
            </div>
            <span className="s500-term-label">ielts-cms · error.log · live</span>
          </div>
          <div className="s500-term-window">
            <div className="s500-term-scroll" id="term-scroll">
              <span className="tl"><span className="tl-dim">[09:38:01]</span> <span className="tl-green">INFO</span>  <span className="tl-white">Server listening on port 8080</span></span>
              <span className="tl"><span className="tl-dim">[09:38:02]</span> <span className="tl-green">INFO</span>  <span className="tl-white">DB pool initialized — max: 20 connections</span></span>
              <span className="tl"><span className="tl-dim">[09:38:04]</span> <span className="tl-green">INFO</span>  <span className="tl-white">Redis cache connected at localhost:6379</span></span>
              <span className="tl"><span className="tl-dim">[09:40:11]</span> <span className="tl-blue">REQ</span>   <span className="tl-purple">GET</span> <span className="tl-white">/api/courses/dashboard</span> <span className="tl-green">200</span> <span className="tl-dim">11ms</span></span>
              <span className="tl"><span className="tl-dim">[09:40:14]</span> <span className="tl-blue">REQ</span>   <span className="tl-purple">GET</span> <span className="tl-white">/api/users/me</span> <span className="tl-green">200</span> <span className="tl-dim">4ms</span></span>
              <span className="tl"><span className="tl-dim">[09:40:55]</span> <span className="tl-amber">WARN</span>  <span className="tl-white">DB pool utilisation at 87% — approaching limit</span></span>
              <span className="tl"><span className="tl-dim">[09:41:01]</span> <span className="tl-blue">REQ</span>   <span className="tl-purple">POST</span> <span className="tl-white">/api/assess/submit</span> <span className="tl-green">200</span> <span className="tl-dim">78ms</span></span>
              <span className="tl"><span className="tl-dim">[09:41:03]</span> <span className="tl-red">ERROR</span> <span className="tl-white">Unhandled exception in route handler</span></span>
              <span className="tl"><span className="tl-dim">          </span>         <span className="tl-dim">at async handler (app/api/users:34)</span></span>
              <span className="tl"><span className="tl-dim">[09:41:03]</span> <span className="tl-blue">REQ</span>   <span className="tl-purple">GET</span> <span className="tl-white">/api/current-route</span> <span className="tl-red">500</span> <span className="tl-dim">5001ms</span></span>
              <span className="tl"><span className="tl-dim">[09:41:03]</span> <span className="tl-amber">ALERT</span> <span className="tl-white">Incident auto-reported → ops@ielts-pro.edu</span></span>
              <span className="tl"><span className="tl-dim">[09:41:03]</span> <span className="tl-purple">SYS</span>   <span className="tl-white">Awaiting recovery</span> <span className="s500-cursor"></span></span>
            </div>
            <div className="s500-term-footer">
              <span className="s500-term-stat">uptime <span>99.91%</span></span>
              <span className="s500-term-stat">region <span>ap-southeast-1</span></span>
              <span className="s500-term-stat">build <span>v3.12.4</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}