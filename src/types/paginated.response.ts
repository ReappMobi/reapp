export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    offset: number
    limit: number
    total: number
  }
  links: {
    self: string
    next: string
    prev: string
  }
}
