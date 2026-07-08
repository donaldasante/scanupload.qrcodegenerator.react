export interface ScanUploadConfig {
    downloadBaseUrl: string;
    frontendBaseUrl: string;
    keycloakUrl: string;
    keycloakRealm: string;
    keycloakScope: string;
    headersToForward: string[];
    additionalHeaders: Record<string, string>;
}

export interface CachedToken {
    access_token: string;
    expires_in: number;
    expires_at: number;
}

let cachedToken: CachedToken | null = null;

export function getScanUploadConfig(): ScanUploadConfig {
    return {
        downloadBaseUrl: process.env.SCANUPLOAD_DOWNLOAD_BASE_URL ?? 'https://hub.scanupload.net/api/file-management/download-session',
        frontendBaseUrl: process.env.SCANUPLOAD_FRONTEND_BASE_URL ?? 'https://hub.scanupload.net/api/front-end',
        keycloakUrl: process.env.SCANUPLOAD_KEYCLOAK_URL ?? 'https://identity.scanupload.net',
        keycloakRealm: process.env.SCANUPLOAD_KEYCLOAK_REALM ?? 'scanupload-hub',
        keycloakScope: process.env.SCANUPLOAD_KEYCLOAK_SCOPE ?? 'openid profile email scanupload.hub',
        headersToForward: ['content-type', 'user-agent', 'x-requested-with', 'x-api-key'],
        additionalHeaders: {
            'X-Forwarded-By': 'ScanUpload-Proxy',
            'X-Proxy-Version': '1.0'
        }
    };
}

export async function getAccessToken(): Promise<CachedToken> {
    const nowSeconds = Date.now() / 1000;

    if (cachedToken && cachedToken.expires_at > nowSeconds + 30) {
        return cachedToken;
    }

    const clientId = process.env.SCANUPLOAD_CLIENT_ID;
    const clientSecret = process.env.SCANUPLOAD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('SCANUPLOAD_CLIENT_ID and SCANUPLOAD_CLIENT_SECRET environment variables are required.');
    }

    const config = getScanUploadConfig();
    const tokenUrl = `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: config.keycloakScope
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Keycloak token exchange failed: ${response.status} ${response.statusText}. ${text}`);
    }

    const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };

    cachedToken = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        expires_at: nowSeconds + data.expires_in
    };

    return cachedToken;
}
