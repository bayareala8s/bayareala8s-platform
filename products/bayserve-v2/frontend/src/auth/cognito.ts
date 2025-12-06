// src/auth/cognito.ts
const region = import.meta.env.VITE_COGNITO_REGION;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const domain = import.meta.env.VITE_COGNITO_DOMAIN;
const redirectUri = encodeURIComponent(import.meta.env.VITE_COGNITO_REDIRECT_URI || window.location.origin + "/auth/callback");

const scopes = encodeURIComponent("openid email");
const responseType = "token"; // implicit flow, ID token in hash

export function buildLoginUrl(): string {
  return `https://${domain}/oauth2/authorize?client_id=${clientId}&response_type=${responseType}&scope=${scopes}&redirect_uri=${redirectUri}`;
}

export function buildLogoutUrl(): string {
  // Optional: Cognito logout
  return `https://${domain}/logout?client_id=${clientId}&logout_uri=${redirectUri}`;
}

// Parse tokens from URL hash fragment after Cognito redirect
export function parseCognitoHash(hash: string): { idToken?: string; accessToken?: string; expiresIn?: number } {
  const trimmed = hash.replace(/^#/, "");
  const params = new URLSearchParams(trimmed);

  const idToken = params.get("id_token") || undefined;
  const accessToken = params.get("access_token") || undefined;
  const expiresInStr = params.get("expires_in");
  const expiresIn = expiresInStr ? Number(expiresInStr) : undefined;

  return { idToken, accessToken, expiresIn };
}
