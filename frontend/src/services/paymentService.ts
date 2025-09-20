const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface CreatePaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  region?: string;
  country?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  gatewayTransactionId?: string;
  gateway: string;
  status: string;
  amount: number;
  currency: string;
  region: string;
  clientSecret?: string;
  paymentUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
  geoLocation?: any;
}

export interface PaymentStatusResponse {
  success: boolean;
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  gateway: string;
  error?: string;
}

export interface SupportedMethodsResponse {
  success: boolean;
  methods: Array<{
    gateway: string;
    name: string;
    currencies: string[];
    regions: string[];
  }>;
}

export class PaymentService {
  private static readonly BASE_URL = `${API_BASE_URL}/api`;

  private static getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private static getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Create a payment using the payment orchestrator
   */
  static async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      // Add client IP and headers for geo-routing
      const enrichedRequest = {
        ...request,
        ipAddress: await this.getClientIP(),
        headers: this.getBrowserHeaders(),
      };

      const response = await fetch(`${this.BASE_URL}/payments/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(enrichedRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Get payment status by transaction ID
   */
  static async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/payments/status/${transactionId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }
  }

  /**
   * Get supported payment methods for a region
   */
  static async getSupportedMethods(region?: string): Promise<SupportedMethodsResponse> {
    try {
      const url = region 
        ? `${this.BASE_URL}/payments/methods/${region}`
        : `${this.BASE_URL}/payments/methods/DEFAULT`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching supported methods:', error);
      throw error;
    }
  }

  /**
   * Get payment history for the current user
   */
  static async getPaymentHistory(): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/payments/analytics`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Get client IP address for geo-routing
   */
  private static async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not fetch client IP:', error);
      return undefined;
    }
  }

  /**
   * Get browser headers for geo-routing
   */
  private static getBrowserHeaders(): Record<string, string> {
    return {
      'User-Agent': navigator.userAgent,
      'Accept-Language': navigator.language,
      'Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}