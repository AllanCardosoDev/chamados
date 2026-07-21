# CBMAM Chamados — Sistema Unificado de Gerenciamento de TI

Sistema consolidado de gerenciamento de chamados de TI do Corpo de Bombeiros Militar do Amazonas — **BM-6 Tecnologia da Informação**.

---

## Estrutura do Projeto Unificado

```
chamados/
├── backend/                          # Backend Node.js + Express + MySQL (Plesk)
│   ├── src/
│   │   ├── db/database.js            # Pool MySQL (Plesk) com autotabelas e seed
│   │   ├── middleware/auth.js        # Autenticação e validação JWT
│   │   ├── routes/                   # Endpoints (auth, tickets, categories, knowledge, etc.)
│   │   ├── services/                 # Serviços de e-mail (Nodemailer)
│   │   ├── iisentry.cjs              # Entry point do IIS / iisnode (Produção Plesk)
│   │   └── server.js                 # Entry point Standalone / Desenvolvimento
│   ├── .env.example                  # Modelo de variáveis de ambiente do Plesk
│   └── package.json
├── frontend/                         # Frontend React 18 + Vite (SPA)
│   ├── src/                          # Componentes, dashboard, relatórios, temas
│   ├── public/
│   └── package.json
├── asp-tools/                        # Ferramentas ASP de diagnóstico e gestão no IIS Plesk
│   ├── start-backend.asp             # Inicializador/recuperador de processo no IIS
│   ├── check-backend.asp             # Diagnóstico de integridade do backend e banco
│   ├── diag-502.asp                  # Diagnóstico de erros 502/Gateway do IIS
│   └── localidades.json              # Mapeamento de OBMs e unidades
├── web.config                        # Regras de rewrite e handler do iisnode no Plesk
└── package.json                      # Scripts unificados de gerenciamento do projeto
```

---

## Pré-requisitos
- **Node.js 20+** instalado no Windows Server (`C:\Program Files\nodejs`)
- **Banco de Dados MySQL no Plesk** (`chamados` database)
- **IIS** com URL Rewrite Module + iisnode instalados no servidor Windows
- **API de Login Externa (DRH / SIGDP)** disponível em rede

---

## Configuração do Banco de Dados Plesk e Login API

1. Copie o arquivo de exemplo de ambiente no backend:
   ```powershell
   cd backend
   cp .env.example .env
   ```
2. Edite o arquivo `backend/.env` preenchendo as variáveis reais:
   - `JWT_SECRET`: Chave secreta de token de sessão.
   - `DB_HOST`: Host do MySQL (ex: `localhost` ou `127.0.0.1`).
   - `DB_PORT`: Porta do MySQL (padrão: `3306`).
   - `DB_USER`: Usuário do banco de dados criado no Plesk.
   - `DB_PASS`: Senha do banco de dados criado no Plesk.
   - `DB_NAME`: Nome do banco no Plesk (`chamados`).
   - `SIGDP_API_URL`: URL da API de Login do SIGDP/DRH (`http://127.0.0.1:8000/sigdp/api/login`).
   - `SIGDP_API_FALLBACK_URL`: URL de contingência da API de Login (`https://drhsistema-production.up.railway.app/api/login`).

---

## Comandos de Desenvolvimento

No diretório raiz do projeto:

```bash
# 1. Instalar todas as dependências (backend e frontend)
npm run install:all

# 2. Executar AMBOS (backend + frontend simultaneamente em paralelo)
npm run dev

# 3. Executar apenas o backend
npm run dev:backend

# 4. Executar apenas o frontend
npm run dev:frontend

# 5. Compilar o frontend para produção
npm run build
```

---

## Deploy e Execução no IIS Plesk

1. **Instalação**: Execute `npm run install:all` e `npm run build`.
2. **IIS / iisnode**: O arquivo `web.config` na raiz roteia automaticamente requisições para `backend/src/iisentry.cjs`.
3. **Diagnóstico**: Acesse as ferramentas de diagnóstico ASP em `/asp-tools/check-backend.asp` ou `/asp-tools/start-backend.asp` se precisar reiniciar o backend pelo painel IIS.

---

## Credenciais Seed (Contingência / Desenvolvimento Local)

| Perfil | E-mail / Usuário | Senha |
|---|---|---|
| Admin BM-6 | `admin@cbmam.am.gov.br` | `admin123` |
| Analista | `analista@cbmam.am.gov.br` | `analista123` |
| Usuário | `usuario@cbmam.am.gov.br` | `usuario123` |

> *Nota*: O login por CPF consulta a API do DRH/SIGDP em tempo real. Se o militar for autenticado com sucesso, a conta é provisionada/sincronizada automaticamente no banco MySQL do Plesk.
