<!-- src/lib/components/LoginModal.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { authService } from '$lib/services/auth.service';
    import { goto } from '$app/navigation';
    
    const dispatch = createEventDispatcher();

    let password = '';
    let error: string | null = null;
    let isLoading = false;

    async function handleLogin() {
        if (!password) {
            error = 'Please enter the admin password';
            return;
        }

        isLoading = true;
        error = null;

        const success = await authService.login(password);

        if (success) {
            // Close modal and redirect
            dispatch('close');
            await goto('/manuscripts');
        } else {
            error = 'Login failed. Please check your password.';
        }

        isLoading = false;
    }

    // Allow closing modal with Escape key
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            dispatch('close');
        }
    }

    // Trap focus within the modal
    function trapFocus(node: HTMLElement) {
        const focusableElements = node.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        function handleTabKey(e: KeyboardEvent) {
            if (e.key === 'Tab') {
                // Shift + Tab
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } 
                // Tab
                else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        }

        node.addEventListener('keydown', handleTabKey);
        
        // Focus the first element
        firstElement.focus();

        return {
            destroy() {
                node.removeEventListener('keydown', handleTabKey);
            }
        };
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div 
    class="modal-overlay" 
    on:click|self={() => dispatch('close')}
    on:keydown={handleKeydown}
>
    <div 
        class="modal-content" 
        use:trapFocus
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="login-title"
    >
        <form on:submit|preventDefault={handleLogin}>
            <h2 id="login-title">Admin Login</h2>
            <div class="input-group">
                <label for="password">Admin Password</label>
                <input 
                    type="password" 
                    id="password" 
                    bind:value={password}
                    placeholder="Enter admin password"
                    disabled={isLoading}
                    required
                />
            </div>
            
            {#if error}
                <div class="error-message">{error}</div>
            {/if}
            
            <button 
                type="submit" 
                disabled={isLoading}
            >
                {#if isLoading}
                    Logging in...
                {:else}
                    Login
                {/if}
            </button>

            <button 
                type="button" 
                class="close-button" 
                on:click={() => dispatch('close')}
                aria-label="Close login modal"
            >
                ✕
            </button>
        </form>
    </div>
</div>

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 400px;
        position: relative;
        animation: slideUp 0.3s ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from { 
            opacity: 0;
            transform: translateY(20px); 
        }
        to { 
            opacity: 1;
            transform: translateY(0); 
        }
    }

    .close-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #666;
        cursor: pointer;
        padding: 0.5rem;
        line-height: 1;
    }

    .close-button:hover {
        color: #333;
    }

    form {
        display: flex;
        flex-direction: column;
    }

    h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #333;
    }

    .input-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        color: #666;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }

    input:disabled {
        background-color: #f9f9f9;
        cursor: not-allowed;
    }

    .error-message {
        color: #d9534f;
        margin-bottom: 1rem;
        text-align: center;
    }

    button[type="submit"] {
        width: 100%;
        padding: 0.75rem;
        background-color: #4a9eff;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-top: 0.5rem;
    }

    button[type="submit"]:disabled {
        background-color: #a0c9ff;
        cursor: not-allowed;
    }

    button[type="submit"]:not(:disabled):hover {
        background-color: #2563eb;
    }
</style>