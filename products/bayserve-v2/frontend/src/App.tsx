// products/bayserve-v2/frontend/src/App.tsx

import React, { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";

interface Flow {
  id: string;
  name: string;
  status: string;
  type?: "FLOW" | "CONNECTION";
  sourceConfig?: {
    type: "sftp";
    host: string;
    port?: number;
    username?: string;
    remotePath?: string;
  };
  targetConfig?: {
    type: "s3";
    bucket: string;
    prefix?: string;
  };
}

type Tab = "flows" | "connections" | "executions" | "ai" | "settings";

const apiBase =
  import.meta.env.VITE_API_BASE_URL ||
  "https://example.execute-api.us-west-2.amazonaws.com";

const App: React.FC = () => {
  const {
    isAuthenticated,
    idToken,
    user,
    loading: authLoading,
    signIn,
    signOut,
  } = useAuth();

  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("flows");

  const [newFlowName, setNewFlowName] = useState("");
  const [creating, setCreating] = useState(false);

  // Connection configuration form state
  const [connectionName, setConnectionName] = useState("");
  const [sftpHost, setSftpHost] = useState("");
  const [sftpPort, setSftpPort] = useState(22);
  const [sftpUsername, setSftpUsername] = useState("");
  const [sftpRemotePath, setSftpRemotePath] = useState("");
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3Prefix, setS3Prefix] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);

  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Settings data fetched from backend
  const [settings, setSettings] = useState<{
    environment?: string;
    region?: string;
    product?: string;
    tenantId?: string;
  } | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  /**
   * Fetch flows from the backend.
   * Requires the user to be authenticated and an idToken present.
   */
  const fetchFlows = async () => {
    if (!isAuthenticated || !idToken) {
      setError("Not authenticated");
      setFlows([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiBase}/flows`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load flows (${res.status})`);
      }

      const data = await res.json();
      setFlows(data.items || []);
    } catch (err) {
      console.error("Error loading flows", err);
      setError((err as Error).message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const createNewFlow = async () => {
    if (!isAuthenticated || !idToken) {
      setError("Not authenticated");
      return;
    }
    if (!newFlowName.trim()) {
      setError("Flow name is required");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const res = await fetch(`${apiBase}/flows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: newFlowName.trim(),
          status: "DRAFT",
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create flow (${res.status})`);
      }

      const data = await res.json();
      const created: Flow | undefined = data.item;

      if (created) {
        setFlows((prev) => [created, ...prev]);
      } else {
        await fetchFlows();
      }

      setNewFlowName("");
    } catch (err) {
      console.error("Error creating flow", err);
      setError((err as Error).message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const createConnection = async () => {
    if (!isAuthenticated || !idToken) {
      setError("Not authenticated");
      return;
    }
    if (!connectionName.trim() || !sftpHost.trim() || !s3Bucket.trim()) {
      setError("Name, SFTP host, and S3 bucket are required");
      return;
    }

    try {
      setSavingConnection(true);
      setError(null);

      const res = await fetch(`${apiBase}/flows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: connectionName.trim(),
          status: "DRAFT",
          type: "CONNECTION",
          sourceConfig: {
            type: "sftp",
            host: sftpHost.trim(),
            port: sftpPort,
            username: sftpUsername.trim() || undefined,
            remotePath: sftpRemotePath.trim() || undefined,
          },
          targetConfig: {
            type: "s3",
            bucket: s3Bucket.trim(),
            prefix: s3Prefix.trim() || undefined,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create connection (${res.status})`);
      }

      const data = await res.json();
      const created: Flow | undefined = data.item;

      if (created) {
        setFlows((prev) => [created, ...prev]);
      } else {
        await fetchFlows();
      }

      setConnectionName("");
      setSftpHost("");
      setSftpPort(22);
      setSftpUsername("");
      setSftpRemotePath("");
      setS3Bucket("");
      setS3Prefix("");
    } catch (err) {
      console.error("Error creating connection", err);
      setError((err as Error).message || "Create connection failed");
    } finally {
      setSavingConnection(false);
    }
  };

  /**
   * Ask AI endpoint (optionally we can pass token as well; for now it's open
   * or secured the same way as flows).
   */
  const handleAskAI = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiResponse(null);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (isAuthenticated && idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      const res = await fetch(`${apiBase}/ai/explain`, {
        method: "POST",
        headers,
        body: JSON.stringify({ error: aiInput }),
      });

      if (!res.ok) {
        throw new Error(`AI request failed (${res.status})`);
      }

      const data = await res.json();
      setAiResponse(data.explanation || "No explanation returned.");
    } catch (err) {
      console.error("Error calling AI", err);
      setAiError((err as Error).message || "AI request failed");
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * When the active tab is "flows" and auth is ready, load flows.
   */
  useEffect(() => {
    if (tab === "flows" && isAuthenticated && idToken) {
      fetchFlows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAuthenticated, idToken]);

  // Load settings when Settings tab is opened
  useEffect(() => {
    const fetchSettings = async () => {
      if (!isAuthenticated || !idToken) {
        setSettings(null);
        return;
      }

      try {
        setSettingsError(null);
        const res = await fetch(`${apiBase}/settings`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load settings (${res.status})`);
        }

        const data = await res.json();
        setSettings(data);
      } catch (err) {
        console.error("Error loading settings", err);
        setSettingsError((err as Error).message || "Failed to load settings");
      }
    };

    if (tab === "settings") {
      fetchSettings();
    }
  }, [tab, isAuthenticated, idToken]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: "260px",
          borderRight: "1px solid #e5e7eb",
          padding: "1.25rem",
          backgroundColor: "#f9fafb",
        }}
      >
        <h2 style={{ marginBottom: "1rem", fontSize: "1.15rem" }}>
          BayServe v2
        </h2>

        {/* Auth status */}
        <div style={{ marginBottom: "1rem" }}>
          {authLoading ? (
            <span style={{ color: "#6b7280" }}>Checking session…</span>
          ) : isAuthenticated ? (
            <>
              <div style={{ color: "#16a34a", marginBottom: "0.35rem" }}>
                Signed in
              </div>
              {user?.email && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#4b5563",
                    marginBottom: "0.35rem",
                  }}
                >
                  {user.email}
                </div>
              )}
              <button
                onClick={signOut}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={signIn}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "#2563eb",
                color: "white",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              Sign in
            </button>
          )}
        </div>

        {/* Nav */}
        <nav>
          <button
            onClick={() => setTab("flows")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.25rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor: tab === "flows" ? "#e5e7eb" : "transparent",
              cursor: "pointer",
            }}
          >
            Flows
          </button>
          <button
            onClick={() => setTab("connections")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.25rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor:
                tab === "connections" ? "#e5e7eb" : "transparent",
              cursor: "pointer",
            }}
          >
            Connections
          </button>
          <button
            onClick={() => setTab("executions")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.25rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor: tab === "executions" ? "#e5e7eb" : "transparent",
              cursor: "pointer",
            }}
          >
            Executions
          </button>
          <button
            onClick={() => setTab("ai")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.25rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor: tab === "ai" ? "#e5e7eb" : "transparent",
              cursor: "pointer",
            }}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setTab("settings")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.5rem 0.75rem",
              marginBottom: "0.25rem",
              borderRadius: "0.375rem",
              border: "none",
              backgroundColor: tab === "settings" ? "#e5e7eb" : "transparent",
              cursor: "pointer",
            }}
          >
            Settings
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "1.5rem" }}>
        {tab === "flows" && (
          <section>
            <h1>Flows</h1>
            <p style={{ color: "#555" }}>
              List of self-serve file transfer flows.
            </p>

            {!isAuthenticated && !authLoading && (
              <p style={{ color: "#b91c1c", marginTop: "0.75rem" }}>
                Please sign in to view flows.
              </p>
            )}

            {loading && <p>Loading flows…</p>}
            {error && (
              <p style={{ color: "red", marginTop: "0.5rem" }}>
                Error: {error}
              </p>
            )}

            {isAuthenticated && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "0.75rem",
                }}
              >
                <input
                  type="text"
                  placeholder="New flow name"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.375rem",
                    border: "1px solid #d1d5db",
                  }}
                />
                <button
                  onClick={createNewFlow}
                  disabled={creating || !newFlowName.trim()}
                  style={{
                    padding: "0.4rem 0.9rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor:
                      creating || !newFlowName.trim() ? "#9ca3af" : "#2563eb",
                    color: "white",
                    cursor:
                      creating || !newFlowName.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  {creating ? "Creating…" : "New Flow"}
                </button>
              </div>
            )}

            {!loading && !error && isAuthenticated && (
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  maxWidth: "900px",
                   marginTop: "1rem",
                  border: "1px solid #ddd",
                }}
              >
                <thead style={{ backgroundColor: "#f3f4f6" }}>
                  <tr>
                    <th
                      style={{
                        padding: "0.5rem 0.75rem",
                        textAlign: "left",
                       }}
                     >
                       ID
                     </th>
                     <th
                       style={{
                         padding: "0.5rem 0.75rem",
                         textAlign: "left",
                       }}
                     >
                       Name
                     </th>
                     <th
                       style={{
                         padding: "0.5rem 0.75rem",
                         textAlign: "left",
                       }}
                     >
                       Status
                     </th>
                   </tr>
                 </thead>
                 <tbody>
                  {flows.map((flow) => (
                    <tr key={flow.id}>
                      <td
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        {flow.id}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        {flow.name}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 0.75rem",
                          borderTop: "1px solid #eee",
                        }}
                      >
                        {flow.status}
                      </td>
                    </tr>
                  ))}
                  {flows.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          color: "#777",
                        }}
                      >
                        No flows found yet. Create flows via API or extend this
                        UI to add a creation wizard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        )}

        {tab === "connections" && (
          <section>
            <h1>Connections</h1>
            <p style={{ color: "555" }}>
              Configure SFTP source and S3 target endpoints for file transfers.
            </p>

            {!isAuthenticated && !authLoading && (
              <p style={{ color: "#b91c1c", marginTop: "0.75rem" }}>
                Please sign in to manage connections.
              </p>
            )}

            {error && (
              <p style={{ color: "red", marginTop: "0.5rem" }}>
                Error: {error}
              </p>
            )}

            {isAuthenticated && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    maxWidth: "900px",
                    marginTop: "1rem",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Connection name"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="SFTP host"
                    value={sftpHost}
                    onChange={(e) => setSftpHost(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="SFTP port"
                    value={sftpPort}
                    onChange={(e) =>
                      setSftpPort(Number(e.target.value || 22))
                    }
                  />
                  <input
                    type="text"
                    placeholder="SFTP username (optional)"
                    value={sftpUsername}
                    onChange={(e) => setSftpUsername(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="SFTP remote path (optional)"
                    value={sftpRemotePath}
                    onChange={(e) => setSftpRemotePath(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="S3 bucket"
                    value={s3Bucket}
                    onChange={(e) => setS3Bucket(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="S3 prefix (optional)"
                    value={s3Prefix}
                    onChange={(e) => setS3Prefix(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    onClick={createConnection}
                    disabled={
                      savingConnection ||
                      !connectionName.trim() ||
                      !sftpHost.trim() ||
                      !s3Bucket.trim()
                    }
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.375rem",
                      border: "none",
                      backgroundColor: "#2563eb",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    {savingConnection ? "Saving…" : "Save Connection"}
                  </button>
                </div>

                <h2 style={{ marginTop: "1.5rem" }}>Existing flows (all)</h2>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    maxWidth: "900px",
                    marginTop: "0.75rem",
                    border: "1px solid #ddd",
                  }}
                >
                  <thead style={{ backgroundColor: "#f3f4f6" }}>
                    <tr>
                      <th
                        style={{
                          padding: "0.5rem 0.75rem",
                          textAlign: "left",
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.75rem",
                          textAlign: "left",
                        }}
                      >
                        SFTP host
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.75rem",
                          textAlign: "left",
                        }}
                      >
                        S3 bucket
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flows.map((conn) => (
                      <tr key={conn.id}>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderTop: "1px solid #eee",
                          }}
                        >
                          {conn.name}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderTop: "1px solid #eee",
                          }}
                        >
                          {conn.sourceConfig?.host || "-"}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem 0.75rem",
                            borderTop: "1px solid #eee",
                          }}
                        >
                          {conn.targetConfig?.bucket || "-"}
                        </td>
                      </tr>
                    ))}
                    {flows.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            padding: "0.75rem",
                            textAlign: "center",
                            color: "#777",
                          }}
                        >
                          No flows found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {tab === "executions" && (
          <section>
            <h1>Executions</h1>
            <p style={{ color: "#555" }}>
              Coming soon: execution history and status.
            </p>
          </section>
        )}

        {tab === "ai" && (
          <section>
            <h1>AI Assistant</h1>
            <p style={{ color: "#555" }}>
              Paste an error message or describe a failed flow and let the AI
              suggest next steps.
            </p>
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                maxWidth: "900px",
                padding: "0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                marginTop: "0.5rem",
                fontFamily: "inherit",
              }}
              placeholder="Example: Partner SFTP connection failed with timeout..."
            />
            <div style={{ marginTop: "0.75rem" }}>
              <button
                onClick={handleAskAI}
                disabled={aiLoading || !aiInput.trim()}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {aiLoading ? "Asking AI…" : "Ask AI"}
              </button>
            </div>
            {aiError && (
              <p style={{ color: "red", marginTop: "0.75rem" }}>
                Error: {aiError}
              </p>
            )}
            {aiResponse && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#f9fafb",
                  maxWidth: "900px",
                }}
              >
                <h2
                  style={{
                    fontSize: "1rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  AI Explanation
                </h2>
                <p style={{ whiteSpace: "pre-wrap" }}>{aiResponse}</p>
              </div>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section>
            <h1>Settings</h1>
            {!isAuthenticated && !authLoading && (
              <p style={{ color: "#b91c1c", marginTop: "0.75rem" }}>
                Please sign in to view settings.
              </p>
            )}

            {settingsError && (
              <p style={{ color: "red", marginTop: "0.5rem" }}>
                Error: {settingsError}
              </p>
            )}

            {isAuthenticated && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #e5e7eb",
                  maxWidth: "500px",
                  backgroundColor: "#f9fafb",
                }}
              >
                <h2
                  style={{
                    fontSize: "1rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  Environment
                </h2>
                <p>Environment: {settings?.environment ?? "unknown"}</p>
                <p>Region: {settings?.region ?? "unknown"}</p>
                <p>Product: {settings?.product ?? "bayserve-v2"}</p>
                <p>Tenant: {settings?.tenantId ?? "default"}</p>
                {user?.email && <p>User email: {user.email}</p>}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
