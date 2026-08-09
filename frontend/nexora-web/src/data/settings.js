export const PROFILE_FIELDS = [
  { label: 'Display Name', value: 'Kavisara', icon: '👤' },
  { label: 'Email', value: 'gamer@nexora.gg', icon: '📧' },
  { label: 'Language', value: 'English (US)', icon: '🌐' },
  { label: 'Timezone', value: 'Asia/Colombo (UTC+5:30)', icon: '🕐' },
]

export const NOTIFICATION_ITEMS = [
  { label: 'Deal Alerts', desc: 'Get notified when a tracked game drops in price', on: true },
  { label: 'Giveaway Reminders', desc: 'Alerts before free game claim windows close', on: true },
  { label: 'Price Drop Notifications', desc: 'Push notifications for wishlist price drops', on: true },
  { label: 'Weekly Digest Email', desc: 'Summary of weekly deals and giveaways', on: false },
  { label: 'Security Alerts', desc: 'Login attempts and session change notifications', on: true },
]

export const SECURITY_PREFS = [
  { label: 'Two-Factor Authentication', desc: 'Protect with authenticator app', on: true },
  { label: 'Login Notifications', desc: 'Alert on new device sign-ins', on: true },
  { label: 'Auto Session Timeout', desc: 'End sessions after 30 min inactivity', on: false },
  { label: 'API Key Visibility', desc: 'Mask API keys in dashboard', on: true },
]

export const CONNECTED_PLATFORMS = [
  { name: 'Steam', key: 'steam', connected: true, username: '@kavisara_steam' },
  { name: 'Epic Games', key: 'epic', connected: true, username: '@kavisara_epic' },
  { name: 'GOG', key: 'gog', connected: false, username: '' },
  { name: 'Prime Gaming', key: 'prime', connected: false, username: '' },
]

export const APPEARANCE_ITEMS = [
  { label: 'Dark Mode', desc: 'Use dark theme across the interface', on: true },
  { label: 'Liquid Glass Effects', desc: 'Enable glassmorphism and blur effects', on: true },
  { label: 'Accent Color: NEXORA Orange', desc: 'Primary accent for interactive elements', on: true },
  { label: 'Compact Mode', desc: 'Reduce padding and card sizes', on: false },
  { label: 'Animations', desc: 'Enable micro-animations and transitions', on: true },
]
