import { logger } from '../utils/logger';

// Country to region mapping
export const COUNTRY_REGION_MAP: Record<string, string> = {
  // India
  'IN': 'IN',
  
  // North America
  'US': 'US',
  'CA': 'CA',
  
  // Europe
  'GB': 'GB',
  'DE': 'EU',
  'FR': 'EU',
  'IT': 'EU',
  'ES': 'EU',
  'NL': 'EU',
  'BE': 'EU',
  'AT': 'EU',
  'CH': 'EU',
  'SE': 'EU',
  'NO': 'EU',
  'DK': 'EU',
  'FI': 'EU',
  'IE': 'EU',
  'PT': 'EU',
  'PL': 'EU',
  'CZ': 'EU',
  'HU': 'EU',
  'RO': 'EU',
  'BG': 'EU',
  'HR': 'EU',
  'SI': 'EU',
  'SK': 'EU',
  'LT': 'EU',
  'LV': 'EU',
  'EE': 'EU',
  'LU': 'EU',
  'MT': 'EU',
  'CY': 'EU',
  
  // Africa
  'NG': 'AF', // Nigeria
  'ZA': 'AF', // South Africa
  'KE': 'AF', // Kenya
  'GH': 'AF', // Ghana
  'EG': 'AF', // Egypt
  'MA': 'AF', // Morocco
  'TN': 'AF', // Tunisia
  'DZ': 'AF', // Algeria
  'ET': 'AF', // Ethiopia
  'UG': 'AF', // Uganda
  'TZ': 'AF', // Tanzania
  'RW': 'AF', // Rwanda
  'SN': 'AF', // Senegal
  'CI': 'AF', // Ivory Coast
  'CM': 'AF', // Cameroon
  'BF': 'AF', // Burkina Faso
  'ML': 'AF', // Mali
  'NE': 'AF', // Niger
  'TD': 'AF', // Chad
  'SD': 'AF', // Sudan
  'LY': 'AF', // Libya
  'AO': 'AF', // Angola
  'MZ': 'AF', // Mozambique
  'MG': 'AF', // Madagascar
  'ZM': 'AF', // Zambia
  'ZW': 'AF', // Zimbabwe
  'BW': 'AF', // Botswana
  'NA': 'AF', // Namibia
  'MW': 'AF', // Malawi
  'SZ': 'AF', // Eswatini
  'LS': 'AF', // Lesotho
  
  // Latin America
  'BR': 'LATAM', // Brazil
  'MX': 'LATAM', // Mexico
  'AR': 'LATAM', // Argentina
  'CO': 'LATAM', // Colombia
  'PE': 'LATAM', // Peru
  'VE': 'LATAM', // Venezuela
  'CL': 'LATAM', // Chile
  'EC': 'LATAM', // Ecuador
  'GT': 'LATAM', // Guatemala
  'CU': 'LATAM', // Cuba
  'BO': 'LATAM', // Bolivia
  'DO': 'LATAM', // Dominican Republic
  'HN': 'LATAM', // Honduras
  'PY': 'LATAM', // Paraguay
  'NI': 'LATAM', // Nicaragua
  'CR': 'LATAM', // Costa Rica
  'PA': 'LATAM', // Panama
  'UY': 'LATAM', // Uruguay
  'JM': 'LATAM', // Jamaica
  'TT': 'LATAM', // Trinidad and Tobago
  'GY': 'LATAM', // Guyana
  'SR': 'LATAM', // Suriname
  'BZ': 'LATAM', // Belize
  'SV': 'LATAM', // El Salvador
  
  // Asia Pacific (Default to Stripe)
  'AU': 'DEFAULT',
  'NZ': 'DEFAULT',
  'SG': 'DEFAULT',
  'HK': 'DEFAULT',
  'JP': 'DEFAULT',
  'KR': 'DEFAULT',
  'TW': 'DEFAULT',
  'MY': 'DEFAULT',
  'TH': 'DEFAULT',
  'PH': 'DEFAULT',
  'ID': 'DEFAULT',
  'VN': 'DEFAULT',
  
  // Middle East
  'AE': 'DEFAULT',
  'SA': 'DEFAULT',
  'IL': 'DEFAULT',
  'TR': 'DEFAULT',
  'IR': 'DEFAULT',
  'IQ': 'DEFAULT',
  'JO': 'DEFAULT',
  'LB': 'DEFAULT',
  'SY': 'DEFAULT',
  'YE': 'DEFAULT',
  'OM': 'DEFAULT',
  'QA': 'DEFAULT',
  'KW': 'DEFAULT',
  'BH': 'DEFAULT'
};

