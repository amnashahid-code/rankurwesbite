export const brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'RankYourWebsite',
  logo: '/logo.svg',
  domain: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  tagline: 'Clarity for your next climb.',
  contact: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
  primary: '#8065ff',
};
export const defaultPricing = { base_price_cents: 200, referral_discount_cents: 50, referral_threshold: 5 };
export const money = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
