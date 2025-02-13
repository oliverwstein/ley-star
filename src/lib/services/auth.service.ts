// src/lib/services/auth.service.ts
import { writable } from 'svelte/store';

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Represents the current authentication state
 */
export interface AuthState {
    /** Indicates if the user is authenticated as an admin */
    isAdmin: boolean;
    /** Indicates if an authentication action is in progress */
    isLoading: boolean;
    /** Stores any error messages from authentication attempts */
    error: string | null;
}

/**
 * Creates a reactive authentication service for managing admin login state
 */
function createAuthService() {
    // Create a writable store with initial authentication state
    const { subscribe, set } = writable<AuthState>({
        isAdmin: false,
        isLoading: false,
        error: null
    });

    return {
        // Allow components to subscribe to authentication state changes
        subscribe,

        /**
         * Attempt to log in with admin password
         * @param password - The admin password to authenticate
         * @returns Promise resolving to true if login successful, false otherwise
         */
        login: async (password: string) => {
            // Reset state before attempting login
            set({ isAdmin: false, isLoading: true, error: null });

            try {
                // Prepare form data for submission
                const formData = new URLSearchParams();
                formData.append('password', password);

                // Send login request
                const response = await fetch(`${API_BASE_URL}/admin/login`, {
                    method: 'POST',
                    credentials: 'include', // Ensures cookies are sent with request
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });

                // Handle unsuccessful login attempts
                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(errorData || 'Login failed');
                }

                // Update state to reflect successful login
                set({ 
                    isAdmin: true, 
                    isLoading: false, 
                    error: null 
                });

                return true;
            } catch (error) {
                // Handle and store any login errors
                const errorMessage = error instanceof Error ? error.message : 'Login failed';
                set({ 
                    isAdmin: false, 
                    isLoading: false, 
                    error: errorMessage 
                });
                return false;
            }
        },

        /**
         * Log out the current admin user
         * @returns Promise resolving to true if logout successful, false otherwise
         */
        logout: async () => {
            try {
                // Send logout request
                const response = await fetch(`${API_BASE_URL}/admin/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });

                // Handle unsuccessful logout
                if (!response.ok) {
                    throw new Error('Logout failed');
                }

                // Reset to initial unauthenticated state
                set({
                    isAdmin: false,
                    isLoading: false,
                    error: null
                });

                return true;
            } catch (error) {
                // Log and handle any logout errors
                console.error('Logout error:', error);
                return false;
            }
        }
    };
}

// Create a singleton instance of the auth service
export const authService = createAuthService();