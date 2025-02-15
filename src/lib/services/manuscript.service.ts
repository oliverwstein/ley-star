// src/lib/services/manuscript.service.ts
import { onDestroy } from 'svelte';
import type { 
    Manuscript, 
    PageData, 
    ManuscriptMetadata,
    TranscriptionStatus,
    TableOfContentsEntry,
    SearchResponse,
    ManuscriptSearchResult
} from '$lib/types/manuscript';
import { API_URL, API_CONFIG } from '$lib/config';

interface StatusSubscription {
    callback: (status: TranscriptionStatus) => void;
    manuscriptId: string;
}

interface PageSubscription {
    callback: (page: PageData) => void;
    manuscriptId: string;
    pageNumber: number;
}

interface SearchSubscription {
    callback: (results: ManuscriptSearchResult[]) => void;
    query: string;
}

type WebSocketMessage = {
    type: 'transcription_update' | 'page_update' | 'search_update' | 'error';
    manuscript_id?: string;
    page_number?: number;
    data: any;
    error?: string;
};

export class ManuscriptService {
    private socket: WebSocket | null = null;
    private statusSubscribers = new Map<string, Set<StatusSubscription>>();
    private pageSubscribers = new Map<string, Set<PageSubscription>>();
    private searchSubscribers = new Map<string, Set<SearchSubscription>>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageQueue: any[] = [];

    constructor() {
        this.initializeWebSocket();
    }

    private initializeWebSocket() {
        const wsUrl = API_URL.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws';
        this.socket = new WebSocket(wsUrl);
    
        // Add error handling and logging
        this.socket.onopen = () => {
            console.log('WebSocket connection established');
            this.reconnectAttempts = 0;
            while (this.messageQueue.length > 0) {
                const msg = this.messageQueue.shift();
                this.sendMessage(msg);
            }
        };
    
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                switch (message.type) {
                    case 'transcription_update':
                        if (message.manuscript_id) {
                            this.handleTranscriptionUpdate(message.manuscript_id, message.data);
                        }
                        break;
                    case 'page_update':
                        if (message.manuscript_id && message.page_number) {
                            this.handlePageUpdate(message.manuscript_id, message.page_number, message.data);
                        }
                        break;
                    case 'search_update':
                        this.handleSearchUpdate(message.data);
                        break;
                    case 'error':
                        console.error('WebSocket error:', message.error);
                        break;
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        this.socket.onclose = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.initializeWebSocket();
                }, delay);
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private sendMessage(message: any) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    private handleTranscriptionUpdate(manuscriptId: string, status: TranscriptionStatus) {
        const subscribers = this.statusSubscribers.get(manuscriptId);
        if (subscribers) {
            // Ensure status object matches expected TranscriptionStatus type
            const formattedStatus: TranscriptionStatus = {
                status: status.status,
                transcribed_pages: status.transcribed_pages,
                total_pages: status.total_pages,
                // Include other fields as needed
            };
            subscribers.forEach(sub => sub.callback(formattedStatus));
        }
    }

    private handlePageUpdate(manuscriptId: string, pageNumber: number, pageData: PageData) {
        const key = `${manuscriptId}-${pageNumber}`;
        const subscribers = this.pageSubscribers.get(key);
        if (subscribers) {
            subscribers.forEach(sub => sub.callback(pageData));
        }
    }

    private handleSearchUpdate(results: ManuscriptSearchResult[]) {
        this.searchSubscribers.forEach((subscribers, query) => {
            subscribers.forEach(sub => sub.callback(results));
        });
    }