// Currency to region preference mapping
export const CURRENCY_REGION_MAP: Record<string, string[]> = {
  'INR': ['IN'],
  'USD': ['US', 'LATAM', 'DEFAULT'],
  'EUR': ['EU'],
  'GBP': ['GB'],
  'CAD': ['CA'],
  'AUD': ['DEFAULT'],
  'JPY': ['DEFAULT'],
  'SGD': ['DEFAULT'],
  'HKD': ['DEFAULT'],
  'MYR': ['DEFAULT'],
  'THB': ['DEFAULT'],
  'PHP': ['DEFAULT'],
  'IDR': ['DEFAULT'],
  'VND': ['DEFAULT'],
  'KRW': ['DEFAULT'],
  'TWD': ['DEFAULT'],
  'AED': ['DEFAULT'],
  'SAR': ['DEFAULT'],
  'ILS': ['DEFAULT'],
  'TRY': ['DEFAULT'],
  'ZAR': ['AF'],
  'NGN': ['AF'],
  'KES': ['AF'],
  'GHS': ['AF'],
  'EGP': ['AF'],
  'MAD': ['AF'],
  'TND': ['AF'],
  'DZD': ['AF'],
  'ETB': ['AF'],
  'UGX': ['AF'],
  'TZS': ['AF'],
  'RWF': ['AF'],
  'XOF': ['AF'], // West African CFA franc
  'XAF': ['AF'], // Central African CFA franc
  'BRL': ['LATAM'],
  'MXN': ['LATAM'],
  'ARS': ['LATAM'],
  'COP': ['LATAM'],
  'PEN': ['LATAM'],
  'VES': ['LATAM'],
  'CLP': ['LATAM'],
  'BOB': ['LATAM'],
  'PYG': ['LATAM'],
  'UYU': ['LATAM'],
  'GTQ': ['LATAM'],
  'HNL': ['LATAM'],
  'NIO': ['LATAM'],
  'CRC': ['LATAM'],
  'PAB': ['LATAM'],
  'JMD': ['LATAM'],
  'TTD': ['LATAM'],
  'GYD': ['LATAM'],
  'SRD': ['LATAM'],
  'BZD': ['LATAM']
};

export interface GeoLocation {
  country: string;
  region: string;
  currency?: string;
  ip?: string;
  timezone?: string;
}

export class GeoRoutingService {
  /**
   * Detect region from country code
   */
  static getRegionFromCountry(countryCode: string): string {
    const region = COUNTRY_REGION_MAP[countryCode.toUpperCase()];
    if (!region) {
      logger.warn(`Unknown country code: ${countryCode}, defaulting to DEFAULT region`);
      return 'DEFAULT';
    }
    return region;
  }

  /**
   * Get optimal region for currency
   */
  static getOptimalRegionForCurrency(currency: string): string {
    const regions = CURRENCY_REGION_MAP[currency.toUpperCase()];
    if (!regions || regions.length === 0) {
      logger.warn(`Unknown currency: ${currency}, defaulting to DEFAULT region`);
      return 'DEFAULT';
    }
    return regions[0]; // Return primary region for currency
  }

