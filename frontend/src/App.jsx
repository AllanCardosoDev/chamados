import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BarChart3, Bell, BookOpen, Calendar, Camera, CheckCircle, Clock,
  Download, Edit3, FileText, Filter, GraduationCap, Headphones, Home, LayoutDashboard,
  Lock, LogOut, Paperclip, PlusCircle, RefreshCw, Search, Send,
  Settings, ShieldCheck, Star, TrendingUp, Trash2, User, Users,
  ArrowLeft, MessageSquare, ClipboardCheck, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import { api, clearSession, getCurrentUser, getToken, setSession } from "./services/api";

const roleLabels = {
  USER:    "Usuário",
  ANALYST: "Analista BM-6",
  ADMIN:   "Administrador",
};

const statusLabels = {
  ABERTO:             "Aberto",
  EM_ATENDIMENTO:     "Em Andamento",
  AGUARDANDO_USUARIO: "Pendente com Solicitante",
  FECHADO:            "Encerrado",
  CANCELADO:          "Cancelado",
};

const priorityLabels = {
  BAIXA:  "Baixa",
  MEDIA:  "Média",
  ALTA:   "Alta",
  CRITICA:"Crítica",
};

function isSupport(user) {
  return user?.role === "ADMIN" || user?.role === "ANALYST";
}

// —— Hook para localidades -----
function useLocalidades() {
  const [localidades, setLocalidades] = useState([]);
  useEffect(() => {
    fetch("localidades.json")
      .then(res => res.ok ? res.json() : fetch("/chamados/localidades.json").then(r => r.json()))
      .then(data => {
        const list = data?.unidades || data;
        if (Array.isArray(list)) {
          setLocalidades(list.sort());
        } else {
          throw new Error();
        }
      })
      .catch(() => {
        setLocalidades(["BM-1", "BM-2", "BM-3", "BM-4", "BM-5", "BM-6 Tecnologia da Informação", "1º GBM", "2º GBM"]);
      });
  }, []);
  return localidades;
}


// —— App shell -----
function App() {
  const [user, setUser]                   = useState(getCurrentUser());
  const [view, setView]                   = useState(user?.role === "USER" ? "home" : "queue");
  const [selectedTicketId, setSelected]   = useState(null);
  const [searchQuery, setSearchQuery]     = useState("");
  const [notification, setNotification]   = useState(null);
  const [unreadAlerts, setUnreadAlerts]   = useState(0);
  const lastTicketIdRef                   = useRef(null);

  const supportMode = isSupport(user);
  const localidades = useLocalidades();

  // SSO Auth via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("sso_token");

    if (ssoToken && !user) {
      try {
        // Decodifica o token para pegar os dados do usuário (payload)
        const payload = JSON.parse(atob(ssoToken.split('.')[1]));
        
        // Verifica se o token não expirou (opcional, mas recomendado)
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          throw new Error("Token expirado");
        }

        setSession({ token: ssoToken, user: payload });
        setUser(payload);
        setView(payload.role === "USER" ? "home" : "queue");

        // Limpa o token da URL sem recarregar a página
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("Falha no login via SSO:", err);
        clearSession();
      }
    }
  }, [user]);

  // Alerta de novo chamado para analistas
  useEffect(() => {
    if (!supportMode) return;

    async function checkNewTickets() {
      try {
        const tickets = await api("/tickets?status=ABERTO");
        if (!tickets || tickets.length === 0) return;

        const maxId = Math.max(...tickets.map(t => t.id));

        if (lastTicketIdRef.current === null) {
          // Inicializa na primeira carga
          lastTicketIdRef.current = maxId;
        } else if (maxId > lastTicketIdRef.current) {
          const newCount = tickets.filter(t => t.id > lastTicketIdRef.current).length;
          const newTicket = tickets.find(t => t.id === maxId);
          if (newTicket) {
            setNotification({
              id: newTicket.id,
              title: "Novo Chamado na Fila!",
              message: `${newTicket.protocol} - ${newTicket.subject}`
            });
            setUnreadAlerts(prev => prev + newCount);

            // Tocar um som de notificação
            try {
              const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
              audio.play().catch(() => {}); // catch para ignorar bloqueio de autoplay do navegador
            } catch(e) {}
          }
          lastTicketIdRef.current = maxId;
        }
      } catch (err) {
        // Ignora erros de polling
      }
    }

    checkNewTickets();
    const intervalId = setInterval(checkNewTickets, 5000); // checa a cada 5 seg
    return () => clearInterval(intervalId);
  }, [supportMode]);

  // Indicador de "Atualizando..." no header para feedback visual do auto-refresh
  const [lastSync, setLastSync] = useState(Date.now());
  useEffect(() => {
    if (!supportMode) return;
    const id = setInterval(() => setLastSync(Date.now()), 5000);
    return () => clearInterval(id);
  }, [supportMode]);

  function openTicket(id) {
    setSelected(id);
    setView("ticketDetail");
  }

  if (!user) {
    return (
      <Login
        onLogin={(session) => {
          setSession(session);
          setUser(session.user);
          setView(session.user.role === "USER" ? "home" : "queue");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} adminMode={supportMode} />

      {notification && (
        <div 
          onClick={() => {
            openTicket(notification.id);
            setNotification(null);
          }}
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: "#9b0f14", color: "white", padding: "16px 20px",
            borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            cursor: "pointer", maxWidth: 350, display: "flex", gap: 12, alignItems: "flex-start",
            animation: "slideIn 0.3s ease-out"
          }}
        >
          <Bell size={24} color="#fca5a5" />
          <div>
            <strong style={{ display: "block", fontSize: 15, marginBottom: 4 }}>{notification.title}</strong>
            <span style={{ fontSize: 13, opacity: 0.9 }}>{notification.message}</span>
            <small style={{ display: "block", marginTop: 8, fontSize: 11, opacity: 0.7 }}>Clique para abrir</small>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setNotification(null); }}
            style={{ border: "none", background: "none", color: "white", cursor: "pointer", padding: 0, opacity: 0.7 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="main">
        <Header 
          user={user} 
          onLogout={() => { clearSession(); setUser(null); }} 
          onSearch={setSearchQuery}
          unreadAlerts={unreadAlerts}
          clearAlerts={() => setUnreadAlerts(0)}
          setView={setView}
        />

        {view === "home"         && <UserDashboard setView={setView} openTicket={openTicket} user={user} />}
        {view === "myTickets"    && <TicketsPage mode="mine"  openTicket={openTicket} search={searchQuery} user={user} />}
        {view === "newTicket"    && <NewTicketPage setView={setView} user={user} />}
        {view === "kb"           && <KnowledgePage search={searchQuery} user={user} />}
        {view === "status"       && <ServiceStatusPage user={user} />}
        {view === "profile"      && <ProfilePage user={user} onUserUpdate={setUser} />}
        {view === "queue"        && <TicketsPage mode="queue" openTicket={openTicket} search={searchQuery} user={user} />}
        {view === "reports"      && <ReportsPage />}
        {view === "calendar"     && <ReportsPage defaultTab="calendar" />}
        {view === "settings"     && <SettingsPage />}
        {view === "ticketDetail" && selectedTicketId && (
          <TicketDetailPage
            ticketId={selectedTicketId}
            user={user}
            goBack={() => setView(supportMode ? "queue" : "myTickets")}
          />
        )}
      </main>

      <datalist id="localidades-list">
        {localidades.map(loc => <option key={loc} value={loc} />)}
      </datalist>
    </div>
  );
}

// —— Login -----
function Login({ onLogin }) {
  const [form, setForm]   = useState({ cpf: "", password: "" });
  const [error, setError] = useState("");

  function maskCPF(v) {
    if (v.includes('@') || /[a-zA-Z]/.test(v)) {
      return v;
    }
    return v.replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const session = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onLogin(session);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="brand">
          <div className="brand-mark">BM</div>
          <div>
            <strong>CBMAM Chamados</strong>
            <span>BM-6 Tecnologia da Informação</span>
          </div>
        </div>
      </header>
      <div className="login-grid">
        <section className="login-card">
          <div className="login-icon"><ShieldCheck size={44} /></div>
          <h1>Acesso ao Portal</h1>
          <p>Entre com seu CPF e senha do sistema DRH para acessar o portal de serviços do CBMAM.</p>

          <form onSubmit={handleSubmit}>
            <label>CPF</label>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
              placeholder="CPF ou E-mail"
              maxLength={form.cpf.includes('@') || /[a-zA-Z]/.test(form.cpf) ? 100 : 14}
              required
            />

            <label>Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && <div className="error-box">{error}</div>}

            <button className="primary-button" type="submit">
              Entrar
            </button>
          </form>
        </section>

        <section className="login-hero">
          <span>BEM-VINDO AO CBMAM CHAMADOS</span>
          <h2>Tecnologia que aproxima,<br />serviço que transforma.</h2>
          <p>Portal interno para abertura, acompanhamento e atendimento de chamados da BM-6.</p>
          <div className="feature-grid">
            <div>Abrir chamados</div>
            <div>Acompanhar atendimento</div>
            <div>Base de conhecimento</div>
            <div>Status dos serviços</div>
          </div>
        </section>
      </div>
    </div>
  );
}

// —— Sidebar -----
function Sidebar({ view, setView, adminMode }) {
  const userItems = [
    ["home",      "Início",               Home],
    ["myTickets", "Meus Chamados",         FileText],
    ["newTicket", "Abrir Chamado",         PlusCircle],
    ["kb",        "Base de Conhecimento",  BookOpen],
    ["status",    "Status dos Serviços",   Clock],
    ["profile",   "Meu Perfil",            User],
  ];

  const adminItems = [
    ["queue",    "Fila de Chamados",       LayoutDashboard],
    ["myTickets","Meus Atendimentos",       FileText],
    ["newTicket","Abrir Chamado",          PlusCircle],
    ["kb",       "Base de Conhecimento",   BookOpen],
    ["reports",  "Relatórios",             BarChart3],
    ["settings", "Configurações",          Settings],
  ];

  const items = adminMode ? adminItems : userItems;

  return (
    <aside className="sidebar">
      <div className="brand sidebar-brand">
        <div className="brand-mark">BM</div>
        <div>
          <strong>CBMAM Chamados</strong>
          <span>BM-6 Tecnologia</span>
        </div>
      </div>

      <nav>
        {items.map(([key, label, Icon]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => setView(key)}
          >
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// —— Header -----
function Header({ user, onLogout, onSearch, unreadAlerts, clearAlerts, setView }) {
  const [pulse, setPulse] = useState(false);

  // Pulso visual a cada 5s indicando que a tela está sincronizando ao vivo
  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={18} />
        <input
          placeholder="Buscar serviços, artigos ou chamados..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div
        title="Sincronização ao vivo ativa (atualiza a cada 5s)"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 999,
          background: pulse ? "#dcfce7" : "#f0fdf4",
          transition: "background 0.3s",
          border: "1px solid #bbf7d0",
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: pulse ? "#16a34a" : "#22c55e",
          boxShadow: pulse ? "0 0 0 4px rgba(34,197,94,0.3)" : "none",
          transition: "all 0.3s",
        }} />
        <small style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>AO VIVO</small>
      </div>
      <div style={{ position: "relative", cursor: "pointer", display: "flex" }} onClick={() => { clearAlerts(); if (setView) setView("queue"); }}>
        <Bell />
        {unreadAlerts > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white",
            fontSize: 10, fontWeight: "bold", borderRadius: "50%", width: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {unreadAlerts > 9 ? "9+" : unreadAlerts}
          </span>
        )}
      </div>
      <div className="user-menu">
        <div className="avatar">{user.name?.slice(0, 2).toUpperCase()}</div>
        <div>
          <strong>{user.name}</strong>
          <span>{roleLabels[user.role]} • {user.unit}</span>
        </div>
      </div>
      <button className="logout" onClick={onLogout}>
        <LogOut size={18} />
      </button>
    </header>
  );
}

