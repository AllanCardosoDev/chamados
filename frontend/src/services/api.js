const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? `${window.location.origin}/chamados/api`
    : "http://localhost:4000/api"
);

export function getToken() {
  return localStorage.getItem("cbmam_chamados_token");
}

export function setSession({ token, user }) {
  localStorage.setItem("cbmam_chamados_token", token);
  localStorage.setItem("cbmam_chamados_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("cbmam_chamados_token");
  localStorage.removeItem("cbmam_chamados_user");
}

export function getCurrentUser() {
  const raw = localStorage.getItem("cbmam_chamados_user");
  return raw ? JSON.parse(raw) : null;
}

export async function api(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  // Só faz logout automático em rotas protegidas, nunca durante o login
  if (res.status === 401 && !path.includes('/auth/login')) {
    clearSession();
    window.location.reload();
  }

  if (!res.ok) throw new Error(data.message || "Erro na comunicação com o servidor");

  return data;
}
