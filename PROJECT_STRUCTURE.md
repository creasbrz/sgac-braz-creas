# 🗺️ Estrutura do Projeto SGAC-BRAZ

Este documento serve como guia de referência para a arquitetura do Sistema de Gestão e Acompanhamento de Casos (SGAC-BRAZ). Ele reflete o estado estável do sistema após a implementação da gestão inteligente e correções de banco de dados.

---

## 🔙 1. Backend (`backend/`)

Construído com **Fastify**, **TypeScript** e **Prisma**. Responsável pela API, regras de negócio e persistência de dados.

### 📂 `backend/prisma/` (Banco de Dados)
* **`schema.prisma`**: O "coração" do banco. Define as tabelas (`User`, `Case`, `Paf`, `Evolucao`, `Agendamento`) e seus relacionamentos.
    * *Alteração recente:* Uso de `deadline` (DateTime) em vez de `prazos` no PAF.
* **`seed.ts`**: Script de povoamento. Cria usuários padrão (Gerente, Agentes) e gera dados fictícios realistas para testes.

### 📂 `backend/src/lib/` (Configuração)
* **`prisma.ts`**: Instância única (Singleton) do cliente Prisma para conexão com o banco.

### 📂 `backend/src/routes/` (API Endpoints)
* **`server.ts`**: Ponto de entrada. Registra plugins (CORS, JWT) e todas as rotas abaixo.
* **`auth.ts`**: `/login`, `/register`, `/me`. Gerencia autenticação e tokens JWT.
* **`cases.ts`**: CRUD principal. Criação, listagem, detalhes, alteração de status e desligamento de casos.
* **`users.ts`**: Gestão de técnicos. Listagem de agentes/especialistas para selects e soft-delete de usuários.
* **`paf.ts`**: Gestão do Plano de Acompanhamento Familiar. Salva e edita o PAF (com data de validade).
* **`evolutions.ts`**: Histórico do caso. Traduz o campo `conteudo` (frontend) para `descricao` (banco).
* **`appointments.ts`**: Agenda. Cria agendamentos e busca compromissos por mês ou por caso.
* **`stats.ts`**: Dados para o Dashboard (contagens, gráficos de produtividade).
* **`reports.ts`**: Relatórios avançados (RMA e Visão de Equipe).
* **`alerts.ts`**: **Gestão Inteligente.** Busca PAFs próximos do vencimento para o painel de alertas.

---

## 🖥️ 2. Frontend (`frontend/`)

Construído com **React**, **Vite**, **TypeScript**, **Tailwind CSS** e **Shadcn/ui**.

### 📂 `frontend/` (Raiz de Configuração)
* **`vite.config.ts`**: Configuração do bundler e alias `@/`.
* **`tailwind.config.cjs`**: Tema visual (cores do GDF, animações).
* **`index.html`**: Entrada da aplicação web.

### 📂 `frontend/src/` (Código Fonte)
* **`main.tsx`**: Ponto de montagem React.
* **`App.tsx`**: Roteador principal. Define a navegação e protege rotas privadas.
* **`ProtectedRoute.tsx`**: Guarda de rotas. Verifica login e permissões de cargo (RBAC).

### 📂 `frontend/src/pages/` (Telas)
* **`Login.tsx`**: Tela de autenticação.
* **`Dashboard.tsx`**: Painel principal. Renderiza `ManagerDashboard` ou `TechnicianDashboard` dependendo do cargo.
* **`Cases.tsx`**: Lista de "Meus Casos Ativos".
* **`ClosedCases.tsx`**: Lista de "Casos Finalizados".
* **`CaseDetail.tsx`**: Visão completa de um caso (Ações, PAF, Histórico, Dados).
* **`Agenda.tsx`**: Calendário interativo de compromissos.
* **`UserManagement.tsx`**: (Gerente) Adicionar/Editar/Remover usuários.
* **`TeamOverview.tsx`**: (Gerente) Visão geral da carga de trabalho da equipe.
* **`Reports.tsx`**: (Gerente) Gráficos gerenciais e gerador de RMA.
* **`NotFound.tsx`**: Página de erro 404 customizada.

