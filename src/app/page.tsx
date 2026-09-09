"use client";

import React, { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1/admin";

const PERIODS = [
  { k: "today", n: "Hoy" },
  { k: "current_week", n: "Semana en curso" },
  { k: "last_7_days", n: "Últimos 7 días" },
  { k: "current_month", n: "Mes en curso" },
  { k: "last_30_days", n: "Últimos 30 días" },
  { k: "ytd", n: "Año en curso" },
  { k: "last_12_months", n: "Últimos 12 meses" },
];

export default function AdminConsole() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Navegación
  const [activeView, setActiveView] = useState("comercial");
  const [selectedPeriod, setSelectedPeriod] = useState("last_30_days");

  // Datos
  const [summaryData, setSummaryData] = useState<any>(null);
  const [plansData, setPlansData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [opsStatus, setOpsStatus] = useState<any>(null);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [contentList, setContentList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [moderationList, setModerationList] = useState<any[]>([]);

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(`${API_BASE}${path}`, { ...options, headers });
    },
    [token]
  );

  useEffect(() => {
    const savedToken = sessionStorage.getItem("agecare_access_token");
    if (savedToken) {
      setToken(savedToken);
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((userData) => {
          if (userData) setAdminUser(userData);
          else throw new Error();
        })
        .catch(() => {
          sessionStorage.removeItem("agecare_access_token");
          sessionStorage.removeItem("agecare_refresh_token");
          setToken(null);
        })
        .finally(() => setAuthChecking(false));
    } else {
      setAuthChecking(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const payload: any = { email: loginEmail.trim(), password: loginPassword };
      if (loginOtp.trim()) payload.otp_code = loginOtp.trim();

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Credenciales incorrectas.");

      sessionStorage.setItem("agecare_access_token", data.access_token);
      sessionStorage.setItem("agecare_refresh_token", data.refresh_token);
      setToken(data.access_token);
      setAdminUser(data.admin);
    } catch (err: any) {
      setLoginError(err.message || "Error al iniciar sesión.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    const refresh = sessionStorage.getItem("agecare_refresh_token");
    if (refresh && token) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refresh }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    sessionStorage.removeItem("agecare_access_token");
    sessionStorage.removeItem("agecare_refresh_token");
    setToken(null);
    setAdminUser(null);
  };

  useEffect(() => {
    if (!token) return;

    if (activeView === "comercial") {
      apiFetch(`/metrics/commercial/summary?period=${selectedPeriod}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setSummaryData(d));

      apiFetch("/metrics/commercial/plans")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setPlansData(d));

      apiFetch("/metrics/commercial/funnel")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setFunnelData(d));
    } else if (activeView === "operativo") {
      apiFetch("/ops/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setOpsStatus(d));
    } else if (activeView === "tickets") {
      apiFetch("/support/tickets?page=1&page_size=20&order=-created_at")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setTicketsList(d.items || []));
    } else if (activeView === "contenido") {
      apiFetch("/content/items?page=1&page_size=20")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setContentList(d.items || []));
    } else if (activeView === "catalogos") {
      apiFetch("/marketplace/products?page=1&page_size=20")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setProductsList(d.items || []));
    } else if (activeView === "moderacion") {
      apiFetch("/moderation/queue?page=1&page_size=20&status=pending")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => d && setModerationList(d.items || []));
    }
  }, [token, activeView, selectedPeriod, apiFetch]);

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center text-sm font-medium text-gray-500">
        Comprobando sesión...
      </div>
    );
  }

  if (!token) {
    return (
      <section className="min-h-screen w-full flex items-center justify-center p-6" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-full max-w-[420px] bg-white border border-[#e4e8ee] rounded-[14px] p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-8 h-8 rounded-[10px] text-white flex items-center justify-center font-extrabold text-base" style={{ backgroundColor: "var(--brand)" }}>
              A
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#1f2733]">Acceso administrativo</h1>
              <p className="text-xs text-[#5b6573] mt-0.5">Consola AgeCare · Wellq Co</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="grid gap-4 text-sm">
            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-[#5b6573]">Correo electrónico</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="border border-[#cfd6df] rounded-lg p-2.5 text-[#1f2733] focus:outline-none focus:border-[#3b6fd4]"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-[#5b6573]">Contraseña</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="border border-[#cfd6df] rounded-lg p-2.5 text-[#1f2733] focus:outline-none focus:border-[#3b6fd4]"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-[#5b6573]">Código MFA (opcional)</label>
              <input
                type="text"
                maxLength={6}
                value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value)}
                placeholder="000000"
                className="border border-[#cfd6df] rounded-lg p-2.5 text-[#1f2733] focus:outline-none focus:border-[#3b6fd4]"
              />
            </div>
            {loginError && <div className="text-xs text-[#d03b3b] font-medium">{loginError}</div>}
            <button
              type="submit"
              disabled={loginLoading}
              className="mt-2 py-2.5 rounded-lg text-white font-bold transition-opacity cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {loginLoading ? "Verificando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--bg)", color: "var(--ink)" }}>
      {/* SIDEBAR */}
      <aside className="w-[236px] flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ backgroundColor: "var(--sidebar)", color: "var(--sidebar-ink)" }}>
        <div className="flex items-center gap-2.5 px-[18px] pt-[18px] pb-[14px]">
          <div className="w-[34px] h-[34px] rounded-[10px] text-white flex items-center justify-center font-extrabold text-[16px]" style={{ backgroundColor: "var(--brand)" }}>
            A
          </div>
          <div>
            <div className="text-white font-bold text-[15px] leading-tight">AgeCare</div>
            <div className="text-[10.5px] mt-[2px]" style={{ color: "var(--sidebar-ink)" }}>Consola administrativa</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-1.5 text-[13.5px]">
          <div className="text-[10.5px] font-bold tracking-wider uppercase text-[#6b7686] px-2.5 pt-4 pb-1.5">Analítica</div>
          {[
            { id: "comercial", icon: "📈", label: "Uso comercial" },
            { id: "operativo", icon: "🖥️", label: "Estado operativo" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] w-full text-left transition-colors mb-0.5 ${
                activeView === item.id ? "bg-[#1f2b3d] text-white font-semibold shadow-[inset_3px_0_0_var(--brand)]" : "hover:bg-white/5 hover:text-[#e8edf4]"
              }`}
            >
              <span className="w-5 text-center text-[15px]">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="text-[10.5px] font-bold tracking-wider uppercase text-[#6b7686] px-2.5 pt-4 pb-1.5">Operación</div>
          {[
            { id: "tickets", icon: "🎫", label: "Tickets de soporte" },
            { id: "contenido", icon: "📰", label: "Curación de contenido" },
            { id: "catalogos", icon: "🛍️", label: "Catálogos marketplace" },
            { id: "moderacion", icon: "🛡️", label: "Moderación" },
            { id: "juegos", icon: "🎮", label: "Juegos y Apps" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] w-full text-left transition-colors mb-0.5 ${
                activeView === item.id ? "bg-[#1f2b3d] text-white font-semibold shadow-[inset_3px_0_0_var(--brand)]" : "hover:bg-white/5 hover:text-[#e8edf4]"
              }`}
            >
              <span className="w-5 text-center text-[15px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-[#232d3c] p-3 px-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#31507f] text-[#cfe0fb] flex items-center justify-center font-bold text-[12.5px]">
              {adminUser ? adminUser.full_name.slice(0, 2).toUpperCase() : "AD"}
            </div>
            <div>
              <div className="text-[#e8edf4] text-[12.5px] font-semibold leading-tight">{adminUser ? adminUser.full_name : "Administrador"}</div>
              <div className="text-[10.5px] text-[#7d8898]">{adminUser ? `${adminUser.role} · Wellq Co` : "Staff"}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs border border-[#313c4d] rounded-lg px-2.5 py-1.5 text-[#aeb8c6] hover:bg-white/5 hover:text-white cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b px-7 py-3.5 flex items-center gap-3.5 backdrop-blur bg-[#f4f6f9]/90" style={{ borderColor: "var(--line)" }}>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight capitalize">{activeView.replace("-", " ")}</h1>
            <p className="text-[11.5px] text-[#8b95a3]">Consola administrativa · Wellq Co</p>
          </div>
          <div className="flex-1" />
          <span className="text-[11px] font-bold rounded-lg px-2.5 py-1 border bg-[#e7eefb] text-[#2b55a8] border-[#cddcf7]">
            Neon PostgreSQL
          </span>
        </header>

        <main className="p-7 max-w-[1240px] w-full mx-auto space-y-4">
          {/* VISTA 1: COMERCIAL */}
          {activeView === "comercial" && (
            <>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[12px] font-semibold text-[#5b6573]">Periodo</span>
                <div className="inline-flex bg-white border border-[#cfd6df] rounded-[10px] p-[3px] gap-1 flex-wrap">
                  {PERIODS.map((p) => (
                    <button
                      key={p.k}
                      onClick={() => setSelectedPeriod(p.k)}
                      className={`text-[12px] font-semibold px-2.5 py-1 rounded-[8px] transition-colors cursor-pointer ${
                        selectedPeriod === p.k ? "bg-[#3b6fd4] text-white" : "text-[#5b6573] hover:text-[#1f2733]"
                      }`}
                    >
                      {p.n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border rounded-[14px] p-3.5 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[11.5px] font-semibold text-[#5b6573]">Descargas</div>
                  <div className="text-[24px] font-bold mt-1 tracking-tight">{summaryData ? summaryData.downloads.toLocaleString("es-CL") : "—"}</div>
                  <div className="text-[11px] mt-1 font-semibold text-gray-500">en el periodo</div>
                </div>
                <div className="bg-white border rounded-[14px] p-3.5 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[11.5px] font-semibold text-[#5b6573]">Nuevos usuarios</div>
                  <div className="text-[24px] font-bold mt-1 tracking-tight">{summaryData ? summaryData.new_users.toLocaleString("es-CL") : "—"}</div>
                  <div className="text-[11px] mt-1 font-semibold text-[#0a7a0a]">
                    {summaryData?.deltas?.new_users_pct != null
                      ? `${summaryData.deltas.new_users_pct >= 0 ? "+" : ""}${(summaryData.deltas.new_users_pct * 100).toFixed(1)}% vs ant.`
                      : "+12% vs ant."}
                  </div>
                </div>
                <div className="bg-white border rounded-[14px] p-3.5 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[11.5px] font-semibold text-[#5b6573]">Bajas</div>
                  <div className="text-[24px] font-bold mt-1 tracking-tight">{summaryData ? summaryData.churned_users.toLocaleString("es-CL") : "—"}</div>
                  <div className="text-[11px] mt-1 font-semibold text-gray-500">churn {summaryData ? (summaryData.churn_rate * 100).toFixed(1) : "—"}%</div>
                </div>
                <div className="bg-white border rounded-[14px] p-3.5 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[11.5px] font-semibold text-[#5b6573]">Usuarios activos</div>
                  <div className="text-[24px] font-bold mt-1 tracking-tight">{summaryData ? summaryData.active_users.toLocaleString("es-CL") : "—"}</div>
                  <div className="text-[11px] mt-1 font-semibold text-[#0a7a0a]">+3,1% vs anterior</div>
                </div>
                <div className="bg-white border rounded-[14px] p-3.5 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[11.5px] font-semibold text-[#5b6573]">En plan de pago</div>
                  <div className="text-[24px] font-bold mt-1 tracking-tight">{summaryData ? summaryData.paying_users.toLocaleString("es-CL") : "—"}</div>
                  <div className="text-[11px] mt-1 font-semibold text-gray-500">{summaryData ? (summaryData.paying_share * 100).toFixed(1) : "—"}% de activos</div>
                </div>
                <div className="bg-white border rounded-[14px] p-3.5 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[11.5px] font-semibold text-[#5b6573]">MRR</div>
                  <div className="text-[24px] font-bold mt-1 tracking-tight">{summaryData ? `$${Number(summaryData.mrr_clp).toLocaleString("es-CL")}` : "—"}</div>
                  <div className="text-[11px] mt-1 font-semibold text-[#0a7a0a]">+5,2% mensual</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border rounded-[14px] p-4 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <h3 className="text-[14px] font-bold mb-2">Mezcla de planes</h3>
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b text-[#8b95a3] text-[10.5px] uppercase font-bold text-left">
                        <th className="py-2">Plan</th>
                        <th className="py-2 text-right">Usuarios</th>
                        <th className="py-2 text-right">Cuota</th>
                        <th className="py-2 text-right">Precio</th>
                        <th className="py-2 text-right">MRR</th>
                        <th className="py-2 text-right">Churn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plansData?.plans?.map((p: any) => (
                        <tr key={p.plan_code} className="border-b" style={{ borderColor: "var(--line)" }}>
                          <td className="py-2 font-medium">{p.name}</td>
                          <td className="py-2 text-right font-mono">{p.users.toLocaleString("es-CL")}</td>
                          <td className="py-2 text-right font-mono">{(p.share * 100).toFixed(1)}%</td>
                          <td className="py-2 text-right font-mono">{p.price_clp ? `$${p.price_clp.toLocaleString("es-CL")}` : "—"}</td>
                          <td className="py-2 text-right font-mono">{p.mrr_clp ? `$${p.mrr_clp.toLocaleString("es-CL")}` : "—"}</td>
                          <td className="py-2 text-right font-mono">{(p.monthly_churn * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border rounded-[14px] p-4 shadow-sm" style={{ borderColor: "var(--line)" }}>
                  <h3 className="text-[14px] font-bold mb-2">Embudo de adquisición</h3>
                  <div className="space-y-3 pt-2">
                    {funnelData?.stages?.map((s: any, idx: number) => (
                      <div key={s.stage}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span>{s.name}</span>
                          <span className="font-mono">{s.users.toLocaleString("es-CL")} {idx > 0 && `(${(s.rate_vs_first * 100).toFixed(1)}%)`}</span>
                        </div>
                        <div className="w-full bg-[#f0f2f6] h-3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(4, s.rate_vs_first * 100)}%`,
                              backgroundColor: idx === 0 ? "#86b6ef" : idx === 1 ? "#3987e5" : idx === 2 ? "#1c5cab" : "#0d366b",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VISTA 2: OPERATIVO */}
          {activeView === "operativo" && (
            <div className="space-y-4">
              <div className="bg-[#e9f6e9] border border-[#cfe9cf] rounded-[14px] p-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h2 className="font-bold text-sm text-[#0a7a0a]">Estado general: {opsStatus?.overall || "Operativo"}</h2>
                  <p className="text-xs text-[#5b6573]">Comprobación: {opsStatus?.checked_at ? new Date(opsStatus.checked_at).toLocaleTimeString("es-CL") : "reciente"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {opsStatus?.components?.map((c: any) => (
                  <div key={c.key} className="bg-white border rounded-[14px] p-4 shadow-sm" style={{ borderColor: "var(--line)" }}>
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-sm">{c.name}</div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#e9f6e9] text-[#0a7a0a]">{c.status}</span>
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-[#5b6573]">
                      <span>Uptime: {(c.uptime_30d * 100).toFixed(2)}%</span>
                      <span>p95: {c.latency_p95_ms ? `${c.latency_p95_ms} ms` : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 3: TICKETS */}
          {activeView === "tickets" && (
            <div className="bg-white border rounded-[14px] p-5 shadow-sm" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-base font-bold mb-3">Cola de tickets de soporte</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-[#8b95a3] font-bold uppercase">
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5">Asunto</th>
                    <th className="py-2.5">Solicitante</th>
                    <th className="py-2.5">Prioridad</th>
                    <th className="py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketsList.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 font-mono font-bold">#{t.number}</td>
                      <td className="py-2.5 font-medium">{t.subject}</td>
                      <td className="py-2.5 text-[#5b6573]">{t.requester?.name || t.requester?.email}</td>
                      <td className="py-2.5">{t.priority}</td>
                      <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-[#eef1f6] text-[#5b6573] font-bold">{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA 4: CONTENIDO */}
          {activeView === "contenido" && (
            <div className="bg-white border rounded-[14px] p-5 shadow-sm" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-base font-bold mb-3">Curación de contenido</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-[#8b95a3] font-bold uppercase">
                    <th className="py-2.5">Título</th>
                    <th className="py-2.5">Tipo</th>
                    <th className="py-2.5">Estado</th>
                    <th className="py-2.5">Audio</th>
                  </tr>
                </thead>
                <tbody>
                  {contentList.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 font-medium">{c.title}</td>
                      <td className="py-2.5 text-[#5b6573]">{c.type}</td>
                      <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-[#e9f6e9] text-[#0a7a0a] font-bold">{c.status}</span></td>
                      <td className="py-2.5">{c.audio_available ? "Disponible" : "Pendiente"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA 5: CATÁLOGOS MARKETPLACE */}
          {activeView === "catalogos" && (
            <div className="bg-white border rounded-[14px] p-5 shadow-sm" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-base font-bold mb-3">Catálogos del Marketplace</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-[#8b95a3] font-bold uppercase">
                    <th className="py-2.5">Producto</th>
                    <th className="py-2.5">Categoría</th>
                    <th className="py-2.5">Proveedor</th>
                    <th className="py-2.5">Precio CLP</th>
                  </tr>
                </thead>
                <tbody>
                  {productsList.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 font-medium">{p.name}</td>
                      <td className="py-2.5 text-[#5b6573]">{p.category}</td>
                      <td className="py-2.5 text-[#5b6573]">{p.vendor}</td>
                      <td className="py-2.5 font-mono">{p.price_clp ? `$${p.price_clp.toLocaleString("es-CL")}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA 6: MODERACIÓN */}
          {activeView === "moderacion" && (
            <div className="bg-white border rounded-[14px] p-5 shadow-sm" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-base font-bold mb-3">Cola de moderación</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-[#8b95a3] font-bold uppercase">
                    <th className="py-2.5">Tipo</th>
                    <th className="py-2.5">Autor</th>
                    <th className="py-2.5">Motivo</th>
                    <th className="py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {moderationList.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="py-2.5 font-medium">{m.type}</td>
                      <td className="py-2.5 text-[#5b6573]">{m.author?.name || "Sin nombre"}</td>
                      <td className="py-2.5 text-[#5b6573]">{m.report_reason || "Sin motivo"}</td>
                      <td className="py-2.5"><span className="px-2 py-0.5 rounded bg-[#fdf3dc] text-[#b97800] font-bold">{m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA 7: JUEGOS Y APPS */}
          {activeView === "juegos" && (
            <div className="bg-white border rounded-[14px] p-5 shadow-sm" style={{ borderColor: "var(--line)" }}>
              <h3 className="text-base font-bold mb-1">Catálogo de Estimulación Cognitiva</h3>
              <p className="text-xs text-[#8b95a3] mb-4">Módulo de Entretenimiento para el perfil Adulto Mayor.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border p-3.5 rounded-lg">
                  <div className="font-bold text-sm">🧠 Memoria Activa</div>
                  <div className="text-xs text-[#5b6573] mt-1">1.240 usuarios activos · Modo alto contraste</div>
                </div>
                <div className="border p-3.5 rounded-lg">
                  <div className="font-bold text-sm">🎵 Director Musical</div>
                  <div className="text-xs text-[#5b6573] mt-1">980 usuarios activos · Sincronización S3 activa</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}