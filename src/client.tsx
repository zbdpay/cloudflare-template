import { createRoot } from "react-dom/client";
import { useState } from "react";
import { useAgent } from "agents/react";

type AgentState = {
  lastFetchUrl: string | null;
  lastFetchAt: number | null;
  totalSpentSats: number;
};

type FetchPaidResult = {
  status: number;
  body: string;
  spentSats: number;
};

const accent = "#00ff88";
const bg = "#0a0a0a";
const text = "#ededed";
const muted = "#777";
const border = "#1e1e1e";
const inputBg = "#111";

const sectionStyle: React.CSSProperties = {
  borderTop: `1px solid ${border}`,
  padding: "32px 0",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: accent,
  marginBottom: 12,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  background: inputBg,
  border: `1px solid ${border}`,
  color: text,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  padding: "10px 14px",
  borderRadius: 4,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  background: accent,
  color: "#0a0a0a",
  border: "none",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 20px",
  borderRadius: 4,
  cursor: "pointer",
  letterSpacing: "0.04em",
};

const buttonDisabled: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  color: "#ff4444",
  fontSize: 13,
  marginTop: 8,
};

const resultStyle: React.CSSProperties = {
  background: inputBg,
  border: `1px solid ${border}`,
  borderRadius: 4,
  padding: "12px 16px",
  fontSize: 13,
  color: text,
  marginTop: 12,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

function Dashboard() {
  const [agentState, setAgentState] = useState<AgentState>({
    lastFetchUrl: null,
    lastFetchAt: null,
    totalSpentSats: 0,
  });

  const agent = useAgent<AgentState>({
    agent: "zbd-payment-agent",
    name: "default",
    onStateUpdate: (state) => setAgentState(state),
  });

  // Buy-side fetch
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Scheduled fetch
  const [scheduleUrl, setScheduleUrl] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const handleFetchPaid = async () => {
    if (!fetchUrl.trim()) return;
    setFetchLoading(true);
    setFetchError(null);
    setFetchResult(null);
    try {
      const result = await agent.call<FetchPaidResult>("fetchPaid", [
        fetchUrl,
      ]);
      setFetchResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleUrl.trim()) return;
    setScheduleLoading(true);
    setScheduleError(null);
    setScheduleSuccess(false);
    try {
      await agent.call("startScheduledFetch", [scheduleUrl]);
      setScheduleSuccess(true);
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Scheduling failed",
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  const formatTimestamp = (ts: number | null) => {
    if (ts === null) return "—";
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div
      style={{
        background: bg,
        color: text,
        fontFamily: "'IBM Plex Mono', monospace",
        minHeight: "100vh",
        margin: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        {/* Header */}
        <header style={{ paddingBottom: 40 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 12px",
              letterSpacing: "-0.02em",
            }}
          >
            ZBD{" "}
            <span style={{ color: accent, fontWeight: 400 }}>&times;</span>{" "}
            Cloudflare Agent
          </h1>
          <p
            style={{
              color: muted,
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 540,
            }}
          >
            A Cloudflare Workers starter for building AI agents that pay for
            premium content automatically. Fetch paywalled URLs, schedule
            recurring fetches, and track spending in real time.
          </p>
        </header>

        {/* Live State */}
        <section style={sectionStyle}>
          <span style={labelStyle}>Agent State</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
                Last Fetch URL
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: agentState.lastFetchUrl ? text : muted,
                  wordBreak: "break-all",
                }}
              >
                {agentState.lastFetchUrl ?? "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
                Last Fetch At
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: agentState.lastFetchAt ? text : muted,
                }}
              >
                {formatTimestamp(agentState.lastFetchAt)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
                Total Spent
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: agentState.totalSpentSats > 0 ? accent : muted,
                  fontWeight: agentState.totalSpentSats > 0 ? 600 : 400,
                }}
              >
                {agentState.totalSpentSats} sats
              </div>
            </div>
          </div>
        </section>

        {/* Buy-Side Agent */}
        <section style={sectionStyle}>
          <span style={labelStyle}>Buy-Side Agent</span>
          <p
            style={{
              color: muted,
              fontSize: 13,
              margin: "0 0 16px",
              lineHeight: 1.5,
            }}
          >
            Fetch any URL through the agent — if it hits a 402 paywall, the
            agent pays automatically with sats.
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="https://example.com/api/premium"
              value={fetchUrl}
              onChange={(e) => setFetchUrl(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleFetchPaid}
              disabled={fetchLoading || !fetchUrl.trim()}
              style={
                fetchLoading || !fetchUrl.trim() ? buttonDisabled : buttonStyle
              }
            >
              {fetchLoading ? "Fetching\u2026" : "Fetch"}
            </button>
          </div>

          {fetchError && <p style={errorStyle}>{fetchError}</p>}
          {fetchResult && <pre style={resultStyle}>{fetchResult}</pre>}
        </section>

        {/* Scheduled Fetch */}
        <section style={sectionStyle}>
          <span style={labelStyle}>Scheduled Fetch</span>
          <p
            style={{
              color: muted,
              fontSize: 13,
              margin: "0 0 16px",
              lineHeight: 1.5,
            }}
          >
            Set up a recurring fetch every 60 seconds. The agent will keep
            paying and fetching the URL on schedule.
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="https://example.com/api/premium"
              value={scheduleUrl}
              onChange={(e) => setScheduleUrl(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleSchedule}
              disabled={scheduleLoading || !scheduleUrl.trim()}
              style={
                scheduleLoading || !scheduleUrl.trim()
                  ? buttonDisabled
                  : buttonStyle
              }
            >
              {scheduleLoading ? "Starting\u2026" : "Schedule"}
            </button>
          </div>

          {scheduleError && <p style={errorStyle}>{scheduleError}</p>}
          {scheduleSuccess && (
            <p style={{ color: accent, fontSize: 13, marginTop: 8 }}>
              Scheduled fetch started — the agent will fetch every 60s.
            </p>
          )}
        </section>

        {/* Sell-Side Info */}
        <section style={sectionStyle}>
          <span style={labelStyle}>Sell-Side Endpoint</span>
          <p
            style={{
              color: muted,
              fontSize: 13,
              margin: "0 0 16px",
              lineHeight: 1.5,
            }}
          >
            Your worker includes a paywalled endpoint at{" "}
            <span style={{ color: accent }}>/api/premium</span>. It returns a
            402 with an L402 challenge — any agent with{" "}
            <span style={{ color: accent }}>zbdFetch</span> can pay and access
            it automatically.
          </p>
          <pre
            style={{
              background: inputBg,
              border: `1px solid ${border}`,
              borderRadius: 4,
              padding: "14px 18px",
              fontSize: 13,
              color: text,
              margin: 0,
              overflowX: "auto",
            }}
          >
            curl http://localhost:5173/api/premium
          </pre>
        </section>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Dashboard />);
}
