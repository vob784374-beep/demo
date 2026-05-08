export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T | null
  meta: PaginationMeta | null
  request_id: string | null
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
}
