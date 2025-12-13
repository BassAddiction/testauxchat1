// API Gateway Configuration - твой собственный сервер
const API_GATEWAY = 'https://onproduct.pro/api';

// Function names that are proxied through API Gateway
const FUNCTION_NAMES = [
  'add-energy',
  'create-payment',
  'payment-webhook',
  'get-messages',
  'login',
  'get-subscriptions',
  'get-conversations',
  'create-user',
  'verify-sms',
  'reset-password',
  'add-reaction',
  'profile-photos',
  'blacklist',
  'send-sms',
  'send-message',
  'register',
  'subscribe',
  'update-activity',
  'private-messages',
  'admin-users',
  'get-user',
  'geocode',
  'update-location',
  'upload-photo',
  'generate-upload-url',
  'generate-presigned-url',
  'upload-profile-photo',
  'upload-photo-http',
  'upload-photo-swift',
  'seed-test-users',
];

// Generate FUNCTIONS object with API Gateway URLs
export const FUNCTIONS = FUNCTION_NAMES.reduce((acc, name) => {
  acc[name] = `${API_GATEWAY}/${name}`;
  return acc;
}, {} as Record<string, string>);

console.log('[FUNC2URL] Generated FUNCTIONS:', FUNCTIONS);
console.log('[FUNC2URL] API_GATEWAY =', API_GATEWAY);