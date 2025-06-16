import { up } from 'up-fetch'

// Get API URL from environment or use fallback
const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side: use relative URL for same-origin requests
        return '/api'
    }
    // Server-side: use environment variable or fallback
    return process.env.API_URL || 'http://localhost:3000/api'
}

export const upfetch = up(fetch, () => ({
    baseUrl: getApiUrl(),
    timeout: 30000,
}))