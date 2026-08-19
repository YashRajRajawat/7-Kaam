/**
 * The single definition of the derived listing booleans (spec §A.3 / §D.1).
 *
 * These two expressions appear EXACTLY ONCE each in the backend. No other file
 * re-derives them from `listingSource` / `claimStatus`, and no client ever
 * recomputes them — they consume `isUnclaimed` / `isClaimable` from the JSON.
 */
const PUBLIC_DIRECTORY = 'PUBLIC_DIRECTORY';
const SELF_SIGNUP      = 'SELF_SIGNUP';

function isUnclaimed(w) {
  return w?.listingSource === PUBLIC_DIRECTORY && w?.claimStatus !== 'CLAIMED';
}
function isClaimable(w) {
  return w?.listingSource === PUBLIC_DIRECTORY && w?.claimStatus === 'UNCLAIMED' && !w?.suppressedAt;
}
function isSuppressed(w) { return !!w?.suppressedAt; }

/** Throw-guard for every write path that produces trust data. */
function assertNotUnclaimed(w, action) {
  if (isUnclaimed(w)) {
    const e = new Error(`Cannot ${action} on an unclaimed public-directory listing`);
    e.statusCode = 409;
    e.code = 'UNCLAIMED_LISTING';
    throw e;
  }
}

module.exports = { PUBLIC_DIRECTORY, SELF_SIGNUP, isUnclaimed, isClaimable, isSuppressed, assertNotUnclaimed };
