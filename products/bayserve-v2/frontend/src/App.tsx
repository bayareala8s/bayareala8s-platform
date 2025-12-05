import React, { useEffect, useState } from 'react';

interface Flow {
  id: string;
  name: string;
  status: string;
}

type Tab = 'flows' | 'executions' | 'ai' | 'settings';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://example.execute-api.us-west-2.amazonaws.com';

export const App: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('flows');
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(apiBase + '/flows', {
        headers: {
          // TODO: attach Authorization: Bearer <token> once Cognito is wired to frontend
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to load flows (${res.status})`);
      }
      const data = await res.json();
      setFlows(data.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'flows') {
      fetchFlows();
    }
  }, [tab]);

  const handleAskAI = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiResponse(null);

      const res = await fetch(apiBase + '/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: aiInput }),
      });

      if (!res.ok) {
        throw new Error(`AI request failed (${res.status})`);
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <aside
        style={{
          width: '240px',
          borderRight: '1px solid #e5e7eb',
          padding: '1.25rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>BayServe v2</h2>
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
            {loading && <p>Loading flows…</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {!loading && !error && (
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
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #eee' }}>{flow.id}</td>
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #eee' }}>{flow.name}</td>
                      <td style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #eee' }}>{flow.status}</td>
                    </tr>
                  ))}
                  {flows.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '0.75rem', textAlign: 'center', color: '#777' }}>
                        No flows found yet. Create flows via API or extend this UI to add a creation wizard.
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
            <p style={{ color: '#555' }}>Paste an error message or describe a failed flow and let the AI suggest next steps.</p>
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
            <p style={{ color: '#555' }}>Environment: PROD (placeholder). In production, show Cognito user, tenant, region, etc.</p>
          </section>
        )}
      </main>
    </div>
  );
};
