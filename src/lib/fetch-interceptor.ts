// Interceptor for legacy poehali.dev URLs - redirects to Yandex Cloud
import { FUNCTIONS } from './func2url';

const LEGACY_TO_NEW: Record<string, string> = {
  '392f3078-9f28-4640-ab86-dcabecaf721a': FUNCTIONS['get-messages'],
  '518f730f-1a8e-45ad-b0ed-e9a66c5a3784': FUNCTIONS['get-user'],
  '6ab5e5ca-f93c-438c-bc46-7eb7a75e2734': FUNCTIONS['profile-photos'],
  'aea3125a-7d11-4637-af71-0998dfbaf5b2': FUNCTIONS['get-conversations'],
  'ac3ea823-b6ec-4987-9602-18e412db6458': FUNCTIONS['get-subscriptions'],
  'a70b420b-cb23-4948-9a56-b8cefc96f976': FUNCTIONS['update-activity'],
  '57bd04c8-4731-4857-a2b8-a71c6bda783a': FUNCTIONS.login,
  '39b076de-8be1-48c0-8684-f94df4548b91': FUNCTIONS['send-sms'],
  'c4359550-f604-4126-8e72-5087a670b7cb': FUNCTIONS['verify-sms'],
  '1d4d268e-0d0a-454a-a1cc-ecd19c83471a': FUNCTIONS.register,
  'f1d38f0f-3d7d-459b-a52f-9ae703ac77d3': FUNCTIONS['reset-password'],
  '8d34c54f-b2de-42c1-ac0c-f6b51db36af7': FUNCTIONS['generate-upload-url'],
  'a3125a-7d11-4637-af71-0998d5b2': FUNCTIONS['send-message'],
  '392f3078-9f28-4640-ab86': FUNCTIONS['add-reaction'],
  'ac3ea823-b6ec-4987-9602': FUNCTIONS.subscribe,
};

// Patch global fetch - MUST run immediately on import
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // Replace legacy poehali.dev URLs with new Yandex Cloud URLs
  if (url.includes('functions.poehali.dev/')) {
    for (const [oldUuid, newUrl] of Object.entries(LEGACY_TO_NEW)) {
      if (url.includes(oldUuid)) {
        // Extract query params
        const urlObj = new URL(url);
        const params = urlObj.search;
        url = newUrl + params;
        console.log(`[FETCH INTERCEPTOR] Redirected: ${oldUuid} → ${newUrl}`);
        break;
      }
    }
  }
  
  return originalFetch(url, init);
};

console.log('[FETCH INTERCEPTOR] Initialized - redirecting legacy poehali.dev URLs to Yandex Cloud');

// Export to prevent tree-shaking
export const INTERCEPTOR_ACTIVE = true;