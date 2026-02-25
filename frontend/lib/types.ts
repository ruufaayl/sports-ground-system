// Ground & Pricing
export interface PricingRule {
    id: string;
    ground_id: string;
    day_type: 'weekday' | 'weekend';
    slot_type: 'peak' | 'offpeak';
    price_per_hour: number;
}

export interface Ground {
    id: string;
    name: string;
    size: 'full' | 'smaller';
    status: 'active' | 'inactive';
    description?: string;
    pricing_rules: PricingRule[];
}

// Availability & Pricing
export interface PriceCalculation {
    duration: number;
    pricePerHour: number;
    basePrice: number;
    advanceAmount: number;
    remainingAmount: number;
    dayType: 'weekday' | 'weekend';
    slotType: 'peak' | 'offpeak';
}

export interface AvailabilityResponse {
    available: boolean;
    price: PriceCalculation | null;
    conflict: Booking | null;
}

// Booking
export interface Booking {
    id: string;
    booking_ref: string;
    ground_id: string;
    date: string;
    start_time: string;
    end_time: string;
    customer_name: string;
    customer_phone: string;
    team_details?: string;
    duration_hours: number;
    price_per_hour: number;
    base_price: number;
    advance_amount: number;
    remaining_amount: number;
    day_type: string;
    slot_type: string;
    payment_status: 'pending' | 'paid' | 'refunded';
    booking_status: 'confirmed' | 'cancelled';
    payment_method?: string;
    safepay_transaction_id?: string;
    created_at: string;
    grounds?: Ground;
}

// Form
export interface BookingFormData {
    groundId: string;
    groundName: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    pricePerHour: number;
    basePrice: number;
    advanceAmount: number;
    remainingAmount: number;
    dayType: string;
    slotType: string;
    customerName: string;
    customerPhone: string;
    teamDetails?: string;
}
