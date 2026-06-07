import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function money(value: number | string, currency = "INR") {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}
export function initials(name = "?") { return name.trim().charAt(0).toUpperCase() || "?"; }
export function absoluteUrl(path: string) { return `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${path}`; }
