// ============================================================
// DailyLedger — lib/gis/tokenClient.ts
// Google OAuth 2.0 token client supporting both popup & redirect flows.
// Tokens are kept ONLY in module memory — never written to
// localStorage, sessionStorage, IndexedDB, or cookies.
// ============================================================

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

// ─── In-memory token store ────────────────────────────────────────────────────
interface TokenState {
  accessToken: string;
  expiresAt: number; // epoch ms
  email: string;
}

let _tokenState: TokenState | null = null;

export function setAccessToken(token: string, expiresInSeconds: number, email = ''): void {
  _tokenState = {
    accessToken: token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    email,
  };
}

export function getAccessToken(): string | null {
  if (!_tokenState) return null;
  if (Date.now() >= _tokenState.expiresAt) {
    _tokenState = null;
    return null;
  }
  return _tokenState.accessToken;
}

export function clearAccessToken(): void {
  _tokenState = null;
}

export function isTokenValid(): boolean {
  return getAccessToken() !== null;
}

export function getTokenEmail(): string {
  return _tokenState?.email ?? '';
}

// ─── Client ID Helper ─────────────────────────────────────────────────────────

export function getGoogleClientId(): string {
  const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (envId && envId.trim() !== '' && envId !== 'your_google_web_client_id') {
    return envId;
  }
  // Fallback Web Client ID
  return '913422447403-ken4krrgfcbtvului82g2ehqsbvem71u.apps.googleusercontent.com';
}

// ─── Direct Google OAuth URL Builder ──────────────────────────────────────────

/**
 * Builds the direct Google OAuth 2.0 Implicit Grant authorization URL.
 * Redirects back to /dashboard with #access_token=... in the URL fragment.
 */
export function getGoogleOAuthUrl(customRedirectUri?: string): string {
  const clientId = getGoogleClientId();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://daily-ledger-snowy.vercel.app';
  const redirectUri = customRedirectUri || `${origin}/dashboard`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: DRIVE_SCOPE,
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ─── GIS script loader ────────────────────────────────────────────────────────

let _scriptLoaded = false;

export function loadGISScript(): Promise<void> {
  if (_scriptLoaded || (typeof window !== 'undefined' && 'google' in window && (window as Record<string, unknown>).google)) {
    _scriptLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gis-script');
    if (existing) {
      existing.addEventListener('load', () => { _scriptLoaded = true; resolve(); });
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { _scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
}

// ─── Connect Google Drive (GIS Popup with Fallback) ───────────────────────────

/**
 * Opens Google OAuth authorization for the Drive scope.
 * Uses native window popup or redirect URL so browser popup blockers do not block it.
 */
export function connectDrive(): Promise<string> {
  const clientId = getGoogleClientId();

  if (!clientId || clientId.trim() === '' || clientId === 'your_google_web_client_id') {
    return Promise.reject(
      new Error(
        'Google Drive connection is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to environment variables.'
      )
    );
  }

  // Try GIS token client if script is loaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google = typeof window !== 'undefined' ? (window as any).google : null;
  if (google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response: { access_token?: string; error?: string; expires_in?: number; email?: string }) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error ?? 'Authorization was denied or cancelled'));
            return;
          }
          const expiresIn = response.expires_in ?? 3600;
          setAccessToken(response.access_token, expiresIn, response.email ?? '');
          resolve(response.access_token);
        },
        error_callback: (err: { type: string; message?: string }) => {
          if (err.type === 'popup_closed') {
            reject(new Error('Authorization cancelled: the popup was closed'));
          } else {
            reject(new Error(err.message ?? 'Google authorization failed'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  // Direct fallback: open Google OAuth in window
  const authUrl = getGoogleOAuthUrl();
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(
    authUrl,
    'GoogleDriveAuth',
    `width=${width},height=${height},left=${left},top=${top},status=yes,toolbar=no,menubar=no,location=yes`
  );

  if (!popup) {
    // If popups are completely disabled in browser settings, redirect current window
    window.location.href = authUrl;
    return new Promise(() => {}); // never resolves because page navigates
  }

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        const token = getAccessToken();
        if (token) {
          resolve(token);
        } else {
          reject(new Error('Authorization popup closed without completing authentication.'));
        }
      }
    }, 500);
  });
}

// ─── Revoke Token ─────────────────────────────────────────────────────────────

/**
 * Revokes the current access token via Google's revocation endpoint.
 * Clears the in-memory token regardless of network outcome.
 */
export async function revokeCurrentToken(): Promise<void> {
  const token = getAccessToken();
  clearAccessToken(); // always clear from memory first

  if (!token) return;

  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
  } catch {
    // Best-effort revocation — token is already cleared from memory
  }
}
