// @supabase/supabase-js constructs a RealtimeClient (which we never use —
// no channel/subscription code exists in this app) as soon as createClient()
// runs, and that constructor requires a native `WebSocket` global. Node 22+
// has one built in; on older Node this polyfills it so the app can still
// boot. Safe no-op on Node 22+ since it only assigns when missing.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws');
}
