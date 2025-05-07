import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency (INR).
 * @param amount The number to format.
 * @returns The formatted currency string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { // Changed locale to en-IN
    style: 'currency',
    currency: 'INR', // Changed currency to INR
    minimumFractionDigits: 0, // Optional: Keep 0 for no paisa, or 2 for paisa
    maximumFractionDigits: 0, // Optional: Keep 0 for no paisa, or 2 for paisa
  }).format(amount);
}
