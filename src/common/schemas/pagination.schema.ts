import { z } from 'zod'

export const MAX_PAGE_SIZE = 2000
const DEFAULT_PAGE_SIZE = 200

export const paginationSchema = z.object({
  offset: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type PaginationParams = z.infer<typeof paginationSchema>
