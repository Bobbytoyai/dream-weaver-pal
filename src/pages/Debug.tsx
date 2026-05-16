import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface ProbeResult {
  ok: boolean
  latency_ms: number
  detail?: string
}

interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  total_ms: number
  env_present: Record<string, boolean | string>
  checks: Record<string, ProbeResult>
  brain_v8: { spec_url: string; version: string }
}

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/_health`

function Pill({ ok, label }: { ok: boolean | string; label: string }) {
  const bg = ok === true ? 'bg-green-500' : ok === false ? 'bg-red-500' : 'bg-zinc-500'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono text-white ${bg}`}>
      {label}: {typeof ok === 'boolean' ? (ok ? '✓' : '✗') : ok}
    </span>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

export default function Debug() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthErr, setHealthErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authUser, setAuthUser] = useState<string | null>(null)

  async function probe() {
    setLoading(true)
    setHealthErr(null)
    try {
      const session = await supabase.auth.getSession()
      const token =
        session.data.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

      const r = await fetch(FUNC_URL, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      const j = (await r.json()) as HealthResponse
      setHealth(j)
    } catch (e) {
      setHealthErr(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    probe()
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user?.email ?? null))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-6 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-violet-400">Bobby /debug</h1>
            <p className="text-sm text-zinc-500">Diagnostic dashboard for cloud + app health</p>
          </div>
          <button
            type="button"
            onClick={probe}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm"
          >
            {loading ? '…' : 'Refresh'}
          </button>
        </header>

        <Card title="Frontend env">
          <div className="flex flex-wrap gap-2">
            <Pill
              ok={Boolean(import.meta.env.VITE_SUPABASE_URL)}
              label="VITE_SUPABASE_URL"
            />
            <Pill
              ok={Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)}
              label="VITE_SUPABASE_PUBLISHABLE_KEY"
            />
            <Pill
              ok={Boolean(import.meta.env.VITE_SUPABASE_PROJECT_ID)}
              label="VITE_SUPABASE_PROJECT_ID"
            />
            <Pill ok={import.meta.env.MODE} label="mode" />
            <Pill ok={authUser ?? '(anonymous)'} label="user" />
          </div>
        </Card>

        {healthErr && (
          <Card title="Cloud probe — ERROR">
            <pre className="text-red-400 text-xs whitespace-pre-wrap">{healthErr}</pre>
            <p className="text-xs text-zinc-500">
              The <code>_health</code> Edge Function may not be deployed yet. Deploy with:{' '}
              <code className="text-violet-400">supabase functions deploy _health</code>
            </p>
          </Card>
        )}

        {health && (
          <>
            <Card title={`Cloud status — ${health.status}`}>
              <div className="text-xs text-zinc-500">
                {health.timestamp} · {health.total_ms} ms
              </div>
            </Card>

            <Card title="Cloud env">
              <div className="flex flex-wrap gap-2">
                {Object.entries(health.env_present).map(([k, v]) => (
                  <Pill key={k} ok={v} label={k} />
                ))}
              </div>
            </Card>

            <Card title="Cloud probes">
              <div className="space-y-2">
                {Object.entries(health.checks).map(([name, r]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{r.latency_ms} ms</span>
                      <Pill ok={r.ok} label={r.detail ?? (r.ok ? 'ok' : 'fail')} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Bobby Brain V8">
              <div className="text-xs">
                <Pill ok={true} label={`spec ${health.brain_v8.version}`} />{' '}
                <Pill
                  ok={parseInt(String(health.env_present.V8_ROLLOUT_PERCENT), 10) > 0}
                  label={`rollout ${health.env_present.V8_ROLLOUT_PERCENT}%`}
                />
              </div>
            </Card>
          </>
        )}

        <Card title="Manual probes">
          <p className="text-xs text-zinc-500 mb-2">
            Quick curl tests (copy and paste, replace YOUR_TOKEN with the auth token):
          </p>
          <pre className="text-xs bg-zinc-950 p-3 rounded-md overflow-x-auto">
{`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/_health

curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\
  -d '{"text":"j ai peur du noir","lang":"fr"}' \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/safety

curl -X POST -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"salut"}],"childAge":7,"userId":"YOUR_USER_ID"}' \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bobby-brain`}
          </pre>
        </Card>

        <footer className="text-xs text-zinc-600 pt-4 border-t border-zinc-800">
          Bobby Cloud · powered by Supabase EU · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  )
}
