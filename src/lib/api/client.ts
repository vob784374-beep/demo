'use client'

import axios from 'axios'
import { logger } from '@/lib/logger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore } = require('@/lib/stores/authStore')
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  logger.debug('api_request', { method: config.method?.toUpperCase(), url: config.url })
  return config
})

let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(token: string | null, err: unknown = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(err)
  })
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => {
    const requestId = response.headers['x-request-id']
    logger.debug('api_response', {
      status: response.status,
      url: response.config.url,
      ...(requestId ? { request_id: requestId } : {}),
    })
    return response
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status && error.response.status >= 500) {
      logger.error('api_error', { status: error.response.status, url: originalRequest?.url })
    }
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers = originalRequest.headers ?? {}
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(apiClient(originalRequest))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = refreshResponse.data?.data?.access_token
        if (newToken) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useAuthStore } = require('@/lib/stores/authStore')
          useAuthStore.getState().setAccessToken(newToken)
          processQueue(newToken)
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        } else {
          processQueue(null, error)
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useAuthStore } = require('@/lib/stores/authStore')
          useAuthStore.getState().clearAuth()
          if (typeof window !== 'undefined') {
            window.location.href = '/system/auth/login'
          }
        }
      } catch (refreshError) {
        processQueue(null, refreshError)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useAuthStore } = require('@/lib/stores/authStore')
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          window.location.href = '/system/auth/login'
        }
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)
