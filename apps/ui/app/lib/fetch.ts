import { up } from 'up-fetch'

export const upfetch = up(fetch, () => ({
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
}))