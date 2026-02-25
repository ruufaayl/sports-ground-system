import type { Ground, AvailabilityResponse, Booking } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed: ${res.status}`);
    }
    return data as T;
}

export async function getGrounds(): Promise<{ grounds: Ground[] }> {
    return request<{ grounds: Ground[] }>('/api/grounds');
}

export async function checkAvailability(
    groundId: string,
    date: string,
    startTime: string,
    endTime: string
): Promise<AvailabilityResponse> {
    return request<AvailabilityResponse>('/api/availability/check', {
        method: 'POST',
        body: JSON.stringify({ groundId, date, startTime, endTime }),
    });
}

export async function createBooking(data: {
    groundId: string;
    date: string;
    startTime: string;
    endTime: string;
    customerName: string;
    customerPhone: string;
    teamDetails?: string;
}): Promise<{ booking: Booking }> {
    return request<{ booking: Booking }>('/api/bookings/create', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function confirmPayment(
    bookingRef: string,
    transactionId: string,
    paymentMethod: string
): Promise<{ booking: Booking }> {
    return request<{ booking: Booking }>(
        `/api/bookings/${bookingRef}/confirm-payment`,
        {
            method: 'PUT',
            body: JSON.stringify({ transactionId, paymentMethod }),
        }
    );
}

export async function getBooking(bookingRef: string): Promise<{ booking: Booking }> {
    return request<{ booking: Booking }>(`/api/bookings/${bookingRef}`);
}
