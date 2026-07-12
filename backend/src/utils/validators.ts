import { ALLOWED_STATUSES, ALLOWED_SOURCES } from './constants';

export const isValidStatus = (status: string): boolean => {
  return ALLOWED_STATUSES.includes(status as any);
};

export const isValidSource = (source: string): boolean => {
  if (!source) return true; // Empty is allowed
  return ALLOWED_SOURCES.includes(source as any);
};

export const isValidDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export const hasEmailOrPhone = (record: any): boolean => {
  return !!(record.email || record.mobile_without_country_code || 
            record.phone || record.mobile || record.contact);
};