// —— KPI card -----
function Kpi({ icon: Icon, value, label, detail }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon"><Icon /></div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
      <small>{detail}</small>
    </div>
  );
}

// —— User dashboard -----
function UserDashboard({ setView, openTicket, user }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const s = await api("/tickets/mine/stats");
        if (!cancelled) setStats(s);
      } catch {}
    }
    loadStats();
    const id = setInterval(loadStats, 5000); // atualiza a cada 5s
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <section className="page">
      <div className="page-header-row">
        <div>
          <h1>Portal de Serviços CBMAM</h1>
          <p>Bem-vindo, <strong>{user?.name}</strong>. Acompanhe seus chamados e solicite suporte à BM-6.</p>
        </div>
        <button className="primary-button" onClick={() => setView("newTicket")}>
          <PlusCircle size={18} /> Abrir novo chamado
        </button>
      </div>

      {stats && (
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <Kpi icon={FileText}    value={stats.total}    label="Meus chamados"   detail="Total de solicitações" />
          <Kpi icon={Clock}       value={stats.open}     label="Em aberto"       detail="Aguardando atendimento" />
          <Kpi icon={CheckCircle} value={stats.resolved} label="Resolvidos"       detail="Concluídos com sucesso" />
          <Kpi icon={AlertTriangle} value={stats.waiting} label="Aguardando você" detail="Necessitam sua resposta" />
        </div>
      )}

      <TicketsPage mode="mine" compact openTicket={openTicket} user={user} />
    </section>
  );
}

