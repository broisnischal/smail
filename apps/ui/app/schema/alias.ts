import z from 'zod'
import { email } from './email'

export const alias = z.object({
    id: z.string(),
    name: z.string().nullish(),
    alias: z.string(),
    email: z.array(email),
    isActive: z.boolean(),
    emailCount: z.number(),
    expiresAt: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string()
})  