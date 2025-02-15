<!-- src/lib/components/catalogue/TranscriptionButton.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { authService } from '$lib/services/auth.service';
    import { manuscriptService } from '$lib/services/manuscript.service';
    import type { TranscriptionStatus } from '$lib/types/manuscript';
    
    export let manuscriptId: string;
    export let status: TranscriptionStatus['status'];
    export let onTranscriptionStart: (id: string) => void;
    
    let isAdmin = false;
    let loading = false;
    let currentStatus = status;

    onMount(() => {
        const unsubscribe = authService.subscribe(state => {
            isAdmin = state.isAdmin;
        });
        return unsubscribe;
    });

    async function handleClick() {
        if (loading) return;
        loading = true;

        try {
            if (currentStatus === 'requested' && isAdmin) {
                // Admin approving a request
                const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/transcription-requests/${manuscriptId}/approve`, {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    currentStatus = 'in_progress';
                    onTranscriptionStart(manuscriptId);
                }
            } else {
                // Either admin starting transcription or non-admin requesting it
                const response = await manuscriptService.startTranscription(manuscriptId);
                if (response.status === 'started') {
                    currentStatus = isAdmin ? 'in_progress' : 'requested';
                    if (isAdmin) {
                        onTranscriptionStart(manuscriptId);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to handle transcription:', err);
            currentStatus = status;
        } finally {
            loading = false;
        }
    }

    function getButtonText(status: TranscriptionStatus['status']): string {
        if (loading) return 'Processing...';
        
        switch (status) {
            case 'in_progress':
                return 'In Progress';
            case 'completed':
                return 'Complete';
            case 'error':
                return 'Failed';
            case 'queued':
                return 'Queued';
            case 'requested':
                return isAdmin ? 'Approve Request' : 'Request Pending';
            case 'partial':
                return isAdmin ? 'Continue Transcription' : 'Request Transcription';
            case 'not_started':
                return isAdmin ? 'Start Transcription' : 'Request Transcription';
            default:
                return isAdmin ? 'Start Transcription' : 'Request Transcription';
        }
    }

    // Update currentStatus when status prop changes
    $: {
        currentStatus = status;
    }

    $: buttonDisabled = loading || 
        ['completed', 'in_progress', 'queued'].includes(currentStatus) || 
        (!isAdmin && currentStatus === 'requested');

    $: buttonClass = [
        'transcribe-button',
        currentStatus === 'requested' && isAdmin ? 'approve' : '',
        currentStatus === 'in_progress' || currentStatus === 'queued' ? 'in-progress' : '',
        currentStatus === 'completed' ? 'complete' : '',
        currentStatus === 'error' ? 'error' : '',
        currentStatus === 'partial' ? 'partial' : '',
        currentStatus === 'requested' && !isAdmin ? 'pending' : '',
        buttonDisabled ? 'disabled' : ''
    ].filter(Boolean).join(' ');
</script>

<button
    class={buttonClass}
    on:click={handleClick}
    disabled={buttonDisabled}
>
    {getButtonText(currentStatus)}
</button>

<style>
    .transcribe-button {
        width: 100%;
        padding: 0.25rem 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        transition: all 0.2s;
        background-color: #4a9eff;
        color: white;
        cursor: pointer;
    }

    .transcribe-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .transcribe-button.in-progress {
        background-color: #9ca3af;
        color: white;
    }

    .transcribe-button.complete {
        background-color: #d1d5db;
        color: #6b7280;
    }

    .transcribe-button.error {
        background-color: #ef4444;
        color: white;
    }

    .transcribe-button.approve {
        background-color: #10b981;
    }

    .transcribe-button.pending {
        background-color: #f59e0b;
    }

    .transcribe-button.partial {
        background-color: #6366f1;
        color: white;
    }

    .transcribe-button:hover:not(:disabled) {
        opacity: 0.9;
    }
</style>