    // HTTP API Methods
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(API_URL, {
                ...API_CONFIG,
                headers: API_CONFIG.defaultHeaders
            });
            return response.ok;
        } catch (e) {
            console.error('Connection test failed:', e);
            return false;
        }
    }

    async getManuscripts(): Promise<Record<string, ManuscriptMetadata>> {
        const response = await fetch(`${API_URL}/manuscripts`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }

    async getManuscript(id: string): Promise<Manuscript> {
        const response = await fetch(`${API_URL}/manuscripts/${id}/info`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }

    async getPages(id: string): Promise<Record<string, PageData>> {
        const response = await fetch(`${API_URL}/manuscripts/${id}/pages`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }

    async getPage(id: string, pageNumber: number): Promise<PageData> {
        const response = await fetch(`${API_URL}/manuscripts/${id}/pages/${pageNumber}`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }

    getPageImage(id: string, pageNumber: number): string {
        return `${API_URL}/manuscripts/${id}/pages/${pageNumber}/image`;
    }

    async getTableOfContents(id: string): Promise<TableOfContentsEntry[]> {
        const response = await fetch(`${API_URL}/manuscripts/${id}/toc`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }

    async searchManuscripts(query: string): Promise<SearchResponse> {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    }

    async startTranscription(
        id: string,
        options: { notes?: string; priority?: number } = {}
    ): Promise<{ status: 'started' | 'already_running'; manuscript_id: string }> {
        const response = await fetch(
            `${API_URL}/manuscripts/${id}/transcribe`,
            {
                ...API_CONFIG,
                method: 'POST',
                credentials: 'include',
                headers: API_CONFIG.defaultHeaders,
                body: JSON.stringify({
                    notes: options.notes || '',
                    priority: options.priority || 1
                })
            }
        );

        if (!response.ok && response.status !== 409) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    }

    async getTranscriptionStatus(id: string): Promise<TranscriptionStatus> {
        const response = await fetch(`${API_URL}/transcription/status/${id}`, {
            ...API_CONFIG,
            headers: API_CONFIG.defaultHeaders
        });
        
        if (response.status === 404) {
            return {
                status: 'not_started',
                transcribed_pages: 0,
                total_pages: 0
            };
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        return response.json();
    }

    // Subscription Methods
    subscribeToStatus(
        manuscriptId: string,
        callback: (status: TranscriptionStatus) => void
    ): () => void {
        if (!this.statusSubscribers.has(manuscriptId)) {
            this.statusSubscribers.set(manuscriptId, new Set());
        }

        const subscription: StatusSubscription = { callback, manuscriptId };
        this.statusSubscribers.get(manuscriptId)?.add(subscription);

        // Get initial status
        this.getTranscriptionStatus(manuscriptId).then(callback);

        return () => {
            this.statusSubscribers.get(manuscriptId)?.delete(subscription);
        };
    }

    subscribeToPage(
        manuscriptId: string,
        pageNumber: number,
        callback: (page: PageData) => void
    ): () => void {
        const key = `${manuscriptId}-${pageNumber}`;
        if (!this.pageSubscribers.has(key)) {
            this.pageSubscribers.set(key, new Set());
        }

        const subscription: PageSubscription = { callback, manuscriptId, pageNumber };
        this.pageSubscribers.get(key)?.add(subscription);

        // Get initial page data
        this.getPage(manuscriptId, pageNumber).then(callback);

        return () => {
            this.pageSubscribers.get(key)?.delete(subscription);
        };
    }

    subscribeToSearch(
        query: string,
        callback: (results: ManuscriptSearchResult[]) => void
    ): () => void {
        if (!this.searchSubscribers.has(query)) {
            this.searchSubscribers.set(query, new Set());
        }

        const subscription: SearchSubscription = { callback, query };
        this.searchSubscribers.get(query)?.add(subscription);

        // Get initial search results
        this.searchManuscripts(query).then(response => callback(response.results));

        return () => {
            this.searchSubscribers.get(query)?.delete(subscription);
        };
    }
}

export const manuscriptService = new ManuscriptService();

// Svelte Helpers
export function useManuscriptStatus(
    manuscriptId: string, 
    callback: (status: TranscriptionStatus) => void
) {
    const cleanup = manuscriptService.subscribeToStatus(manuscriptId, callback);
    onDestroy(cleanup);
}

export function usePageData(
    manuscriptId: string,
    pageNumber: number,
    callback: (page: PageData) => void
) {
    const cleanup = manuscriptService.subscribeToPage(manuscriptId, pageNumber, callback);
    onDestroy(cleanup);
}

export function useSearch(
    query: string,
    callback: (results: ManuscriptSearchResult[]) => void
) {
    const cleanup = manuscriptService.subscribeToSearch(query, callback);
    onDestroy(cleanup);
}