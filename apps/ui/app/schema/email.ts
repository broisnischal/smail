

import z from 'zod'

export const email = z.object({
    id: z.string(),
    address: z.string().email(),
    aliasId: z.string()
})  