### 📂 `frontend/src/components/` (Blocos de Construção)

#### 📁 `layout/`
* `MainLayout.tsx`: Estrutura base (Sidebar + Header + Conteúdo).
* `Sidebar.tsx`: Menu lateral desktop.
* `MobileSidebar.tsx`: Menu lateral mobile (Sheet).
* `Header.tsx`: Barra superior (User info, Theme toggle).
* `GdfLogo.tsx`: Logotipo SVG.

#### 📁 `case/` (Componentes de Detalhe do Caso)
* `CaseActions.tsx`: Botões de ação (Mudar status, Desligar, Atribuir).
* `PafSection.tsx`: Visualização e Formulário de edição do PAF.
* `EvolutionsSection.tsx`: Lista e formulário de histórico/evolução.
* `DetailField.tsx` & `DetailSkeleton.tsx`: Exibição de dados e loading state.

#### 📁 `dashboard/`
* `UpcomingPafDeadlines.tsx`: Card de alertas de prazos vencendo.

#### 📁 `modals/`
* `NewCaseModal.tsx`: Modal global de criação de caso.
* `NewAppointmentModal.tsx`: Modal de agendamento.
* `CloseCaseModal.tsx`: Formulário de desligamento (Motivo/Parecer).
* `AssignSpecialistModal.tsx`: Atribuição de técnico PAEFI.

#### 📄 Arquivos Soltos (Reutilizáveis)
* `CaseTable.tsx`: Tabela poderosa com busca, paginação e filtros.
* `CaseForm.tsx`: O formulário principal de cadastro (usado no modal).
* `UpcomingAppointments.tsx`: Card de próximos compromissos.
* `RmaReport.tsx`: Gerador de relatório RMA.
* `Pagination.tsx` & `CaseStatusBadge.tsx`: Utilitários de UI.
* `ThemeToggle.tsx` & `theme-provider.tsx`: Sistema Dark/Light mode.

### 📂 `frontend/src/hooks/`
* `useAuth.ts` & `useModal.ts`: Acesso aos contextos globais.
* `useDebounce.ts`: Otimização de performance para busca.
* `api/useCaseQueries.ts`: Centraliza chamadas ao React Query (cache).

### 📂 `frontend/src/contexts/`
* `AuthContext.tsx`: Gerencia token, usuário logado e login/logout.
* `ModalContext.tsx`: Controla a abertura do modal de "Novo Caso" globalmente.

### 📂 `frontend/src/lib/`
* `api.ts`: Instância do Axios com interceptors (token automático).
* `react-query.ts`: Configuração de cache e refetching.
* `utils.ts`: Helper `cn` para classes CSS condicionais.

### 📂 `frontend/src/utils/`
* `formatters.ts`: Formatação de CPF, Telefone e Datas (seguro contra fuso horário).
* `error.ts`: Tratamento padronizado de mensagens de erro.

### 📂 `frontend/src/constants/`
* `routes.ts`: Mapa de todas as URLs do sistema.
* `navigation.ts`: Configuração do menu lateral.
* `caseConstants.ts`: Cores e textos dos status.
* `caseTransitions.ts`: Regras de negócio (quem pode clicar em qual botão).
* `storage.ts`: Chaves do LocalStorage.

### 📂 `frontend/src/schemas/`
* `caseSchemas.ts`: Validação Zod para formulários de Caso, PAF e Evolução.
* `userSchemas.ts`: Validação Zod para gestão de usuários.

### 📂 `frontend/src/types/`
* `case.ts`: Tipagem TypeScript para Casos, PAFs e Evoluções.
* `user.ts`: Tipagem de Usuários e Cargos.
* `agenda.ts`: Tipagem de Agendamentos.