// src/lib/config.ts
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_CONFIG = {
    defaultHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    mode: 'cors' as RequestMode,
    eventSource: {
        maxRetries: 3,
        retryDelay: 5000
    }
};