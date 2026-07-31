// ============================================================
// DailyLedger — lib/gis/tokenClient.ts
// Google Identity Services (GIS) OAuth 2.0 token client.
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

// ─── Connect Google Drive (GIS Token Client Popup) ────────────────────────────

let _gisTokenClient: { requestAccessToken: (overrideConfig?: { prompt?: string }) => void } | null = null;

/**
 * Initializes GIS Token Client. Can be called on page/component mount.
 */
export function initGISTokenClient(onSuccess: (token: string, email?: string) => void, onError: (err: Error) => void): boolean {
  const clientId = getGoogleClientId();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google = typeof window !== 'undefined' ? (window as any).google : null;

  if (!google?.accounts?.oauth2) return false;

  try {
    _gisTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response: { access_token?: string; error?: string; expires_in?: number; email?: string }) => {
        if (response.error || !response.access_token) {
          onError(new Error(response.error ?? 'Authorization was denied or cancelled'));
          return;
        }
        const expiresIn = response.expires_in ?? 3600;
        setAccessToken(response.access_token, expiresIn, response.email ?? '');
        onSuccess(response.access_token, response.email);
      },
      error_callback: (err: { type: string; message?: string }) => {
        if (err.type === 'popup_closed') {
          onError(new Error('Authorization cancelled: the popup was closed'));
        } else {
          onError(new Error(err.message ?? 'Google authorization failed'));
        }
      },
    });
    return true;
  } catch (err) {
    console.error('Failed to init GIS token client:', err);
    return false;
  }
}

/**
 * Opens Google OAuth token authorization popup via GIS.
 * Requires zero redirect_uri parameter, eliminating redirect_uri_mismatch error.
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const google = typeof window !== 'undefined' ? (window as any).google : null;
  if (!google?.accounts?.oauth2) {
    loadGISScript().catch(() => {});
    return Promise.reject(
      new Error('Google Identity Services script is loading. Please click Connect again.')
    );
  }

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
