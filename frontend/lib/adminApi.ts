const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function getSecret(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('adminSecret') || '';
}

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': getSecret(),
            ...(options?.headers || {}),
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || `Request failed: ${res.status}`);
    return data as T;
}