  /**
   * Detect user location from IP address (stub implementation)
   * In production, you'd use a service like MaxMind GeoIP2 or similar
   */
  static async detectLocationFromIP(ipAddress: string): Promise<GeoLocation> {
    // TODO: Implement actual IP geolocation
    // For now, return a default location
    logger.info(`IP geolocation stub for: ${ipAddress}`);
    
    // Mock implementation - in production use actual geolocation service
    const mockLocations: Record<string, GeoLocation> = {
      '127.0.0.1': { country: 'US', region: 'US', currency: 'USD' },
      'localhost': { country: 'US', region: 'US', currency: 'USD' }
    };

    return mockLocations[ipAddress] || { 
      country: 'US', 
      region: 'DEFAULT', 
      currency: 'USD',
      ip: ipAddress 
    };
  }

  /**
   * Detect location from request headers
   */
  static detectLocationFromHeaders(headers: Record<string, string>): GeoLocation {
    // Check for Cloudflare country header
    if (headers['cf-ipcountry']) {
      const country = headers['cf-ipcountry'];
      return {
        country,
        region: this.getRegionFromCountry(country),
        timezone: headers['cf-timezone']
      };
    }

    // Check for other common geolocation headers
    if (headers['x-country-code']) {
      const country = headers['x-country-code'];
      return {
        country,
        region: this.getRegionFromCountry(country)
      };
    }

    // Default fallback
    return {
      country: 'US',
      region: 'DEFAULT',
      currency: 'USD'
    };
  }

  /**
   * Get comprehensive location info
   */
  static async getLocationInfo(
    ipAddress?: string, 
    headers?: Record<string, string>,
    userCountry?: string,
    userCurrency?: string
  ): Promise<GeoLocation> {
    let location: GeoLocation;

    // Priority 1: User-provided country/currency
    if (userCountry) {
      location = {
        country: userCountry,
        region: this.getRegionFromCountry(userCountry),
        currency: userCurrency
      };
    }
    // Priority 2: Headers (CDN/proxy provided)
    else if (headers) {
      location = this.detectLocationFromHeaders(headers);
    }
    // Priority 3: IP geolocation
    else if (ipAddress) {
      location = await this.detectLocationFromIP(ipAddress);
    }
    // Fallback
    else {
      location = {
        country: 'US',
        region: 'DEFAULT',
        currency: 'USD'
      };
    }

    // If currency is not set, try to infer from region
    if (!location.currency) {
      location.currency = this.getDefaultCurrencyForRegion(location.region);
    }

    logger.info('Location detected', location);
    return location;
  }

  /**
   * Get default currency for region
   */
  static getDefaultCurrencyForRegion(region: string): string {
    const regionCurrencyMap: Record<string, string> = {
      'IN': 'INR',
      'US': 'USD',
      'CA': 'CAD',
      'GB': 'GBP',
      'EU': 'EUR',
      'AF': 'USD', // Most African countries prefer USD for international transactions
      'LATAM': 'USD', // Many LATAM countries use USD for international transactions
      'DEFAULT': 'USD'
    };

    return regionCurrencyMap[region] || 'USD';
  }

  /**
   * Validate if currency is supported in region
   */
  static isCurrencySupportedInRegion(currency: string, region: string): boolean {
    const supportedRegions = CURRENCY_REGION_MAP[currency.toUpperCase()];
    if (!supportedRegions) return false;
    
    return supportedRegions.includes(region) || supportedRegions.includes('DEFAULT');
  }

  /**
   * Get alternative currencies for region
   */
  static getAlternativeCurrenciesForRegion(region: string): string[] {
    const alternatives: Record<string, string[]> = {
      'IN': ['INR', 'USD'],
      'US': ['USD'],
      'CA': ['CAD', 'USD'],
      'GB': ['GBP', 'USD', 'EUR'],
      'EU': ['EUR', 'USD'],
      'AF': ['USD', 'EUR'],
      'LATAM': ['USD', 'EUR'],
      'DEFAULT': ['USD', 'EUR']
    };

    return alternatives[region] || ['USD'];
  }
}