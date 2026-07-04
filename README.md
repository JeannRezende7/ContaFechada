# Contas — SaaS de gestão financeira (anti-planilhas)

Scaffold do MVP: React + Vite + Firebase (Auth + Firestore) + Tailwind, mobile-first
e adaptável para desktop/Windows. Segue a espec de escopo enviada, com foco na
Fase 1 sugerida no documento: autenticação Google, roteamento por `/:tenantSlug`
e painel de indicadores simples.

## Stack

- **React 18 + Vite** — front-end SPA
- **React Router v6** — rotas, incluindo o slug dinâmico do tenant
- **Firebase Auth** (Google OAuth) + **Firestore** — dados multitenant
- **Tailwind CSS** — estilização, com tokens de design próprios (ver abaixo)

## Como rodar

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Firebase
npm run dev
```

No Firebase Console: ative **Authentication > Google** como provedor, crie um
banco **Firestore** e publique as regras de `firestore.rules` (Firestore >
Regras, ou via `firebase deploy --only firestore:rules` se usar a CLI).

## Arquitetura de dados (multitenant)

Cada workspace é um documento em `/workspaces/{slug}`, com um mapa `members`
(`{ uid: { role, email } }`). Todos os recursos do tenant — lançamentos,
categorias, contas bancárias — vivem em subcoleções:

```
/workspaces/{slug}
  name, slug, ownerId, members, createdAt
  /lancamentos/{id}
  /categorias/{id}       (ainda não implementado)
  /contasBancarias/{id}  (ainda não implementado)
```

Isso garante isolamento de dados por workspace (REQ-02) tanto nas queries
(`src/firebase/firestore.js` centraliza o acesso scoped por slug) quanto nas
regras de segurança do Firestore.

## Estrutura de pastas

```
src/
  firebase/       config, auth e helpers genéricos de Firestore
  contexts/       AuthContext (usuário logado) e TenantContext (workspace atual)
  routes/         árvore de rotas e guarda de rota protegida
  layouts/        AuthLayout (telas de login/onboarding) e WorkspaceLayout
                  (sidebar no desktop, bottom nav no mobile)
  components/
    layout/       Sidebar, BottomNav, Topbar
    ui/           componentes de UI genéricos (ComingSoonPage, etc.)
  features/       um módulo por domínio, cada um com pages/components/services
    auth/
    onboarding/   criação de workspace e geração de slug único
    dashboard/    painel de indicadores (REQ-05, fase 1)
    lancamentos/  CRUD de contas a pagar/receber (núcleo do MVP)
    categorias/         stub — fase 2
    contas-bancarias/   stub — fase 2
    relatorios/         stub — fase 2
    settings/           stub — fase 2
  utils/          slugify, formatCurrency
  constants/      roles.js (papéis e permissões — REQ-06)
```

Cada feature segue a mesma convenção: `pages/` (telas), `components/` (UI
local à feature) e `services/` (acesso a dados). Isso deixa claro onde entra
cada novo recurso das fases seguintes sem misturar responsabilidades.

## Sistema de papéis (REQ-06)

`src/constants/roles.js` define `admin`, `operador` e `visualizador`, com uma
tabela central de permissões (`can(role, action)`). O mesmo modelo é replicado
em `firestore.rules`, que é a fronteira de segurança real — os checks no
cliente são só para adaptar a UI (ex: esconder o botão de excluir).

## Identidade visual

- **Cores**: `ink` (azul-marinho profundo, texto e superfícies escuras),
  `paper` (branco frio, não creme), `ledger` (verde para saldo positivo/pago),
  `signal` (vermelho para atraso/negativo), `pending` (âmbar para agendado).
- **Tipografia**: Space Grotesk nos títulos, Inter no corpo, **IBM Plex Mono**
  em todo valor monetário — a classe utilitária `.money` (em `src/index.css`)
  aplica algarismos tabulares, para os valores alinharem como em um livro-
  caixa real. Esse é o elemento de assinatura do produto: a promessa
  "anti-planilha" não é abandonar a clareza de uma coluna de números
  alinhados, é manter essa clareza sem a fragilidade de uma planilha manual.

## O que falta para o MVP completo (conforme a seção "Fases" da espec)

- [ ] Convite de membros por e-mail (settings)
- [ ] Categorias/subcategorias e contas bancárias (CRUD real, hoje são stubs)
- [ ] Contas recorrentes/parceladas
- [ ] Extração de boletos/Pix
- [ ] Gráficos de fluxo de caixa e distribuição de gastos (Recharts já está
      instalado como dependência, pronto para uso)
- [ ] Anexo de comprovantes (upload)
- [ ] Histórico de auditoria (logs)
- [ ] Seletor de workspace para usuários com múltiplos tenants (hoje o login
      entra direto no primeiro workspace encontrado)
