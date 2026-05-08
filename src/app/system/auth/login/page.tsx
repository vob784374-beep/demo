'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import axios from 'axios'
import { login } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types/user'

const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin/dashboard',
}

// SVG Icons
const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 7 10-7" />
  </svg>
)

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const EyeOnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ErrorIconSmall = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const ErrorIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const ChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showError, setShowError] = useState(false)
  const [emailState, setEmailState] = useState<'error' | 'success' | ''>('')
  const [passwordState, setPasswordState] = useState<'error' | 'success' | ''>('')

  // Edit mode message handlers
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === '__activate_edit_mode') {
        const panel = document.getElementById('tweaks-panel')
        if (panel) panel.classList.add('open')
      }
      if (e.data?.type === '__deactivate_edit_mode') {
        const panel = document.getElementById('tweaks-panel')
        if (panel) panel.classList.remove('open')
      }
    }
    window.addEventListener('message', handleMessage)
    // Notify parent that edit mode is available
    window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const validateEmail = () => {
    if (!email) return false
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    setEmailState(isValid ? 'success' : 'error')
    return isValid
  }

  const validatePassword = () => {
    if (!password) return false
    const isValid = password.length >= 1
    setPasswordState(isValid ? 'success' : 'error')
    return isValid
  }

  const clearEmailState = () => {
    setEmailState('')
    setShowError(false)
  }

  const clearPasswordState = () => {
    setPasswordState('')
    setShowError(false)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setShowError(false)

    let emailValid = true
    let passwordValid = true

    // Validate email
    if (!email.trim()) {
      setEmailState('error')
      emailValid = false
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setEmailState('error')
        emailValid = false
      } else {
        setEmailState('success')
      }
    }

    // Validate password
    if (!password) {
      setPasswordState('error')
      passwordValid = false
    } else {
      setPasswordState('success')
    }

    if (!emailValid || !passwordValid) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await login(email, password)
      if (!response.data) {
        toast.error('Something went wrong')
        return
      }
      const rawUser = response.data.user
      const user: User = {
        id: rawUser.id,
        email: rawUser.email,
        firstName: rawUser.first_name,
        lastName: rawUser.last_name,
        isActive: rawUser.is_active,
        createdAt: rawUser.created_at,
      }
      setAuth(user, rawUser.role, response.data.access_token)
      
      // Show welcome modal first (prototype behavior)
      setShowWelcomeModal(true)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401) {
          setShowError(true)
          setEmailState('error')
          setPasswordState('error')
          toast.error('Invalid email or password')
        } else {
          toast.error(err.response.data?.message ?? 'Something went wrong')
        }
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [modalAck, setModalAck] = useState(false)

  const handleConfirm = () => {
    goToDashboard()
  }

  const handleSkip = () => {
    goToDashboard()
  }

  const closeModalAndGoToDashboard = () => {
    setShowWelcomeModal(false)
    setTimeout(goToDashboard, 200)
  }

  const goToDashboard = () => {
    const role = useAuthStore.getState().role
    router.push(ROLE_DASHBOARD[role ?? 'student'])
  }

  const resetDemo = () => {
    setEmail('')
    setPassword('')
    setEmailState('')
    setPasswordState('')
    setShowError(false)
    setShowWelcomeModal(false)
    setModalAck(false)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-ibm-sans antialiased page-content">
      {/* LEFT PANEL - Navy background */}
      <aside className="flex flex-col relative overflow-hidden bg-[#101E35] w-full md:w-[42%] md:flex-shrink-0 px-6 py-10 md:px-[52px] md:py-[48px]">
        {/* Dot-grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none'
        }} />

        {/* Glow effects */}
        <div className="absolute top-[-80px] right-[-80px] w-[340px] h-[340px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[260px] h-[260px] rounded-full" style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Abstract illustration */}
        <div className="absolute bottom-[100px] left-0 right-0 flex justify-center pointer-events-none hidden md:flex">
          <svg className="w-[320px] opacity-[0.07]" viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60 80 Q160 60 160 140 Q160 60 260 80 L260 220 Q160 200 160 220 Q160 200 60 220 Z" stroke="white" strokeWidth="2" fill="none" />
            <line x1="160" y1="140" x2="160" y2="220" stroke="white" strokeWidth="1.5" />
            <line x1="80" y1="110" x2="150" y2="100" stroke="white" strokeWidth="1" />
            <line x1="80" y1="125" x2="150" y2="116" stroke="white" strokeWidth="1" />
            <line x1="80" y1="140" x2="150" y2="132" stroke="white" strokeWidth="1" />
            <line x1="80" y1="155" x2="150" y2="148" stroke="white" strokeWidth="1" />
            <line x1="170" y1="100" x2="240" y2="110" stroke="white" strokeWidth="1" />
            <line x1="170" y1="116" x2="240" y2="125" stroke="white" strokeWidth="1" />
            <line x1="170" y1="132" x2="240" y2="140" stroke="white" strokeWidth="1" />
            <line x1="170" y1="148" x2="240" y2="155" stroke="white" strokeWidth="1" />
            <polygon points="160,30 120,50 160,70 200,50" stroke="white" strokeWidth="1.5" fill="none" />
            <line x1="200" y1="50" x2="200" y2="68" stroke="white" strokeWidth="1.5" />
            <circle cx="200" cy="72" r="4" fill="none" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Top - Logo */}
        <div className="relative z-10 flex items-center gap-3 fu">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB] flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 19V7l8-4 8 4v12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 19v-5h6v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 7l8 4 8-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[15px] font-semibold text-white tracking-[0.02em] leading-none">
              IELTS Pro CMS
            </span>
            <span className="text-[10px] text-[rgba(255,255,255,0.38)] tracking-[0.06em] uppercase leading-none">
              Course Management System
            </span>
          </div>
        </div>

        {/* Middle - Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center mt-6 md:mt-0">
          {/* System label */}
          <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.12em] uppercase text-[#2563EB] mb-[18px] fu d1">
            <span className="block w-5 h-[1px] bg-[#2563EB]" />
            Internal Access
          </div>

          {/* Title */}
          <h1 className="text-white fu d2" style={{
            fontSize: 'clamp(24px, 2.4vw, 34px)',
            fontWeight: 300,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            marginBottom: '20px'
          }}>
            <strong className="font-semibold block">Manage courses.</strong>
            Track progress.<br />
            Deliver results.
          </h1>

          {/* Description - hidden on small mobile */}
          <p className="text-[rgba(255,255,255,0.4)] text-[13px] leading-[1.75] max-w-[300px] fu d3 hidden md:block">
            Centralised platform for instructors and administrators to manage IELTS preparation courses, learner progress, assessments, and scheduling.
          </p>

          {/* Info pills - hidden on mobile */}
          <div className="flex flex-col gap-[10px] mt-10 fu d4 hidden md:flex">
            <div className="flex items-center gap-[10px] bg-[rgba(255,255,255,0.04)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-lg px-[14px] py-[10px]">
              <div className="w-7 h-7 rounded-lg bg-[rgba(37,99,235,0.20)] flex items-center justify-center text-[#6EA8FE] flex-shrink-0">
                <ListIcon />
              </div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)] leading-[1.4]">
                <strong className="font-medium text-[rgba(255,255,255,0.75)] block">Course Dashboard</strong>
                Live class schedules and learner cohorts
              </div>
            </div>

            <div className="flex items-center gap-[10px] bg-[rgba(255,255,255,0.04)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-lg px-[14px] py-[10px]">
              <div className="w-7 h-7 rounded-lg bg-[rgba(37,99,235,0.20)] flex items-center justify-center text-[#6EA8FE] flex-shrink-0">
                <ChartIcon />
              </div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)] leading-[1.4]">
                <strong className="font-medium text-[rgba(255,255,255,0.75)] block">Assessment Tracker</strong>
                Band score analytics and mock test results
              </div>
            </div>

            <div className="flex items-center gap-[10px] bg-[rgba(255,255,255,0.04)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-lg px-[14px] py-[10px]">
              <div className="w-7 h-7 rounded-lg bg-[rgba(37,99,235,0.20)] flex items-center justify-center text-[#6EA8FE] flex-shrink-0">
                <ClockIcon />
              </div>
              <div className="text-[12px] text-[rgba(255,255,255,0.5)] leading-[1.4]">
                <strong className="font-medium text-[rgba(255,255,255,0.75)] block">Session Management</strong>
                Timetables, attendance, and materials
              </div>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="relative z-10 text-[11px] text-[rgba(255,255,255,0.2)] tracking-[0.03em] fu d5 mt-auto pt-6">
          Authorised access only &nbsp;·&nbsp; © 2026 IELTS Pro
        </p>
      </aside>

      {/* RIGHT PANEL - White form */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-[48px_40px] bg-[#F8FAFC]">
        <div className="w-full max-w-[400px]">
          {/* session badge */}
          <div className="inline-flex items-center gap-2 bg-[#F1F5F9] border-[1.5px] border-[#E2E8F0] rounded-[6px] px-[10px] py-[5px] text-[11px] text-[#64748B] font-ibm-mono tracking-[0.03em] mb-7 fu">
            <span className="w-[6px] h-[6px] rounded-full bg-[#22C55E] box-shadow-[0_0_0_2px_rgba(34,197,94,0.2)] flex-shrink-0" />
            secure.ielts-pro.edu
          </div>

          {/* Form header */}
          <div className="mb-8 pb-7 border-b-[1.5px] border-[#E2E8F0] fu d1">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#94A3B8] font-medium mb-2">
              Administrator / Instructor Sign In
            </div>
            <h2 className="text-[26px] font-semibold text-[#0F172A] tracking-[-0.02em] leading-[1.2] mb-1.5">
              Welcome back
            </h2>
            <p className="text-[13px] text-[#475569]">
              Sign in to access the course management dashboard.
            </p>
          </div>

          {/* Error alert */}
          <div className={cn(
            "flex items-start gap-[10px] bg-[rgba(220,38,38,0.07)] border-[1.5px] border-[rgba(220,38,38,0.2)] rounded-lg p-[12px_14px] mb-5 text-[13px] text-[#DC2626] fu",
            showError ? "flex" : "hidden"
          )}>
            <AlertIcon />
            <span>Incorrect email or password. Please try again.</span>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className={cn(
              "relative field-wrap fu d2",
              emailState === 'error' && 'login-field-error',
              emailState === 'success' && 'login-field-success'
            )}>
              <label htmlFor="email" className="flex items-center justify-between text-[12.5px] font-medium text-[#475569] mb-[7px] tracking-[0.01em]">
                <span>Email address</span>
                <span className="text-[#DC2626] ml-0.5">*</span>
              </label>
              <div className="relative">
                <span className="field-icon absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-[#94A3B8]">
                  <EmailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailState) clearEmailState() }}
                  onBlur={validateEmail}
                  className="w-full h-[46px] bg-[#F1F5F9] border-[1.5px] border-[#E2E8F0] rounded-[9px] px-[42px] text-[14px] placeholder:text-[13.5px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8]"
                  style={{
                    borderColor: emailState === 'error' ? '#DC2626' : emailState === 'success' ? '#16A34A' : undefined,
                    boxShadow: emailState === 'error' ? '0 0 0 3px rgba(220,38,38,0.20)' : emailState === 'success' ? '0 0 0 3px rgba(22,163,74,0.20)' : undefined,
                    background: emailState ? '#FFFFFF' : undefined
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className={cn("flex items-center text-[#DC2626]", emailState === 'error' ? "flex" : "hidden")}>
                    <ErrorIconSmall />
                  </span>
                  <span className={cn("flex items-center text-[#16A34A]", emailState === 'success' ? "flex" : "hidden")}>
                    <CheckIcon />
                  </span>
                </span>
              </div>
              {emailState === 'error' && (
                <div className="flex items-center gap-[5px] mt-[5px] pl-1">
                  <ErrorIcon />
                  <span className="text-[12px] text-[#DC2626]">Enter a valid email address.</span>
                </div>
              )}
              {emailState === 'success' && (
                <div className="flex items-center gap-[5px] mt-[5px] pl-1">
                  <CheckIcon />
                  <span className="text-[12px] text-[#16A34A]">Email looks good.</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div className={cn(
              "relative field-wrap fu d3",
              passwordState === 'error' && 'login-field-error',
              passwordState === 'success' && 'login-field-success'
            )}>
              <label htmlFor="password" className="flex items-center justify-between text-[12.5px] font-medium text-[#475569] mb-[7px] tracking-[0.01em]">
                <span>Password</span>
                <span className="text-[#DC2626] ml-0.5">*</span>
              </label>
              <div className="relative">
                <span className="field-icon absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-[#94A3B8]">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (passwordState) clearPasswordState() }}
                  onBlur={validatePassword}
                  className="w-full h-[46px] bg-[#F1F5F9] border-[1.5px] border-[#E2E8F0] rounded-[9px] px-[42px] text-[14px] placeholder:text-[13.5px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8]"
                  style={{
                    borderColor: passwordState === 'error' ? '#DC2626' : passwordState === 'success' ? '#16A34A' : undefined,
                    boxShadow: passwordState === 'error' ? '0 0 0 3px rgba(220,38,38,0.20)' : passwordState === 'success' ? '0 0 0 3px rgba(22,163,74,0.20)' : undefined,
                    background: passwordState ? '#FFFFFF' : undefined,
                    paddingRight: '72px'
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className={cn("flex items-center text-[#DC2626]", passwordState === 'error' ? "flex" : "hidden")}>
                    <ErrorIconSmall />
                  </span>
                  <span className={cn("flex items-center text-[#16A34A]", passwordState === 'success' ? "flex" : "hidden")}>
                    <CheckIcon />
                  </span>
                  <button
                    type="button"
                    className="text-[#94A3B8] hover:text-[#475569] transition-colors p-0.5 rounded"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeOnIcon />}
                  </button>
                </span>
              </div>
              {passwordState === 'error' && (
                <div className="flex items-center gap-[5px] mt-[5px] pl-1">
                  <ErrorIcon />
                  <span className="text-[12px] text-[#DC2626]">Password cannot be empty.</span>
                </div>
              )}
              {passwordState === 'success' && (
                <div className="flex items-center gap-[5px] mt-[5px] pl-1">
                  <CheckIcon />
                  <span className="text-[12px] text-[#16A34A]">Password entered.</span>
                </div>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between fu d4">
              <label className="flex items-center gap-[9px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="remember"
                  className="cursor-pointer"
                />
                <span className="text-[13px] text-[#475569]">
                  Keep me signed in
                </span>
              </label>
              <a href="#" className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D55D4] transition-colors no-underline">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] bg-[#2563EB] border-none rounded-[9px] text-white font-semibold text-[14.5px] cursor-pointer tracking-[0.01em] transition-all flex items-center justify-center gap-2 relative overflow-hidden fu d5 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.1),_0_4px_16px_rgba(37,99,235,0.28)] hover:bg-[#1D55D4] hover:shadow-[0_1px_3px_rgba(0,0,0,0.1),_0_6px_20px_rgba(37,99,235,0.36)] hover:-translate-y-[1px] active:translate-y-0"
            >
              <div className={cn(
                "border-2 border-[rgba(255,255,255,0.3)] border-t-[#fff] rounded-full",
                isSubmitting ? "animate-spin block w-[18px] h-[18px]" : "hidden"
              )} />
              <span className="btn-label">{isSubmitting ? '' : 'Sign In'}</span>
            </button>
          </form>

          {/* Footer */}
          <div className="flex items-start gap-[10px] mt-7 pt-5 border-t-[1.5px] border-[#E2E8F0] fu d6">
            <div className="w-8 h-8 flex-shrink-0 bg-[#F1F5F9] rounded-lg border-[1.5px] border-[#E2E8F0] flex items-center justify-center text-[#94A3B8]">
              <ShieldIcon />
            </div>
            <p className="text-[11.5px] text-[#94A3B8] leading-[1.6]">
              <strong className="text-[#475569] font-medium">Authorised users only.</strong> This system is for IELTS Pro administrators and instructors. Unauthorised access attempts are logged.
            </p>
          </div>
        </div>
      </main>

      {/* Tweaks Panel (dev tools) */}
      <div id="tweaks-panel">
        <div className="tweak-head">Tweaks</div>

        <div className="tweak-row">
          <span className="tweak-lbl">Show validation demo</span>
          <div className="tweak-opts">
            <button type="button" className="tweak-btn" onClick={() => { setEmailState('error'); setPasswordState('error'); setShowError(true); }}>Error state</button>
            <button type="button" className="tweak-btn" onClick={() => { setEmailState('success'); setPasswordState('success'); setShowError(false); }}>Success state</button>
            <button type="button" className="tweak-btn" onClick={() => { setEmailState(''); setPasswordState(''); setShowError(false); }}>Clear</button>
          </div>
        </div>

        <div className="tweak-row">
          <span className="tweak-lbl">Accent color</span>
          <div className="tweak-opts">
            <button type="button" className="tweak-btn on" onClick={() => {
              document.documentElement.style.setProperty('--blue', '#2563EB')
              document.documentElement.style.setProperty('--blue-hover', '#1D55D4')
              document.documentElement.style.setProperty('--blue-dim', 'rgba(37,99,235,0.10)')
              document.documentElement.style.setProperty('--blue-ring', 'rgba(37,99,235,0.22)')
            }}>Blue</button>
            <button type="button" className="tweak-btn" onClick={() => {
              document.documentElement.style.setProperty('--blue', '#0D7A5F')
              document.documentElement.style.setProperty('--blue-hover', '#0A6B52')
              document.documentElement.style.setProperty('--blue-dim', 'rgba(13,122,95,0.10)')
              document.documentElement.style.setProperty('--blue-ring', 'rgba(13,122,95,0.22)')
            }}>Green</button>
            <button type="button" className="tweak-btn" onClick={() => {
              document.documentElement.style.setProperty('--blue', '#7C3AED')
              document.documentElement.style.setProperty('--blue-hover', '#6B2FD4')
              document.documentElement.style.setProperty('--blue-dim', 'rgba(124,58,237,0.10)')
              document.documentElement.style.setProperty('--blue-ring', 'rgba(124,58,237,0.22)')
            }}>Violet</button>
          </div>
        </div>

        <div className="tweak-row">
          <span className="tweak-lbl">Panel depth</span>
          <div className="tweak-opts">
            <button type="button" className="tweak-btn on" onClick={() => {
              document.documentElement.style.setProperty('--navy', '#101E35')
              const leftPanel = document.querySelector('.panel-left') as HTMLElement | null
              if (leftPanel) leftPanel.style.background = '#101E35'
            }}>Navy</button>
            <button type="button" className="tweak-btn" onClick={() => {
              document.documentElement.style.setProperty('--navy', '#1a1a2e')
              const leftPanel = document.querySelector('.panel-left') as HTMLElement | null
              if (leftPanel) leftPanel.style.background = '#1a1a2e'
            }}>Midnight</button>
            <button type="button" className="tweak-btn" onClick={() => {
              document.documentElement.style.setProperty('--navy', '#1C2B3A')
              const leftPanel = document.querySelector('.panel-left') as HTMLElement | null
              if (leftPanel) leftPanel.style.background = '#1C2B3A'
            }}>Slate</button>
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="modal-backdrop open" style={{ display: 'flex' }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-top">
              <div className="modal-top-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19V7l8-4 8 4v12" /><path d="M9 19v-5h6v5" /><path d="M4 7l8 4 8-4" />
                </svg>
              </div>
              <h2 className="modal-top-title" id="modal-title">Welcome to IELTS CMS</h2>
              <p className="modal-top-sub">Course Management System · Authorised Access</p>
            </div>

            <div className="modal-body">
              <div className="modal-notice">
                <div className="modal-notice-row">
                  <div className="modal-notice-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <div className="modal-notice-text">
                    <strong>Course Dashboard</strong>
                    Manage class schedules, learner cohorts, and course materials from a single workspace.
                  </div>
                </div>
                <div className="modal-notice-row">
                  <div className="modal-notice-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="modal-notice-text">
                    <strong>Restricted System</strong>
                    This platform is for authorised IELTS Pro staff only. All activity is monitored and logged.
                  </div>
                </div>
              </div>

              <label 
                className={`modal-checkbox-wrap ${modalAck ? 'checked' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  id="modal-ack"
                  checked={modalAck}
                  onChange={(e) => setModalAck(e.target.checked)}
                />
                <div className="modal-checkbox-text">
                  <strong>I understand and agree</strong>
                  I acknowledge the terms of use and authorised-access policy for this system.
                </div>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-confirm"
                  disabled={!modalAck}
                  onClick={handleConfirm}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Confirm & Continue
                </button>
                <button
                  type="button"
                  className="btn-modal-skip"
                  onClick={handleSkip}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Placeholder - hidden, for demo */}
      {false && (
        <div className="dashboard-screen" style={{ display: 'none' }}>
          <div className="dash-topbar">
            <div className="dash-logo">
              <div className="dash-logo-mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19V7l8-4 8 4v12" /><path d="M9 19v-5h6v5" /><path d="M4 7l8 4 8-4" />
                </svg>
              </div>
              <span className="dash-logo-name">IELTS Pro CMS</span>
            </div>
            <div className="dash-user">
              <div className="dash-avatar" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #6EA8FE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600, color: '#fff'
              }}>
                {sessionStorage.getItem('dash_avatar') || '??'}
              </div>
              <span className="dash-username" style={{ fontSize: '13px', color: '#64748B' }}>
                {sessionStorage.getItem('dash_username') || 'User'}
              </span>
            </div>
          </div>
          <div className="dash-body">
            <div className="dash-placeholder-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="dash-placeholder-title">Course Dashboard</div>
            <div className="dash-placeholder-sub">You're signed in. The full dashboard would load here.</div>
            <button
              type="button"
              className="dash-back"
              onClick={resetDemo}
              style={{
                marginTop: '8px', fontSize: '13px', color: '#2563EB',
                background: 'none', border: 'none', fontFamily: 'inherit',
                textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer'
              }}
            >
              ← Back to login (demo reset)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}