// —— Tickets list -----
function TicketsPage({ mode, compact = false, openTicket, search = "", user }) {
  const [tickets,        setTickets]        = useState([]);
  const [error,          setError]          = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [analysts,       setAnalysts]       = useState([]);
  const [assignPopup,    setAssignPopup]    = useState(null); // ticket.id
  const [assignSel,      setAssignSel]      = useState("");
  const [assignMsg,      setAssignMsg]      = useState("");
  const isSupport = user && (user.role === "ADMIN" || user.role === "ANALYST");

  async function load() {
    try {
      setTickets(await api("/tickets"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  // —— Polling delta a cada 5s: usa /tickets/recent para pegar só o que mudou
  //    e mescla com a lista existente, evitando refazer GET /tickets completo.
  useEffect(() => {
    let lastSync = new Date().toISOString();
    const intervalId = setInterval(async () => {
      try {
        const data = await api(`/poll/tickets?since=${encodeURIComponent(lastSync)}`);
        lastSync = data.serverTime || new Date().toISOString();
        if (data.changed && data.changed.length > 0) {
          setTickets(prev => {
            const map = new Map(prev.map(t => [t.id, t]));
            data.changed.forEach(t => map.set(t.id, { ...(map.get(t.id) || {}), ...t }));
            return Array.from(map.values());
          });
        }
      } catch { /* silencioso durante polling */ }
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isSupport) {
      api("/users/analysts").then(setAnalysts).catch(() => {});
    }
  }, []);

  async function quickAssign(ticketId) {
    try {
      const body = assignSel ? { analyst_id: Number(assignSel) } : {};
      await api(`/tickets/${ticketId}/assign`, { method: "PATCH", body: JSON.stringify(body) });
      setAssignMsg(assignSel ? "Atribuído com sucesso." : "Chamado assumido.");
      await load();
      setTimeout(() => { setAssignPopup(null); setAssignMsg(""); setAssignSel(""); }, 1200);
    } catch (err) { setAssignMsg(err.message); }
  }

  const filteredTickets = tickets.filter(t => {
    // 1. Regra de exibição por modo
    if (mode === "queue") {
      // Fila principal: exibe apenas os não atribuídos
      if (t.analyst_id) return false;
    } else if (mode === "mine") {
      // Meus atendimentos: exibe os que abri ou os que assumi
      if (t.requester_id !== user.id && t.analyst_id !== user.id) return false;
    }

    if (search) {
      const s = search.toLowerCase();
      if (!t.protocol?.toLowerCase().includes(s) &&
          !t.subject?.toLowerCase().includes(s) &&
          !t.requester_name?.toLowerCase().includes(s)) return false;
    }
    if (filterStatus   && t.status   !== filterStatus)   return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const hasFilters = filterStatus || filterPriority;
  const selectStyle = {
    padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb",
    fontSize: 13, background: "white", minWidth: 140,
  };

  return (
    <section className={compact ? "" : "page"}>
      {!compact && (
        <>
          <h1>{mode === "queue" ? "Painel BM-6 / Fila de Chamados" : "Meus Chamados"}</h1>
          <p>{mode === "queue"
            ? "Acompanhe, filtre e gerencie os chamados da sua fila."
            : "Acompanhe suas solicitações abertas junto à BM-6."}
          </p>
        </>
      )}

      {error && <div className="error-box">{error}</div>}

      <div className="table-card">
        <div className="table-title">
          <strong>
            {mode === "queue" ? "Fila de Chamados" : "Chamados recentes"}
            <span style={{ fontWeight: 400, color: "#667085", marginLeft: 8 }}>({filteredTickets.length})</span>
          </strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ABERTO">Aberto</option>
              <option value="EM_ATENDIMENTO">Em Andamento</option>
              <option value="AGUARDANDO_USUARIO">Pendente com Solicitante</option>
              <option value="FECHADO">Encerrado</option>
            </select>
            <select style={selectStyle} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="">Todas as prioridades</option>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="CRITICA">Crítica</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setFilterStatus(""); setFilterPriority(""); }}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
                  background: "#fee2e2", color: "#9b0f14", fontSize: 12, cursor: "pointer" }}>
                <X size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Limpar
              </button>
            )}
            <button onClick={load} style={{ padding: "7px 12px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Resumo</th>
              <th>Categoria</th>
              <th>Prioridade</th>
              <th>Status</th>
              <th>Analista</th>
              <th>Atualização</th>
              {isSupport && mode === "queue" && <th style={{ width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.id}>
                <td className="protocol" onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>{t.protocol}</td>
                <td onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>
                  {t.subject}
                  <small>{t.requester_name} • {t.unit}</small>
                </td>
                <td onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>{t.category_name || "-"}</td>
                <td onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>
                  <span className={`chip priority-${t.priority}`}>{priorityLabels[t.priority]}</span>
                </td>
                <td onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>
                  <span className={`chip status-${t.status}`}>{statusLabels[t.status] || t.status}</span>
                </td>
                <td style={{ position: "relative" }}>
                  {isSupport && mode === "queue" ? (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setAssignPopup(assignPopup === t.id ? null : t.id); setAssignSel(""); setAssignMsg(""); }}
                        style={{ background: t.analyst_name ? "#f0fdf4" : "#fef9c3",
                          border: `1px solid ${t.analyst_name ? "#a7f3d0" : "#fde68a"}`,
                          borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                          color: t.analyst_name ? "#065f46" : "#92400e", whiteSpace: "nowrap",
                          display: "flex", alignItems: "center", gap: 5 }}
                        title="Clique para atribuir ou reatribuir">
                        <Users size={12} />
                        {t.analyst_name || "Não atribuído"}
                      </button>

                      {assignPopup === t.id && (
                        <div onClick={e => e.stopPropagation()} style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
                          background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
                          boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 16, minWidth: 280,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <strong style={{ fontSize: 13 }}>Atribuir chamado</strong>
                            <button onClick={() => { setAssignPopup(null); setAssignMsg(""); }}
                              style={{ border: 0, background: "none", cursor: "pointer", color: "#667085" }}>
                              <X size={14} />
                            </button>
                          </div>
                          <p style={{ fontSize: 12, color: "#667085", margin: "0 0 10px" }}>
                            <strong style={{ color: "#374151" }}>{t.protocol}</strong> — {t.subject}
                          </p>
                          <select
                            value={assignSel}
                            onChange={e => setAssignSel(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: 8,
                              border: "1px solid #e5e7eb", marginBottom: 10, fontSize: 13 }}
                          >
                            <option value="">Assumir para mim</option>
                            {analysts.map(a => (
                              <option key={a.id} value={a.id}>{a.name}{a.unit ? ` (${a.unit})` : ""}</option>
                            ))}
                          </select>
                          {assignMsg
                            ? <p style={{ color: assignMsg.includes("sucesso") || assignMsg.includes("Atribu") ? "#12b76a" : "#f04438", fontSize: 13, margin: "0 0 6px" }}>{assignMsg}</p>
                            : null}
                          <button className="primary-button" style={{ width: "100%", justifyContent: "center" }}
                            onClick={() => quickAssign(t.id)}>
                            {assignSel ? "Atribuir ao analista" : "Assumir chamado"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <span onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>
                      {t.analyst_name || "Não atribuído"}
                    </span>
                  )}
                </td>
                <td onClick={() => openTicket(t.id)} style={{ cursor: "pointer" }}>
                  {new Date(t.updated_at).toLocaleString("pt-BR")}
                </td>
                {isSupport && mode === "queue" && (
                  <td>
                    <button
                      onClick={e => { e.stopPropagation(); openTicket(t.id); }}
                      title="Abrir chamado"
                      style={{ border: 0, background: "none", cursor: "pointer", color: "#667085", padding: 4 }}>
                      →
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr><td colSpan={isSupport && mode === "queue" ? 8 : 7} style={{ textAlign: "center", color: "#667085" }}>
                {search || hasFilters ? "Nenhum resultado para os filtros aplicados." : "Nenhum chamado encontrado."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// —— Ticket detail -----
function AttachmentSection({ ticketId, canUpload }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [msg, setMsg]                 = useState("");
  const fileRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || "/chamados/api";

  async function load() {
    try { setAttachments(await api(`/tickets/${ticketId}/attachments`)); }
    catch { /* ignora */ }
  }
  useEffect(() => { load(); }, [ticketId]);

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  async function handleFiles(e) {
    const selected = Array.from(e.target.files);
    e.target.value = "";
    if (!selected.length) return;
    const tooBig = selected.filter(f => f.size > 10 * 1024 * 1024);
    if (tooBig.length) { setMsg("Arquivo(s) muito grande(s). Limite: 10 MB."); return; }
    setUploading(true);
    setMsg("Enviando...");
    let ok = 0;
    for (const file of selected) {
      try {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              await api(`/tickets/${ticketId}/attachments`, {
                method: "POST",
                body: JSON.stringify({ filename: file.name, mimetype: file.type, data: ev.target.result }),
              });
              ok++;
              resolve();
            } catch (err) { reject(err); }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (err) { setMsg(err.message); }
    }
    setUploading(false);
    if (ok > 0) { setMsg(`${ok} arquivo(s) enviado(s).`); await load(); }
  }

  const token = getToken();

  return (
    <div className="form-card" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}><Paperclip size={20} /> Anexos</h2>
      {attachments.length === 0 && <p style={{ color: "#667085" }}>Nenhum anexo neste chamado.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {attachments.map(a => {
          const isImage = a.mimetype.startsWith("image/");
          const url = `${API_URL}/attachments/${a.id}/file?token=${encodeURIComponent(token)}`;
          return (
            <div key={a.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
              {isImage && (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={a.original_name}
                    style={{ width: "100%", maxHeight: 260, objectFit: "contain", background: "#f9fafb", display: "block" }} />
                </a>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f9fafb" }}>
                <Paperclip size={14} color="#9b0f14" />
                <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.original_name}
                </span>
                <span style={{ color: "#667085", fontSize: 12 }}>{fmtSize(a.size)}</span>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>{a.uploader_name}</span>
                <a href={`${url}&download=1`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "#9b0f14", display: "flex", alignItems: "center" }}
                  title="Baixar">
                  <Download size={16} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
      {canUpload && (
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <Paperclip size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            {uploading ? "Enviando..." : "Adicionar anexo"}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFiles} style={{ display: "none" }} />
          {msg && <span style={{ marginLeft: 12, fontSize: 13, color: "#667085" }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}

function TicketDetailPage({ ticketId, user, goBack }) {
  const [data, setData]             = useState(null);
  const [comment, setComment]       = useState("");
  const [internalNote, setInternal] = useState("");
  const [message, setMessage]       = useState("");
  const [loading, setLoading]       = useState(true);
  const [analysts, setAnalysts]     = useState([]);
  const [assignTo, setAssignTo]     = useState("");

  async function loadTicket() {
    setLoading(true);
    setMessage("");
    try {
      setData(await api(`/tickets/${ticketId}`));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTicket(); }, [ticketId]); 

  useEffect(() => {
    if (user.role === "ADMIN" || user.role === "ANALYST") {
      api("/users/analysts").then(setAnalysts).catch(() => {});
    }
  }, []);

  async function assignTicket() {
    try {
      const body = assignTo ? { analyst_id: Number(assignTo) } : {};
      await api(`/tickets/${ticketId}/assign`, { method: "PATCH", body: JSON.stringify(body) });
      setMessage(assignTo ? "Chamado atribuído ao analista com sucesso." : "Chamado assumido com sucesso.");
      await loadTicket();
    } catch (err) { setMessage(err.message); }
  }

  async function changeStatus(status) {
    try {
      await api(`/tickets/${ticketId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage("Status atualizado com sucesso.");
      await loadTicket();
    } catch (err) { setMessage(err.message); }
  }

  async function sendComment(visibility = "PUBLIC") {
    const body = visibility === "INTERNAL" ? internalNote : comment;
    if (!body.trim()) { setMessage("Digite uma mensagem antes de enviar."); return; }
    try {
      await api(`/tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body, visibility }),
      });
      visibility === "INTERNAL" ? setInternal("") : setComment("");
      setMessage(visibility === "INTERNAL" ? "Nota interna registrada." : "Resposta enviada.");
      await loadTicket();
    } catch (err) { setMessage(err.message); }
  }

  if (loading) return <section className="page"><p>Carregando chamado...</p></section>;

  if (!data?.ticket) {
    return (
      <section className="page">
        <button style={backBtnStyle} onClick={goBack}><ArrowLeft size={18} /> Voltar</button>
        <div className="error-box">{message || "Não foi possível carregar o chamado."}</div>
      </section>
    );
  }

  const { ticket, comments = [], history = [] } = data;
  const support = isSupport(user);

  return (
    <section className="page">
      <button style={backBtnStyle} onClick={goBack}><ArrowLeft size={18} /> Voltar</button>

      <div className="page-header-row">
        <div>
          <h1>{ticket.protocol}</h1>
          <p>{ticket.subject}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className={`chip priority-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span>
          <span className={`chip status-${ticket.status}`}>{statusLabels[ticket.status] || ticket.status}</span>
        </div>
      </div>

      {message && <div className="info-box">{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 22, marginTop: 22 }}>
        <div>
          {/* Descrição */}
          <div className="form-card">
            <h2 style={{ marginTop: 0 }}>Descrição do chamado</h2>
            <p>{ticket.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 18 }}>
              <Info label="Categoria"   value={ticket.category_name || "-"} />
              <Info label="Unidade"     value={ticket.unit || "-"} />
              <Info label="Patrimônio"  value={ticket.asset_tag || "-"} />
              <Info label="Solicitante" value={ticket.requester_name || "-"} />
              <Info label="Analista"    value={ticket.analyst_name || "Não atribuído"} />
              <Info label="Criado em"   value={new Date(ticket.created_at).toLocaleString("pt-BR")} />
            </div>
          </div>

          {/* Anexos */}
          <AttachmentSection
            ticketId={ticket.id}
            canUpload={support || ticket.requester_id === user.id}
          />

          {/* Chat com analista */}
          <TicketChat ticket={ticket} user={user} />

          {/* Conversa */}
          <div className="form-card">
            <h2 style={{ marginTop: 0 }}><MessageSquare size={20} /> Conversa do chamado</h2>
            {comments.length === 0 && <p style={{ color: "#667085" }}>Nenhum comentário registrado.</p>}
            {comments.map((item) => (
              <div key={item.id} style={{
                border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, marginBottom: 12,
                background: item.visibility === "INTERNAL" ? "#fff7ed" : "#fff",
              }}>
                <strong>{item.author_name}</strong>{" "}
                <span className="chip" style={{ background: "#f2f4f7" }}>
                  {item.visibility === "INTERNAL" ? "Nota interna" : "Público"}
                </span>
                <p>{item.body}</p>
                <small>{new Date(item.created_at).toLocaleString("pt-BR")}</small>
              </div>
            ))}

            <label>
              Responder ao solicitante
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Digite sua resposta..." />
            </label>
            <button className="primary-button" onClick={() => sendComment("PUBLIC")}>
              <Send size={18} /> Enviar resposta
            </button>
          </div>

          {/* Notas internas */}
          {support && (
            <div className="form-card" style={{ marginTop: 16, background: "#fff7ed" }}>
              <h2 style={{ marginTop: 0 }}>Notas internas da BM-6</h2>
              <p>Visível apenas para administradores e analistas da BM-6.</p>
              <label>
                Nota interna
                <textarea value={internalNote} onChange={(e) => setInternal(e.target.value)} placeholder="Digite uma nota interna..." />
              </label>
              <button className="primary-button" onClick={() => sendComment("INTERNAL")}>
                Registrar nota interna
              </button>
            </div>
          )}

          {/* Histórico */}
          <div className="form-card">
            <h2 style={{ marginTop: 0 }}><ClipboardCheck size={20} /> Histórico do chamado</h2>
            {history.length === 0 && <p style={{ color: "#667085" }}>Nenhum histórico registrado.</p>}
            {history.map((item) => {
              const eventLabels = {
                CREATED: "Abertura de Chamado",
                STATUS_CHANGED: "Alteração de Status",
                ASSIGNED: "Atribuição de Analista",
              };
              
              const formatValue = (val) => {
                if (!val) return "";
                if (statusLabels[val]) return statusLabels[val];
                return val;
              };

              return (
                <div key={item.id} style={{ borderLeft: "4px solid #9b0f14", paddingLeft: 14, marginBottom: 14 }}>
                  <strong>{eventLabels[item.event_type] || item.event_type}</strong>
                  <p>
                    {item.old_value ? `De: ${formatValue(item.old_value)} ` : ""}
                    {item.new_value ? `Para: ${formatValue(item.new_value)}` : ""}
                  </p>
                  <small>
                    {item.actor_name || "Sistema"} • {new Date(item.created_at).toLocaleString("pt-BR")}
                  </small>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel lateral de atendimento */}
        <aside className="form-card" style={{ height: "fit-content" }}>
          <h2 style={{ marginTop: 0 }}>Atendimento BM-6</h2>
          <Info label="Protocolo"   value={ticket.protocol} />
          <Info label="Status"      value={statusLabels[ticket.status] || ticket.status} />
          <Info label="Prioridade"  value={priorityLabels[ticket.priority]} />
          <Info label="Solicitante" value={ticket.requester_name || "-"} />
          <Info label="E-mail"      value={ticket.requester_email || "-"} />

          {/* SLA indicators */}
          {!['RESOLVIDO','FECHADO'].includes(ticket.status) && (
            <SlaPanel ticket={ticket} />
          )}

          {support ? (
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              {user.role === "ADMIN" || user.role === "ANALYST" ? (
                analysts.length > 0 && (
                <div>
                  <small style={{ color: "#667085", display: "block", marginBottom: 6 }}>Atribuir a analista</small>
                  <select
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    style={{ width: "100%", marginBottom: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                  >
                    <option value="">Assumir para mim</option>
                    {analysts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.unit || "BM-6"})</option>
                    ))}
                  </select>
                </div>
                )
              ) : null}
              <button className="primary-button" onClick={assignTicket}>
                {assignTo ? "Atribuir ao analista" : "Assumir chamado"}
              </button>
              <button style={secondaryBtnStyle} onClick={() => changeStatus("EM_ATENDIMENTO")}>Iniciar Tratativa (Em Andamento)</button>
              <button style={secondaryBtnStyle} onClick={() => changeStatus("AGUARDANDO_USUARIO")}>Pendente com Solicitante</button>
              <button style={secondaryBtnStyle} onClick={() => changeStatus("FECHADO")}>Encerrar Chamado</button>
            </div>
          ) : (
            <p style={{ color: "#667085", marginTop: 18 }}>Acompanhe aqui as atualizações da BM-6.</p>
          )}

          {/* Avaliação de satisfação */}
          {ticket.status === 'FECHADO' && ticket.requester_id === user.id && (
            <SatisfactionPanel ticketId={ticket.id} current={ticket.satisfaction_score} />
          )}
        </aside>
      </div>
    </section>
  );
}

// —— Satisfaction panel -----
function SatisfactionPanel({ ticketId, current }) {
  const [score, setScore] = useState(current || 0);
  const [hover, setHover] = useState(0);
  const [sent,  setSent]  = useState(!!current);
  const [msg,   setMsg]   = useState("");

  async function submit() {
    if (!score) return;
    try {
      const r = await api(`/tickets/${ticketId}/satisfaction`, {
        method: "PATCH",
        body: JSON.stringify({ score }),
      });
      setMsg(r.message); setSent(true);
    } catch (e) { setMsg(e.message); }
  }

  const col = (s) => s <= (hover || score) ? "#f59e0b" : "#e5e7eb";
  const labels = ["", "Péssimo", "Ruim", "Regular", "Bom", "Ótimo"];

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 18, paddingTop: 14 }}>
      <small style={{ color: "#667085", display: "block", marginBottom: 8 }}>
        {sent ? "⭐ Avaliação registrada" : "Avalie o atendimento"}
      </small>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={26}
            fill={col(s)} color={col(s)}
            style={{ cursor: sent ? "default" : "pointer" }}
            onMouseEnter={() => !sent && setHover(s)}
            onMouseLeave={() => !sent && setHover(0)}
            onClick={() => !sent && setScore(s)}
          />
        ))}
      </div>
      {(hover || score) > 0 && !sent && (
        <small style={{ color: "#667085", display: "block", marginBottom: 6 }}>{labels[hover || score]}</small>
      )}
      {!sent && score > 0 && (
        <button onClick={submit} className="primary-button" style={{ padding: "8px 14px" }}>Enviar</button>
      )}
      {msg && <small style={{ color: "#12b76a", display: "block", marginTop: 4 }}>{msg}</small>}
    </div>
  );
}

// —— Info box -----
function SlaBar({ label, dueAt, createdAt }) {
  if (!dueAt || !createdAt) return null;
  const now     = Date.now();
  const due     = new Date(dueAt).getTime();
  const created = new Date(createdAt).getTime();
  if (!isFinite(due) || !isFinite(created) || due <= created) return null;
  const total   = due - created;
  const elapsed = now - created;
  const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const hoursLeft = Math.max(0, Math.round((due - now) / 3600000));
  const isOver    = now > due;
  const barColor  = isOver ? "#f04438" : pct > 75 ? "#f79009" : "#12b76a";
  return (
    <div style={{ marginBottom: 14 }}>
      <small style={{ color: "#667085", display: "block", marginBottom: 4 }}>{label}</small>
      <div style={{ background: "#f3f4f6", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 0.4s" }} />
      </div>
      <small style={{ color: barColor, fontWeight: 600 }}>
        {isOver
          ? `⚠️ SLA expirado há ${Math.round((now - due) / 3600000)}h`
          : `⏱ ${hoursLeft}h restantes — prazo: ${new Date(dueAt).toLocaleString("pt-BR")}`}
      </small>
    </div>
  );
}

function SlaPanel({ ticket }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 16 }}>
      <SlaBar label="SLA / Primeira resposta"  dueAt={ticket.sla_response_due_at} createdAt={ticket.created_at} />
      <SlaBar label="SLA / Prazo de resolução"  dueAt={ticket.sla_due_at}        createdAt={ticket.created_at} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <small style={{ color: "#667085", display: "block" }}>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

const backBtnStyle = {
  border: "1px solid #e5e7eb", background: "white", borderRadius: 12,
  padding: "10px 14px", display: "inline-flex", alignItems: "center",
  gap: 8, marginBottom: 20,
};

const secondaryBtnStyle = {
  border: "1px solid #e5e7eb", background: "white",
  borderRadius: 12, padding: "12px 14px", textAlign: "left",
};

// —— Chat do chamado -----
function TicketChat({ ticket, user }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [lastId, setLastId]       = useState(0);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const isClosed  = ["RESOLVIDO", "FECHADO"].includes(ticket.status);
  const isAnalyst = ticket.analyst_id && user.id === ticket.analyst_id;
  const isOwner   = user.id === ticket.requester_id;
  const canWrite  = (isAnalyst || isOwner) && !isClosed;
  const otherName = isAnalyst ? (ticket.requester_name || "Solicitante") : (ticket.analyst_name || "Analista");

  async function poll(since) {
    try {
      const data = await api(`/tickets/${ticket.id}/chat?after=${since}`);
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const newMsgs = data.messages.filter(m => !prev.some(p => p.id === m.id));
          if (!newMsgs.length) return prev;
          const updated = [...prev, ...newMsgs];
          setLastId(updated[updated.length - 1].id);
          return updated;
        });
      }
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    // Carga inicial
    api(`/tickets/${ticket.id}/chat?after=0`)
      .then(data => {
        if (data.messages?.length) {
          setMessages(data.messages);
          setLastId(data.messages[data.messages.length - 1].id);
        }
      }).catch(() => {});
  }, [ticket.id]);

  // Polling a cada 4 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setLastId(prev => { poll(prev); return prev; });
    }, 4000);
    return () => clearInterval(interval);
  }, [ticket.id]);

  // Auto-scroll ao receber nova mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await api(`/tickets/${ticket.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      // Busca imediatamente após envio
      poll(lastId);
    } catch (err) {
      setInput(text); // devolve o texto se falhou
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
  }

  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
      " · " + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  return (
    <div className="form-card" style={{ marginTop: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        borderBottom: "1px solid #e5e7eb", paddingBottom: 14 }}>
        <div style={{ background: "#9b0f14", borderRadius: "50%", width: 36, height: 36,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={18} color="#fff" />
        </div>
        <div>
          <strong style={{ display: "block", fontSize: 15 }}>Chat do chamado</strong>
          <small style={{ color: "#667085" }}>
            {ticket.analyst_id
              ? `Conversa entre ${ticket.requester_name || "Solicitante"} e ${ticket.analyst_name || "Analista"}`
              : "Aguardando analista assumir o chamado"}
          </small>
        </div>
        {isClosed && (
          <span style={{ marginLeft: "auto", fontSize: 11, background: "#f3f4f6",
            color: "#6b7280", padding: "4px 10px", borderRadius: 20 }}>
            Chamado encerrado
          </span>
        )}
      </div>

      {/* Mensagens */}
      <div style={{ minHeight: 180, maxHeight: 420, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 10, padding: "4px 0", marginBottom: 14 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, margin: "auto" }}>
            {ticket.analyst_id
              ? "Nenhuma mensagem ainda. Seja o primeiro a escrever!"
              : "O chat ficará disponível quando um analista assumir o chamado."}
          </div>
        )}
        {messages.map(m => {
          const isMe = m.sender_id === user.id;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column",
              alignItems: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "78%", padding: "10px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "#9b0f14" : "#f3f4f6",
                color: isMe ? "#fff" : "#111827",
                fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}>
                {m.message}
              </div>
              <small style={{ color: "#9ca3af", fontSize: 11, marginTop: 3 }}>
                {isMe ? "Você" : m.sender_name} · {fmtTime(m.created_at)}
              </small>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canWrite ? (
        <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem para ${otherName}• (Enter para enviar)`}
            rows={2}
            style={{ flex: 1, resize: "vertical", borderRadius: 12, border: "1px solid #e5e7eb",
              padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
              outline: "none", minHeight: 48 }}
          />
          <button type="submit" disabled={!input.trim() || sending}
            style={{ background: "#9b0f14", border: "none", borderRadius: 12,
              padding: "0 18px", cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", opacity: (!input.trim() || sending) ? 0.5 : 1 }}>
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px",
          color: "#6b7280", fontSize: 13, textAlign: "center" }}>
          {isClosed ? "Este chamado está encerrado — chat desativado." : "Aguardando analista para iniciar o chat."}
        </div>
      )}
    </div>
  );
}

// —— New ticket -----
function NewTicketPage({ setView, user }) {
  const isSupport = user?.role === "ADMIN" || user?.role === "ANALYST";
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    requester_id: "", category_id: "", type: "INCIDENT", subject: "",
    description: "", priority: "MEDIA", unit: "", asset_tag: "",
  });
  const [files, setFiles]             = useState([]);
  const [screenshot, setScreenshot]   = useState(null);    // File | null
  const [screenshotPreview, setScreenshotPreview] = useState(null); // data URL
  const [message, setMessage]         = useState("");
  const [uploading, setUploading]     = useState(false);
  const fileRef       = useRef(null);
  const screenshotRef = useRef(null);

  useEffect(() => {
    api("/categories").then(setCategories).catch(() => {});
    if (isSupport) {
      api("/users").then(setUsers).catch(() => {});
    }
  }, [isSupport]);

  function handleFiles(e) {
    const selected = Array.from(e.target.files);
    const too_big  = selected.filter(f => f.size > 10 * 1024 * 1024);
    if (too_big.length) { setMessage(`Arquivo(s) muito grande(s). Limite: 10 MB por arquivo.`); return; }
    if (files.length + selected.length > 5) { setMessage("Máximo de 5 anexos por chamado."); return; }
    setFiles(prev => [...prev, ...selected]);
    e.target.value = "";
    setMessage("");
  }

  function removeFile(idx) { setFiles(prev => prev.filter((_, i) => i !== idx)); }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  async function uploadFiles(ticketId) {
    for (const file of files) {
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            await api(`/tickets/${ticketId}/attachments`, {
              method: "POST",
              body: JSON.stringify({ filename: file.name, mimetype: file.type, data: ev.target.result }),
            });
            resolve();
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    if (screenshot) {
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            await api(`/tickets/${ticketId}/attachments`, {
              method: "POST",
              body: JSON.stringify({
                filename: screenshot.name,
                mimetype: screenshot.type,
                data: ev.target.result,
                is_screenshot: true,
              }),
            });
            resolve();
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(screenshot);
      });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setUploading(true);
    try {
      const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : null };
      if (form.requester_id) payload.requester_id = Number(form.requester_id);

      // Auto-prioridade: usuarios comuns (USER) abrem com MEDIA.
      // Branches ADMIN/ANALYST sao dead-code aqui (isSupport ja exclui ambos);
      // mantidas apenas como safety em caso de evolucao futura.
      if (!isSupport) {
        payload.priority = 'MEDIA';
      }

      const result = await api("/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (files.length > 0 || screenshot) {
        setMessage(`Chamado criado: ${result.protocol}. Enviando anexos...`);
        await uploadFiles(result.id);
      }
      setMessage(`Chamado aberto com sucesso: ${result.protocol}`);
      setTimeout(() => setView("myTickets"), 1400);
    } catch (err) { setMessage(err.message); }
    finally { setUploading(false); }
  }

  return (
    <section className="page">
      <h1>Abrir chamado</h1>
      <p>Preencha as informações abaixo para registrar sua solicitação.</p>

      <form className="form-card" onSubmit={submit}>
        <label>
          Tipo de Solicitação
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="INCIDENT">Incidente - Problemas ou falhas em serviços</option>
            <option value="REQUEST">Requisição - Solicitações de serviços ou melhorias</option>
            <option value="ACCESS">Acesso - Solicitação de acesso a sistemas</option>
            <option value="QUESTION">Dúvida - Esclarecimentos e orientações</option>
          </select>
        </label>

        {isSupport && (
          <label>
            Solicitante (Opcional - Abrir chamado em nome de outro usuário)
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="-- Abrir no meu nome -- (Digite para buscar)"
                value={form._searchRequester !== undefined ? form._searchRequester : (form.requester_id ? (users.find(u => u.id === Number(form.requester_id))?.name || "") : "")}
                onChange={(e) => setForm({ ...form, requester_id: "", _searchRequester: e.target.value })}
                onFocus={(e) => setForm({ ...form, _searchRequester: e.target.value })}
                onBlur={() => setTimeout(() => setForm(prev => ({ ...prev, _searchRequester: undefined })), 250)}
              />
              {form._searchRequester !== undefined && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 250, overflowY: "auto", zIndex: 10, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", marginTop: 4 }}>
                  <div
                    style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", fontSize: 14, color: "#6b7280" }}
                    onClick={() => setForm({ ...form, requester_id: "", _searchRequester: undefined })}
                  >
                    <em>-- Abrir no meu nome --</em>
                  </div>
                  {users.filter(u => {
                    const q = form._searchRequester.toLowerCase();
                    return u.name.toLowerCase().includes(q) || (u.cpf && u.cpf.includes(q)) || (u.unit && u.unit.toLowerCase().includes(q));
                  }).slice(0, 50).map(u => (
                    <div
                      key={u.id}
                      style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", fontSize: 14, transition: "background 0.2s" }}
                      onClick={() => setForm({ ...form, requester_id: u.id, _searchRequester: undefined })}
                      onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
                      onMouseOut={(e) => e.currentTarget.style.background = "white"}
                    >
                      <strong style={{ color: "#374151" }}>{u.name}</strong> {u.cpf ? <span style={{ color: "#6b7280", fontSize: 12 }}>({u.cpf})</span> : ""}
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{u.unit || "Sem Unidade"}</div>
                    </div>
                  ))}
                  {users.filter(u => {
                    const q = form._searchRequester.toLowerCase();
                    return u.name.toLowerCase().includes(q) || (u.cpf && u.cpf.includes(q)) || (u.unit && u.unit.toLowerCase().includes(q));
                  }).length === 0 && (
                    <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 14 }}>Nenhum usuário encontrado.</div>
                  )}
                </div>
              )}
            </div>
          </label>
        )}

        <div className="form-grid">
          <label>
            Categoria
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Selecione</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {isSupport && (
            <label>
              Prioridade
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </label>
          )}
        </div>

        <label>
          Assunto
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Breve resumo da solicitação" required />
        </label>

        <label>
          Descrição detalhada
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descreva o que aconteceu, impacto e ações já realizadas." required />
        </label>

        <div className="form-grid">
          <label>
            Local / Unidade
            <input list="localidades-list" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Ex.: 1º GBM - Manaus" />
          </label>
          <label>
            Patrimônio ou equipamento
            <input value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} placeholder="Ex.: SRV-SALAOP-07" />
          </label>
        </div>

        {/* Print do problema */}
        <div style={{ border: "2px dashed #3b82f6", borderRadius: 12, padding: 16,
          background: screenshotPreview ? "#eff6ff" : "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Camera size={18} color="#3b82f6" />
            <strong style={{ color: "#1d4ed8" }}>Print do problema</strong>
            <span style={{ color: "#667085", fontSize: 13 }}>— captura de tela que mostra o erro (opcional)</span>
          </div>
          {screenshotPreview ? (
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
              <img src={screenshotPreview} alt="Print do problema"
                style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8,
                  border: "1px solid #bfdbfe", display: "block" }} />
              <button type="button"
                onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                style={{ position: "absolute", top: 6, right: 6, background: "#ef4444",
                  border: "none", borderRadius: "50%", width: 26, height: 26,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "#fff", padding: 0 }}
                title="Remover print">
                <X size={14} />
              </button>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                {screenshot.name} &mdash; {fmtSize(screenshot.size)}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => screenshotRef.current?.click()}
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
                padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#1d4ed8",
                display: "flex", alignItems: "center", gap: 6 }}>
              <Camera size={14} />
              Selecionar captura de tela
            </button>
          )}
          <input ref={screenshotRef} type="file" accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (file.size > 20 * 1024 * 1024) { setMsg("Arquivo muito grande. Limite: 20 MB."); return; }
              setScreenshot(file);
              const reader = new FileReader();
              reader.onload = (ev) => setScreenshotPreview(ev.target.result);
              reader.readAsDataURL(file);
              e.target.value = "";
              setMessage("");
            }}
            style={{ display: "none" }} />
        </div>

        {/* Outros anexos */}
        <div style={{ border: "2px dashed #e5e7eb", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Paperclip size={18} color="#667085" />
            <strong style={{ color: "#374151" }}>Anexos</strong>
            <span style={{ color: "#667085", fontSize: 13 }}>— imagens, PDF, Word, Excel (máx. 10 MB cada, até 5 arquivos)</span>
          </div>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              background: "#f9fafb", borderRadius: 8, marginBottom: 6 }}>
              <Paperclip size={14} color="#9b0f14" />
              <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ color: "#667085", fontSize: 12 }}>{fmtSize(f.size)}</span>
              <button type="button" onClick={() => removeFile(i)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#667085", padding: 0 }}>
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ marginTop: 4, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#374151" }}>
            + Adicionar arquivo
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFiles} style={{ display: "none" }} />
        </div>

        {message && <div className="info-box">{message}</div>}
        <button className="primary-button" type="submit" disabled={uploading}>
          {uploading ? "Enviando..." : "Enviar chamado"}
        </button>
      </form>
    </section>
  );
}

// —— Knowledge base -----
function KnowledgePage({ user }) {
  const [articles,  setArticles]  = useState([]);
  const [query,     setQuery]     = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ title: "", content: "", category_id: "" });
  const [categories,setCategories]= useState([]);
  const [filterCat, setFilterCat] = useState("");
  const [msg,       setMsg]       = useState("");
  const [expanded,  setExpanded]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const isSupport = user?.role === "ADMIN" || user?.role === "ANALYST";

  function loadArticles() {
    api(`/knowledge${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setArticles).catch(() => {});
  }

  function openForm() {
    setForm({ title: "", content: "", category_id: "" });
    setMsg("");
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setMsg("");
  }

  useEffect(() => { loadArticles(); }, [query]);
  useEffect(() => {
    if (isSupport) api("/categories").then(setCategories).catch(() => {});
  }, [isSupport]);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setMsg("Limite: 25 MB."); return; }

    setUploading(true);
    setMsg("Enviando arquivo...");

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload  = () => resolve(r.result);
        r.onerror = () => reject(new Error("Falha ao ler arquivo local"));
        r.readAsDataURL(file);
      });

      const res = await api("/kb-direct-upload", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, data: dataUrl })
      });

      const fileLink = '<br/><br/><a href=' + res.url + ' target=_blank rel=noopener noreferrer ' +
        'style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;' +
        'background-color:#9b0f14;color:white;text-decoration:none;border-radius:8px;' +
        'font-weight:bold;margin-top:15px;"> Anexo (' + res.filename + ')</a>';
      setForm(prev => ({ ...prev, content: prev.content + fileLink }));
      setMsg("Arquivo anexado com sucesso!");
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      console.error("KB upload erro:", err);
      setMsg("Erro: " + (err.message || "desconhecido"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submitArticle(e) {
    e.preventDefault();
    try {
      await api("/knowledge", {
        method: "POST",
        body: JSON.stringify({ ...form, category_id: form.category_id || null }),
      });
      setForm({ title: "", content: "", category_id: "" });
      closeForm();
      loadArticles();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function archiveArticle(id) {
    if (!confirm("Arquivar este artigo?")) return;
    try {
      await api(`/knowledge/${id}`, { method: "DELETE" });
      loadArticles();
    } catch (e) { alert(e.message); }
  }

  const visibleArticles = filterCat
    ? articles.filter(a => String(a.category_id) === String(filterCat))
    : articles;

  const totalArticles = articles.length;
  const recentlyAdded = articles.filter(a => {
    if (!a.created_at) return false;
    const days = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
    return days <= 30;
  }).length;

  const T = {
    base: "Base de Conhecimento",
    desc: "Artigos, tutoriais e procedimentos para auxiliar no dia a dia operacional. Pesquise por palavras-chave ou filtre por categoria.",
    stats1: " artigos publicados",
    stats2: " novos nos últimos 30 dias",
    novo: "Novo artigo",
    cancelar: "Cancelar",
    novoArtigo: "Novo artigo",
    tituloLbl: "Título do artigo",
    tituloPh: "Ex.: Como configurar o acesso ao SIGED",
    categoriaLbl: "Categoria",
    semCat: "Sem categoria",
    conteudoLbl: "Conteúdo",
    conteudoPh: "Escreva o conteúdo do artigo. Use HTML básico para formatar.",
    anexar: "Clique para anexar um PDF ou arquivo",
    enviando: "Enviando arquivo...",
    limite: "Limite: 25 MB - O link será inserido automaticamente no final do conteúdo",
    publicar: "Publicar artigo",
    buscaPh: "Buscar artigos, soluções e tutoriais...",
    filtrar: "Filtrar:",
    todas: "Todas",
    geral: "Geral",
    verMais: "Ver mais",
    verMenos: "Ver menos",
    arquivar: "Arquivar artigo",
    empty1: "Nenhum artigo encontrado",
    emptyQ: "Não encontramos resultados para ",
    emptyC: "Esta categoria ainda não tem artigos publicados.",
    emptyV: "A base de conhecimento está vazia no momento.",
    autor: "por ",
    anexolbl: " Anexo (",
  };

  return (
    <section className="page">
      <div className="kb-hero">
        <div>
          <h1>{T.base}</h1>
          <p>{T.desc}</p>
          <div className="kb-hero-actions">
            <span className="kb-stat-pill">
              <BookOpen size={14} /> <strong>{totalArticles}</strong>{T.stats1}
            </span>
            {recentlyAdded > 0 && (
              <span className="kb-stat-pill">
                <PlusCircle size={14} /> <strong>{recentlyAdded}</strong>{T.stats2}
              </span>
            )}
          </div>
        </div>
        <div className="kb-hero-icon">
          <GraduationCap size={40} />
        </div>
      </div>

      {isSupport && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <button className="primary-button" onClick={() => showForm ? closeForm() : openForm()}>
            {showForm ? <X size={16} /> : <PlusCircle size={16} />}
            {showForm ? T.cancelar : T.novo}
          </button>
        </div>
      )}

      {showForm && (
        <div className="kb-form-overlay" onClick={(e) => { if (e.target.classList.contains("kb-form-overlay")) closeForm(); }}>
          <div>
            <header>
              <h2><PlusCircle size={22} /> {T.novoArtigo}</h2>
              <button type="button" onClick={closeForm} aria-label="Fechar"><X size={18} /></button>
            </header>
            <form onSubmit={submitArticle}>
              <div className="kb-form-body">
                <label>
                  {T.tituloLbl}
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder={T.tituloPh}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  {T.categoriaLbl}
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">{T.semCat}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>
                  {T.conteudoLbl}
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder={T.conteudoPh}
                    required
                  />
                </label>

                <div
                  className={"kb-attach-zone" + (uploading ? " uploading" : "")}
                  onClick={() => !uploading && fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !uploading) fileRef.current?.click(); }}
                >
                  <div>
                    <Paperclip size={18} />
                    {uploading ? T.enviando : T.anexar}
                  </div>
                  <small>{T.limite}</small>
                  <input ref={fileRef} type="file" onChange={handleFileUpload} style={{ display: "none" }} />
                </div>

                {msg && <div className="info-box">{msg}</div>}
              </div>
              <div className="kb-form-footer">
                <button type="button" className="kb-cancel-btn" onClick={closeForm}>{T.cancelar}</button>
                <button type="submit" className="kb-submit-btn" disabled={uploading || !form.title.trim() || !form.content.trim()}>
                  <PlusCircle size={16} /> {T.publicar}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="search-large">
        <Search />
        <input
          placeholder={T.buscaPh}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {categories.length > 0 && (
        <div className="kb-filters">
          <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>{T.filtrar}</span>
          <button
            type="button"
            className={"kb-category-chip" + (filterCat === "" ? " active" : "")}
            onClick={() => setFilterCat("")}
          >
            {T.todas} ({articles.length})
          </button>
          {categories.map(c => {
            const count = articles.filter(a => a.category_id === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                className={"kb-category-chip" + (String(filterCat) === String(c.id) ? " active" : "")}
                onClick={() => setFilterCat(String(c.id))}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="article-grid">
        {visibleArticles.map((a) => {
          const isExpanded = expanded === a.id;
          const tooLong = (a.content || "").length > 220;
          return (
            <article key={a.id} className="kb-card">
              <div className="kb-card-header">
                <div className="kb-card-icon">
                  <BookOpen size={22} />
                </div>
                <span className="kb-card-badge">{a.category_name || T.geral}</span>
              </div>

              <h3>{a.title}</h3>

              <div
                className={"kb-card-content" + (isExpanded ? " expanded" : "")}
                dangerouslySetInnerHTML={{ __html: a.content }}
              />

              <div className="kb-card-footer">
                <div className="kb-card-meta">
                  {a.author_name && <span>{T.autor}<strong style={{ color: "var(--navy)" }}>{a.author_name}</strong></span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {tooLong && (
                    <button type="button" className="kb-card-toggle" onClick={() => setExpanded(isExpanded ? null : a.id)}>
                      {isExpanded ? T.verMenos : T.verMais}
                    </button>
                  )}
                  {isSupport && (
                    <div className="kb-card-actions">
                      <button type="button" onClick={() => archiveArticle(a.id)} title={T.arquivar} aria-label={T.arquivar}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {visibleArticles.length === 0 && (
          <div className="kb-empty-state">
            <BookOpen size={48} />
            <h3>{T.empty1}</h3>
            <p>
              {query
                ? `${T.emptyQ}"${query}".`
                : filterCat
                ? T.emptyC
                : T.emptyV}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// —— Reports -----
function ReportsPage({ defaultTab = "overview" }) {
  const [tab, setTab]         = useState(defaultTab);
  const [summary, setSummary] = useState(null);
  const [analysts, setAnalysts] = useState([]);
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0,7));
  const [calData, setCalData]   = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayTickets, setDayTickets]   = useState([]);
  const [analystTickets, setAnalystTickets] = useState([]);
  const [selectedAnalyst, setSelectedAnalyst] = useState(null);

  useEffect(() => {
    api("/reports/summary").then(setSummary).catch(() => {});
    api("/reports/analysts").then(setAnalysts).catch(() => {});
  }, []);

  useEffect(() => {
    api(`/reports/calendar?month=${calMonth}`).then(setCalData).catch(() => {});
    setSelectedDay(null); setDayTickets([]);
  }, [calMonth]);

  function selectDay(day) {
    setSelectedDay(day);
    setSelectedAnalyst(null);
    api(`/reports/tickets-detail?day=${day}`).then(setDayTickets).catch(() => {});
  }

  function selectAnalyst(a) {
    setSelectedAnalyst(a);
    setSelectedDay(null);
    api(`/reports/tickets-detail?analyst_id=${a.id}`).then(setAnalystTickets).catch(() => {});
  }

  // Constrói o grid do calendário
  function buildCalendar() {
    const [y, m] = calMonth.split("-").map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay(); // 0=dom
    const daysInMonth = new Date(y, m, 0).getDate();
    const map = {};
    calData.forEach(r => { map[r.day] = r; });
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${calMonth}-${String(d).padStart(2,"0")}`;
      cells.push({ d, key, data: map[key] || null });
    }
    return cells;
  }

  const tabStyle = (t) => ({
    padding: "10px 18px", border: 0, background: "none", fontWeight: 600, cursor: "pointer",
    borderBottom: tab === t ? "2px solid #9b0f14" : "none",
    color: tab === t ? "#9b0f14" : "#667085",
  });

  const monthName = new Date(calMonth + "-02").toLocaleString("pt-BR", { month: "long", year: "numeric" });

  return (
    <section className="page">
      <div className="page-header-row">
        <h1>Relatórios e Indicadores</h1>
        <a
          href={`${(import.meta.env.VITE_API_URL || "/chamados/api")}/reports/export?token=${encodeURIComponent(getToken())}`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px",
            background: "#9b0f14", color: "white", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
          <Download size={16} /> Exportar CSV
        </a>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
        <button style={tabStyle("overview")} onClick={() => setTab("overview")}>Visão Geral</button>
        <button style={tabStyle("analysts")} onClick={() => setTab("analysts")}>Por Analista</button>
        <button style={tabStyle("calendar")} onClick={() => setTab("calendar")}>Calendário</button>
      </div>

      {/* —— Visão Geral */}
      {tab === "overview" && (
        <div>
          <div className="kpi-grid">
            <Kpi icon={FileText}      value={summary?.total        ?? "-"} label="Chamados totais"  detail="Base atual" />
            <Kpi icon={Clock}         value={summary?.open         ?? "-"} label="Em aberto"        detail="Pendentes" />
            <Kpi icon={CheckCircle}   value={summary?.resolved     ?? "-"} label="Resolvidos"       detail="Concluídos" />
            <Kpi icon={AlertTriangle} value={summary?.highPriority ?? "-"} label="Prioridade alta"  detail="Alta e crítica" />
          </div>
          <div className="table-card">
            <div className="table-title"><strong>Chamados por categoria</strong></div>
            <table>
              <thead><tr><th>Categoria</th><th>Total</th></tr></thead>
              <tbody>
                {summary?.byCategory?.map((row) => {
                  const displayName = row.name === "Sistemas" ? "Sistemas (SIGED, SIGDP)" : row.name;
                  return (
                    <tr key={row.name}>
                      <td>{displayName}</td>
                      <td>{row.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* —— Por Analista */}
      {tab === "analysts" && (
        <div>
          <div className="table-card">
            <div className="table-title"><strong>Desempenho por analista</strong></div>
            <table>
              <thead>
                <tr>
                  <th>Analista</th><th>OBM</th>
                  <th>Atribuídos</th><th>Resolvidos</th><th>Em aberto</th>
                  <th>T.M. Resolução (h)</th><th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {analysts.map(a => (
                  <tr key={a.id} style={{ background: selectedAnalyst?.id === a.id ? "#f0f9ff" : "" }}>
                    <td><strong>{a.name}</strong></td>
                    <td>{a.unit || "—"}</td>
                    <td>{a.total}</td>
                    <td style={{ color: "#12b76a", fontWeight: 600 }}>{a.resolved}</td>
                    <td style={{ color: a.open > 0 ? "#f79009" : "#667085" }}>{a.open}</td>
                    <td>{a.avg_hours ? `${a.avg_hours}h` : "—"}</td>
                    <td>
                      <button
                        onClick={() => selectAnalyst(a)}
                        style={{ fontSize: 12, padding: "4px 10px", background: "#f3f4f6", border: 0, borderRadius: 8, cursor: "pointer" }}
                      >
                        Ver chamados
                      </button>
                    </td>
                  </tr>
                ))}
                {analysts.length === 0 && <tr><td colSpan={7} style={{ color: "#667085", textAlign: "center" }}>Nenhum analista cadastrado ainda.</td></tr>}
              </tbody>
            </table>
          </div>

          {selectedAnalyst && (
            <div className="table-card" style={{ marginTop: 20 }}>
              <div className="table-title">
                <strong>Chamados de {selectedAnalyst.name}</strong>
                <button onClick={() => setSelectedAnalyst(null)} style={{ float: "right", border: 0, background: "none", cursor: "pointer", color: "#667085" }}>Fechar</button>
              </div>
              <TicketsDetailTable tickets={analystTickets} />
            </div>
          )}
        </div>
      )}

      {/* —— Calendário */}
      {tab === "calendar" && (
        <div>
          {/* Navegação de mês */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => {
                const d = new Date(calMonth + "-02"); d.setMonth(d.getMonth() - 1);
                setCalMonth(d.toISOString().slice(0,7));
              }} style={{ padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", background: "white" }}>
                &larr;
              </button>
              <button onClick={() => {
                const d = new Date(calMonth + "-02"); d.setMonth(d.getMonth() + 1);
                setCalMonth(d.toISOString().slice(0,7));
              }} style={{ padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", background: "white" }}>
                &rarr;
              </button>
            </div>
            
            <strong style={{ fontSize: 18, textTransform: "capitalize", minWidth: 160 }}>{monthName}</strong>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
              <small style={{ color: "#667085" }}>Ir para:</small>
              <input 
                type="month" 
                value={calMonth} 
                onChange={(e) => setCalMonth(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}
              />
            </div>
          </div>

          {/* Grid calendário */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 20 }}>
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
              <div key={d} style={{ textAlign: "center", fontWeight: 700, color: "#667085", padding: "6px 0", fontSize: 13 }}>{d}</div>
            ))}
            {buildCalendar().map((cell, i) => (
              <div key={i} onClick={() => cell?.data && selectDay(cell.key)}
                style={{
                  minHeight: 72, padding: 8, borderRadius: 10,
                  background: !cell ? "transparent" : selectedDay === cell?.key ? "#fee2e2" :
                    cell.data ? (cell.data.total > 5 ? "#fef3c7" : "#f0fdf4") : "white",
                  cursor: cell?.data ? "pointer" : "default",
                  opacity: !cell ? 0 : 1,
                  border: selectedDay === cell?.key ? "2px solid #9b0f14" : "1px solid #e5e7eb",
                }}>
                {cell && (
                  <>
                    <div style={{ fontWeight: 700, color: "#374151", fontSize: 14 }}>{cell.d}</div>
                    {cell.data && (
                      <>
                        <div style={{ fontSize: 11, color: "#9b0f14", marginTop: 4 }}>
                          {cell.data.total} aberto{cell.data.total !== 1 ? "s" : ""}
                        </div>
                        {cell.data.resolved > 0 && (
                          <div style={{ fontSize: 11, color: "#12b76a" }}>
                            {cell.data.resolved} resolvido{cell.data.resolved !== 1 ? "s" : ""}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Chamados do dia selecionado */}
          {selectedDay && (
            <div className="table-card">
              <div className="table-title">
                <strong>Chamados abertos em {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
                <button onClick={() => setSelectedDay(null)} style={{ float: "right", border: 0, background: "none", cursor: "pointer", color: "#667085" }}>Fechar</button>
              </div>
              <TicketsDetailTable tickets={dayTickets} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Tabela reutilizável de chamados nos relatórios
function TicketsDetailTable({ tickets }) {
  if (!tickets.length) return <p style={{ color: "#667085", padding: 16 }}>Nenhum chamado encontrado.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Protocolo</th><th>Assunto</th><th>Solicitante</th>
          <th>Analista</th><th>Status</th><th>Abertura</th><th>Resolução</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map(t => (
          <tr key={t.protocol}>
            <td className="protocol">{t.protocol}</td>
            <td>{t.subject}</td>
            <td>{t.requester_name}</td>
            <td>{t.analyst_name || <span style={{ color: "#667085" }}>Não atribuído</span>}</td>
            <td><span className={`chip status-${t.status}`}>{statusLabels[t.status] || t.status}</span></td>
            <td style={{ whiteSpace: "nowrap" }}>{new Date(t.created_at).toLocaleString("pt-BR")}</td>
            <td style={{ whiteSpace: "nowrap" }}>{t.resolved_at ? new Date(t.resolved_at).toLocaleString("pt-BR") : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// —— Service status -----
function ServiceStatusPage({ user }) {
  const [services,  setServices]  = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null); // service name
  const [editStatus,setEditStatus]= useState("");
  const [editDesc,  setEditDesc]  = useState("");
  const [msg,       setMsg]       = useState("");
  const canEdit = user?.role === "ADMIN" || user?.role === "ANALYST";

  function loadServices() {
    setLoading(true);
    Promise.all([
      api("/services/status"),
      api("/services/history").catch(() => [])
    ])
      .then(([servicesData, historyData]) => {
        setServices(servicesData);
        setHistory(historyData);
      })
      .catch(() => {
        setServices([
          { name: "SIGBM", status: "OPERATIONAL", category: "Sistemas Corporativos", active_incidents: 0 },
          { name: "E-mail Institucional", status: "OPERATIONAL", category: "Sistemas Corporativos", active_incidents: 0 },
          { name: "Internet Corporativa", status: "DEGRADED", category: "Infraestrutura e Redes", active_incidents: 1 },
          { name: "Telefonia", status: "OPERATIONAL", category: "Infraestrutura e Redes", active_incidents: 0 },
          { name: "Rede Wi-Fi", status: "OUTAGE", category: "Infraestrutura e Redes", active_incidents: 2 },
        ]);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadServices(); }, []);

  async function saveStatus(name) {
    try {
      await api(`/services/${encodeURIComponent(name)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: editStatus, description: editDesc }),
      });
      setMsg(`Status de "${name}" atualizado.`);
      setEditing(null);
      loadServices();
    } catch (e) { setMsg(e.message); }
  }

  const statusIcons = {
    OPERATIONAL: { icon: CheckCircle,   color: "#12b76a", label: "Operacional", pulseClass: "operational" },
    DEGRADED:    { icon: Clock,          color: "#f79009", label: "Desempenho Reduzido", pulseClass: "degraded" },
    OUTAGE:      { icon: AlertTriangle,  color: "#f04438", label: "Indisponível", pulseClass: "outage" },
  };

  const allOk = services.every(s => s.status === "OPERATIONAL");

  // Agrupamento por categorias
  const groupedServices = services.reduce((acc, s) => {
    const cat = s.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <section className="page">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-green {
          0% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(18, 183, 106, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(18, 183, 106, 0); }
          100% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(18, 183, 106, 0); }
        }
        @keyframes pulse-yellow {
          0% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(247, 144, 9, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(247, 144, 9, 0); }
          100% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(247, 144, 9, 0); }
        }
        @keyframes pulse-red {
          0% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(240, 68, 56, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(240, 68, 56, 0); }
          100% { transform: scale(0.85); box-shadow: 0 0 0 0 rgba(240, 68, 56, 0); }
        }
        .status-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .status-pulse-dot.operational {
          background-color: #12b76a;
          animation: pulse-green 2s infinite;
        }
        .status-pulse-dot.degraded {
          background-color: #f79009;
          animation: pulse-yellow 2s infinite;
        }
        .status-pulse-dot.outage {
          background-color: #f04438;
          animation: pulse-red 2s infinite;
        }
      `}} />

      <h1>Status dos Serviços</h1>
      <p>Acompanhe em tempo real a disponibilidade dos sistemas e serviços do CBMAM.</p>

      {!loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
          background: allOk ? "#f0fdf4" : "#fef9c3", borderRadius: 12, marginBottom: 20,
          border: `1px solid ${allOk ? "#a7f3d0" : "#fde68a"}` }}>
          {allOk
            ? <><CheckCircle size={20} color="#12b76a" /> <strong style={{ color: "#065f46" }}>Todos os serviços operacionais</strong></>
            : <><AlertTriangle size={20} color="#b45309" /> <strong style={{ color: "#92400e" }}>Há serviços com problemas</strong></>
          }
        </div>
      )}

      {msg && <div className="info-box" style={{ marginBottom: 16 }}>{msg}</div>}

      {loading ? <p>Carregando status...</p> : (
        <div style={{ display: "grid", gap: 24, marginTop: 8 }}>
          {Object.entries(groupedServices).map(([categoryName, items]) => (
            <div key={categoryName}>
              <h3 style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "#475467",
                borderBottom: "1px solid #eaecf0",
                paddingBottom: "8px",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {categoryName}
              </h3>
              <div className="status-list" style={{ display: "grid", gap: 12 }}>
                {items.map((item) => {
                  const config = statusIcons[item.status] || statusIcons.OPERATIONAL;
                  const Icon = config.icon;
                  const isEditThis = editing === item.name;
                  return (
                    <div key={item.name} style={{
                      padding: 16, background: "white", borderRadius: 12,
                      border: `1px solid ${isEditThis ? "#9b0f14" : "#e5e7eb"}`
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Icon style={{ color: config.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <span>{item.name}</span>
                            {item.active_incidents > 0 && (
                              <span style={{
                                fontSize: 11, background: "#fee2e2", color: "#f04438",
                                padding: "2px 8px", borderRadius: 12, fontWeight: 600, display: "inline-flex",
                                alignItems: "center", gap: 4
                              }}>
                                <AlertTriangle size={10} /> {item.active_incidents} {item.active_incidents === 1 ? 'chamado ativo' : 'chamados ativos'}
                              </span>
                            )}
                          </strong>
                          <small style={{ color: "#667085" }}>{item.description || "Nenhum incidente relatado"}</small>
                        </div>
                        <span className="chip" style={{
                          background: config.color + "15",
                          color: config.color,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <span className={`status-pulse-dot ${config.pulseClass}`} />
                          {config.label}
                        </span>
                        {canEdit && (
                          <button onClick={() => { setEditing(isEditThis ? null : item.name); setEditStatus(item.status); setEditDesc(item.description || ""); setMsg(""); }}
                            style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>
                            <Edit3 size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            {isEditThis ? "Cancelar" : "Editar"}
                          </button>
                        )}
                      </div>
                      {isEditThis && (
                        <div style={{ marginTop: 14, padding: "12px 0 0", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                          <label style={{ flex: 1, minWidth: 160 }}>
                            <small style={{ color: "#667085", display: "block", marginBottom: 4 }}>Status</small>
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                              <option value="OPERATIONAL">✅ Operacional</option>
                              <option value="DEGRADED">⚠️ Desempenho Reduzido</option>
                              <option value="OUTAGE">🔴 Indisponível</option>
                            </select>
                          </label>
                          <label style={{ flex: 2, minWidth: 200 }}>
                            <small style={{ color: "#667085", display: "block", marginBottom: 4 }}>Observação</small>
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                              placeholder="Ex.: Manutenção programada..."
                              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          </label>
                          <button className="primary-button" style={{ padding: "9px 16px" }} onClick={() => saveStatus(item.name)}>Salvar</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico de Alterações */}
      {!loading && (
        <div style={{ marginTop: 40, borderTop: "1px solid #eaecf0", paddingTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1d2939", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={20} color="#9b0f14" /> Histórico Recente de Alterações
          </h2>
          {history.length === 0 ? (
            <p style={{ color: "#667085", fontSize: 14 }}>Nenhuma alteração recente registrada.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
              {history.map((log, idx) => {
                const config = statusIcons[log.status] || statusIcons.OPERATIONAL;
                return (
                  <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%", background: config.color,
                        marginTop: 6, flexShrink: 0
                      }} />
                      {idx < history.length - 1 && (
                        <div style={{ width: 2, minHeight: 24, flexGrow: 1, background: "#eaecf0", marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#344054" }}>
                          {log.service_name} alterado para <span style={{ color: config.color }}>{config.label}</span>
                        </span>
                        <span style={{ fontSize: 12, color: "#98a2b3" }}>
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {log.description && (
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#667085" }}>
                          {log.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// —— Profile -----
function ProfilePage({ user }) {
  const [editing, setEditing] = useState(false);
  const [phone,   setPhone]   = useState(user.phone || "");
  const [unit,    setUnit]    = useState(user.unit  || "");
  const [msg,     setMsg]     = useState("");

  async function save(e) {
    e.preventDefault();
    try {
      const data = await api("/users/me", { method: "PATCH", body: JSON.stringify({ phone, unit }) });
      if (data?.user) {
        setSession({ token: getToken(), user: data.user });
        if (typeof onUserUpdate === "function") onUserUpdate(data.user);
      }
      setMsg("Perfil atualizado com sucesso!");
      setEditing(false);
    } catch (err) { setMsg(err.message); }
  }

  const chipStyle = {
    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: user.role === "ADMIN" ? "#fee2e2" : user.role === "ANALYST" ? "#dbeafe" : "#f3f4f6",
    color:      user.role === "ADMIN" ? "#9b0f14" : user.role === "ANALYST" ? "#1d4ed8" : "#374151",
  };

  return (
    <section className="page">
      <h1>Meu Perfil</h1>
      <div className="form-card">
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div className="avatar" style={{ width: 80, height: 80, fontSize: 32 }}>{user.name?.slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 style={{ margin: 0 }}>{user.name}</h2>
            <p style={{ color: "#667085", margin: "4px 0" }}>{user.email}</p>
            <span style={chipStyle}>{roleLabels[user.role]}</span>
          </div>
          <button onClick={() => { setEditing(!editing); setMsg(""); }}
            style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: "white", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6 }}>
            <Edit3 size={14} /> {editing ? "Cancelar" : "Editar perfil"}
          </button>
        </div>

        {editing ? (
          <form onSubmit={save}>
            <div className="form-grid">
              <label>
                Telefone / Ramal
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(92) 99999-0000" />
              </label>
              <label>
                Unidade / Lotação
                <input list="localidades-list" value={unit} onChange={e => setUnit(e.target.value)} placeholder="Ex.: BM-6 TI" />
              </label>
            </div>
            {msg && <div className="info-box">{msg}</div>}
            <button className="primary-button" type="submit">Salvar alterações</button>
          </form>
        ) : (
          <>
            <div className="form-grid">
              <Info label="CPF"               value={user.cpf || "—"} />
              <Info label="Perfil de Acesso"  value={roleLabels[user.role]} />
              <Info label="Unidade / Lotação" value={unit || user.unit || "Não informado"} />
              <Info label="Telefone / Ramal"  value={phone || user.phone || "Não informado"} />
              <Info label="Data de Cadastro"  value={new Date(user.created_at || Date.now()).toLocaleDateString("pt-BR")} />
            </div>
            {msg && <div className="info-box">{msg}</div>}
          </>
        )}
      </div>
    </section>
  );
}

// —— SLA row (inline edit) -----
function SlaRow({ category, onSave }) {
  const [editing, setEditing] = useState(false);
  const [resp,    setResp]    = useState(category.sla_response_hours);
  const [resol,   setResol]   = useState(category.sla_resolution_hours);

  async function save() {
    try {
      await api(`/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sla_response_hours: Number(resp), sla_resolution_hours: Number(resol) }),
      });
      setEditing(false);
      onSave();
    } catch (e) { alert(e.message); }
  }

  return (
    <tr>
      <td><strong>{category.name}</strong></td>
      <td>
        {editing
          ? <input type="number" min="1" value={resp} onChange={e => setResp(e.target.value)}
              style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb" }} />
          : `${category.sla_response_hours}h`}
      </td>
      <td>
        {editing
          ? <input type="number" min="1" value={resol} onChange={e => setResol(e.target.value)}
              style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb" }} />
          : `${category.sla_resolution_hours}h`}
      </td>
      <td>
        {editing ? (
          <>
            <button onClick={save} style={{ fontSize: 12, padding: "4px 10px", background: "#9b0f14", color: "white", border: 0, borderRadius: 8, marginRight: 6 }}>Salvar</button>
            <button onClick={() => setEditing(false)} style={{ fontSize: 12, padding: "4px 10px", background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>Cancelar</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} style={{ fontSize: 12, padding: "4px 10px", background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <Edit3 size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Editar
          </button>
        )}
      </td>
    </tr>
  );
}

// —— Settings -----
function SettingsPage() {
  const [tab, setTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [users, setUsers]   = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [preForm, setPreForm] = useState({ cpf: "", name: "", unit: "", role: "USER" });
  const [preMsg, setPreMsg]   = useState("");
  const [preLoading, setPreLoading] = useState(false);

  function maskCPF(v) {
    return v.replace(/\D/g,'')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0,14);
  }

  async function loadCategories() {
    try { setCategories(await api("/categories")); } catch (e) {}
  }

  async function loadUsers() {
    try { setUsers(await api("/users")); } catch (e) {}
  }

  useEffect(() => {
    if (tab === "categories") loadCategories();
    if (tab === "users") loadUsers();
  }, [tab]);

  async function addCategory(e) {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await api("/categories", { method: "POST", body: JSON.stringify({ name: newCat }) });
      setNewCat("");
      loadCategories();
    } catch (e) { alert(e.message); }
  }

  async function deleteCategory(id) {
    if (!confirm("Remover esta categoria?")) return;
    try {
      await api(`/categories/${id}`, { method: "DELETE" });
      loadCategories();
    } catch (e) { alert(e.message); }
  }

  async function changeRole(userId, role) {
    const label = { USER: "Usuário", ANALYST: "Analista BM-6", ADMIN: "Administrador" }[role];
    if (!confirm(`Alterar perfil para ${label}?`)) return;
    try {
      await api(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      loadUsers();
    } catch (e) { alert(e.message); }
  }

  async function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const msg = newStatus === "INACTIVE" ? "Desativar este usuário?" : "Reativar este usuário?";
    if (!confirm(msg)) return;
    try {
      await api(`/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
      loadUsers();
    } catch (e) { alert(e.message); }
  }

  async function preRegister(e) {
    e.preventDefault();
    setPreMsg("");
    setPreLoading(true);
    try {
      const res = await api("/users/preregister", {
        method: "POST",
        body: JSON.stringify({
          cpf:  preForm.cpf,
          name: preForm.name || null,
          unit: preForm.unit || null,
          role: preForm.role,
        }),
      });
      setPreMsg(res.message);
      setPreForm({ cpf: "", name: "", unit: "", role: "USER" });
      loadUsers();
    } catch (err) {
      setPreMsg(err.message);
    } finally {
      setPreLoading(false);
    }
  }

  const roleChipStyle = (role) => ({
    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    background: role === "ADMIN" ? "#fee2e2" : role === "ANALYST" ? "#dbeafe" : "#f3f4f6",
    color:      role === "ADMIN" ? "#9b0f14" : role === "ANALYST" ? "#1d4ed8" : "#374151",
  });

  const filteredUsers = users.filter(u =>
    userSearch === "" ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.cpf || "").includes(userSearch) ||
    (u.unit || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <section className="page">
      <h1>Configurações do Sistema</h1>
      
      <div style={{ display: "flex", gap: 20, borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
        <button onClick={() => setTab("categories")} style={{
          padding: "12px 16px", border: 0, background: "none",
          borderBottom: tab === "categories" ? "2px solid #9b0f14" : "none",
          color: tab === "categories" ? "#9b0f14" : "#667085", fontWeight: 600
        }}>Categorias</button>
        <button onClick={() => setTab("users")} style={{
          padding: "12px 16px", border: 0, background: "none",
          borderBottom: tab === "users" ? "2px solid #9b0f14" : "none",
          color: tab === "users" ? "#9b0f14" : "#667085", fontWeight: 600
        }}>Usuários</button>
        <button onClick={() => setTab("sla")} style={{
          padding: "12px 16px", border: 0, background: "none",
          borderBottom: tab === "sla" ? "2px solid #9b0f14" : "none",
          color: tab === "sla" ? "#9b0f14" : "#667085", fontWeight: 600
        }}>Prazos (SLA)</button>
      </div>

      {tab === "categories" && (
        <div className="form-card">
          <h2>Gerenciar Categorias</h2>
          <form onSubmit={addCategory} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nome da nova categoria..." style={{ flex: 1 }} />
            <button className="primary-button" type="submit">Adicionar</button>
          </form>
          <table>
            <thead><tr><th>ID</th><th>Nome</th><th>Ações</th></tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}><td>{c.id}</td><td>{c.name}</td><td><button onClick={() => deleteCategory(c.id)} style={{ color: "#f04438", border: 0, background: "none" }}>Excluir</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "users" && (
        <div>
          {/* Pré-cadastro por CPF */}
          <div className="form-card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Pré-cadastrar militar por CPF</h2>
            <p style={{ color: "#667085", marginBottom: 16 }}>
              Cadastre o militar antes do primeiro acesso. No login ele será reconhecido automaticamente pelo DRH.
            </p>
            <form onSubmit={preRegister}>
              <div className="form-grid">
                <label>
                  CPF
                  <input
                    value={preForm.cpf}
                    onChange={(e) => setPreForm({ ...preForm, cpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </label>
                <label>
                  Perfil
                  <select value={preForm.role} onChange={(e) => setPreForm({ ...preForm, role: e.target.value })}>
                    <option value="USER">Usuário (abertura de chamados)</option>
                    <option value="ANALYST">Analista BM-6 (atendimento)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Nome (opcional — será atualizado no login)
                  <input
                    value={preForm.name}
                    onChange={(e) => setPreForm({ ...preForm, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </label>
                <label>
                  OBM / Unidade (opcional)
                  <input
                    value={preForm.unit}
                    onChange={(e) => setPreForm({ ...preForm, unit: e.target.value })}
                    placeholder="Ex: 1º GBM"
                  />
                </label>
              </div>
              {preMsg && <div className="info-box">{preMsg}</div>}
              <button className="primary-button" type="submit" disabled={preLoading}>
                {preLoading ? "Cadastrando..." : "Pré-cadastrar"}
              </button>
            </form>
          </div>

          {/* Lista de usuários */}
          <div className="form-card">
            <h2 style={{ marginTop: 0 }}>Militares cadastrados ({users.length})</h2>
            <input
              placeholder="Buscar por nome, CPF ou OBM..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <table>
              <thead>
                <tr><th>Nome</th><th>CPF</th><th>OBM</th><th>Perfil</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td style={{ fontFamily: "monospace" }}>{u.cpf || "—"}</td>
                    <td>{u.unit || "—"}</td>
                    <td><span style={roleChipStyle(u.role)}>{roleLabels[u.role]}</span></td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {u.role === "USER" && (
                        <button onClick={() => changeRole(u.id, "ANALYST")}
                          style={{ fontSize: 12, padding: "4px 10px", background: "#1d4ed8", color: "white", border: 0, borderRadius: 8 }}>
                          Tornar Analista
                        </button>
                      )}
                      {u.role === "ANALYST" && (
                        <button onClick={() => changeRole(u.id, "USER")}
                          style={{ fontSize: 12, padding: "4px 10px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                          Revogar Analista
                        </button>
                      )}
                      {u.role !== "ADMIN" && (
                        <button onClick={() => changeRole(u.id, "ADMIN")}
                          style={{ fontSize: 12, padding: "4px 10px", background: "#fee2e2", color: "#9b0f14", border: 0, borderRadius: 8 }}>
                          Tornar Admin
                        </button>
                      )}
                      <button
                        onClick={() => toggleStatus(u.id, u.status)}
                        title={u.status === "ACTIVE" ? "Desativar usuário" : "Reativar usuário"}
                        style={{ fontSize: 12, padding: "4px 10px", background: "white",
                          color: u.status === "ACTIVE" ? "#667085" : "#12b76a",
                          border: "1px solid #e5e7eb", borderRadius: 8 }}>
                        {u.status === "ACTIVE"
                          ? <><ToggleLeft size={13} style={{ verticalAlign: "middle" }} /> Ativo</>
                          : <><ToggleRight size={13} style={{ verticalAlign: "middle" }} /> Inativo</>}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={5} style={{ color: "#667085", textAlign: "center" }}>Nenhum usuário cadastrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "sla" && (
        <div className="form-card">
          <h2 style={{ marginTop: 0 }}>Gerenciar SLA por Categoria</h2>
          <p style={{ color: "#667085", marginBottom: 16 }}>Defina os prazos de resposta e resolução para cada categoria de chamado.</p>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Prazo de Resposta (h)</th>
                <th>Prazo de Resolução (h)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <SlaRow key={c.id} category={c} onSave={() => loadCategories()} />
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={4} style={{ color: "#667085", textAlign: "center" }}>Nenhuma categoria cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default App;
