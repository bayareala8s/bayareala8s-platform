import React, { useEffect, useState } from 'react';

interface Flow {
  id: string;
  name: string;
  status: string;
}

type Tab = 'flows' | 'executions' | 'ai' | 'settings';

// --- Config from env ---
const apiBase =
  import.meta.env.VITE_API_BASE_URL || 'https://example.execute-api.us-west-2.amazonaws.com';

const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN as string;
// For now we redirect back to root of the app
const cognitoRedirectUri =
  (import.meta.env.VITE_COGNITO_REDIRECT_URI as string) || window.location.origin;

// --- Helpers for Cognito Hosted UI ---
// response_type=token => implicit flow, token is in URL hash
const encodedRedirectUri = encodeURIComponent(cognitoRedirectUri);
const encodedScopes = encodeURIComponent('openid email');

function buildLoginUrl(): string {
  return `https://${cognitoDomain}/login?client_id=${cognitoClientId}&response_type=token&scope=${encodedScopes}&redirect_uri=${encodedRedirectUri}`;
}

function buildLogoutUrl(): string {
  // Optional: redirect back to app after logout
  return `https://${cognitoDomain}/logout?client_id=${cognitoClientId}&logout_uri=${encodedRedirectUri}`;
}

function parseTokensFromHash(hash: string): { idToken?: string; accessToken?: string } {
  const trimmed = hash.replace(/^#/, '');
  const params = new URLSearchParams(trimmed);

  const idToken = params.get('id_token') || undefined;
  const accessToken = params.get('access_token') || undefined;

  return { idToken, accessToken };
}

const TOKEN_STORAGE_KEY = 'bayserve_v2_id_token';

  const App: React.FC = () => {
  // --- Auth state ---
  const [idToken, setIdToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const isAuthenticated = !!idToken;

  // --- Existing state ---
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('flows');
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // --- On first load: parse Cognito redirect hash ---
  useEffect(() => {
    if (window.location.hash.startsWith('#id_token') || window.location.hash.includes('id_token=')) {
      const { idToken: newIdToken } = parseTokensFromHash(window.location.hash);
      if (newIdToken) {
        setIdToken(newIdToken);
        localStorage.setItem(TOKEN_STORAGE_KEY, newIdToken);
      }

      // Clear hash from URL so it looks clean
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = () => {
    window.location.href = buildLoginUrl();
  };

  const handleLogout = () => {
    setIdToken(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // Optional: also log out at Cognito side
    window.location.href = buildLogoutUrl();
  };

  // --- API helpers that attach Authorization when we have a token ---
  const fetchFlows = async () => {
    if (!isAuthenticated) {
      setError('You must sign in to view flows.');
      setFlows([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {};
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const res = await fetch(apiBase + '/flows', {
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load flows (${res.status}): ${text}`);
      }

      const data = await res.json();
      setFlows(data.items || data.flows || []);
    } catch (err) {
      setError((err as Error).message);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'flows' && isAuthenticated) {
      fetchFlows();
    }
  }, [tab, isAuthenticated]);

  const handleAskAI = async () => {
    if (!isAuthenticated) {
      setAiError('You must sign in to use the AI assistant.');
      return;
    }

    try {
      setAiLoading(true);
      setAiError(null);
      setAiResponse(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const res = await fetch(apiBase + '/ai/explain', {
        method: 'POST',
        headers,
        body: JSON.stringify({ error: aiInput }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI request failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      setAiResponse(data.explanation || 'No explanation returned.');
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <aside
        style={{
          width: '240px',
          borderRight: '1px solid #e5e7eb',
          padding: '1.25rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>BayServe v2</h2>

        {/* Simple auth status and controls */}
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          {isAuthenticated ? (
            <>
              <div style={{ marginBottom: '0.25rem', color: '#16a34a' }}>Signed in</div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '0.25rem', color: '#b91c1c' }}>Not signed in</div>
              <button
                onClick={handleLogin}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <nav>
          <button
            onClick={() => setTab('flows')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: tab === 'flows' ? '#e5e7eb' : 'transparent',
              cursor: 'pointer',
            }}
          >
            Flows
          </button>
          <button
            onClick={() => setTab('executions')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: tab === 'executions' ? '#e5e7eb' : 'transparent',
              cursor: 'pointer',
            }}
          >
            Executions
          </button>
          <button
            onClick={() => setTab('ai')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: tab === 'ai' ? '#e5e7eb' : 'transparent',
              cursor: 'pointer',
            }}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setTab('settings')}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.25rem',
              borderRadius: '0.375rem',
              border: 'none',
              backgroundColor: tab === 'settings' ? '#e5e7eb' : 'transparent',
              cursor: 'pointer',
            }}
          >
            Settings
          </button>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '1.5rem' }}>
        {tab === 'flows' && (
          <section>
            <h1>Flows</h1>
            <p style={{ color: '#555' }}>List of self-serve file transfer flows.</p>
            {!isAuthenticated && (
              <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
                You must sign in to view flows.
              </p>
            )}
            {loading && <p>Loading flows…</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {!loading && !error && isAuthenticated && (
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  maxWidth: '900px',
                  marginTop: '1rem',
                  border: '1px solid #ddd',
                }}
              >
                <thead style={{ backgroundColor: '#f3f4f6' }}>
                  <tr>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((flow) => (
                    <tr key={flow.id}>
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #eee' }}>
                        {flow.id}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #eee' }}>
                        {flow.name}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #eee' }}>
                        {flow.status}
                      </td>
                    </tr>
                  ))}
                  {flows.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: '0.75rem',
                          textAlign: 'center',
                          color: '#777',
                        }}
                      >
                        No flows found yet. Create flows via API or extend this UI to add a creation
                        wizard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        )}

        {tab === 'executions' && (
          <section>
            <h1>Executions</h1>
            <p style={{ color: '#555' }}>Coming soon: execution history and status.</p>
          </section>
        )}

        {tab === 'ai' && (
          <section>
            <h1>AI Assistant</h1>
            <p style={{ color: '#555' }}>
              Paste an error message or describe a failed flow and let the AI suggest next steps.
            </p>
            {!isAuthenticated && (
              <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
                You must sign in to use the AI assistant.
              </p>
            )}
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                maxWidth: '900px',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                marginTop: '0.5rem',
                fontFamily: 'inherit',
              }}
              placeholder="Example: Partner SFTP connection failed with timeout..."
            />
            <div style={{ marginTop: '0.75rem' }}>
              <button
                onClick={handleAskAI}
                disabled={aiLoading || !aiInput.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                {aiLoading ? 'Asking AI…' : 'Ask AI'}
              </button>
            </div>
            {aiError && <p style={{ color: 'red', marginTop: '0.75rem' }}>Error: {aiError}</p>}
            {aiResponse && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  maxWidth: '900px',
                }}
              >
                <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>AI Explanation</h2>
                <p style={{ whiteSpace: 'pre-wrap' }}>{aiResponse}</p>
              </div>
            )}
          </section>
        )}

        {tab === 'settings' && (
          <section>
            <h1>Settings</h1>
            <p style={{ color: '#555' }}>
              Environment: PROD (placeholder). In production, show Cognito user, tenant, region, etc.
            </p>
          </section>
        )}
      </main>
    </div>
  );
};
export default App;