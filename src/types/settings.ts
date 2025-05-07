
/**
 * Represents the platform's configurable settings.
 */
export interface PlatformSettings {
  platformName: string;
  logoUrl: string; // URL of the platform logo
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  defaultBookingFee: number; // Can be percentage or fixed amount
  adminEmail: string;
  termsAndConditions: string;
  // Add other settings as needed (e.g., privacyPolicy, emailTemplates)
}
