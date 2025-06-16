import { up } from 'up-fetch'

export const upfetch = up(fetch, () => ({
    baseUrl: process.env.API_URL || 'http://localhost:3000/api',
    timeout: 30000,
}))