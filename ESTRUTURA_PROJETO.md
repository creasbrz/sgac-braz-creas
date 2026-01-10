# Estrutura do Projeto

> Gerado em: 10/01/2026, 11:25:57

Esta é a estrutura de diretórios do projeto, ignorando pastas de dependências (node_modules) e build.

```text
root
├── .github
│   └── copilot-instructions.md
├── backend
│   ├── prisma
│   │   ├── migration-scripts
│   │   │   └── backfill-paefi-dates.ts
│   │   ├── migrations
│   │   │   ├── 20260109015241_init_final
│   │   │   │   └── migration.sql
│   │   │   ├── 20260109025205_add_tipo_agendamento
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── scripts
│   │   └── backup.ts
│   ├── src
│   │   ├── lib
│   │   │   ├── cache.ts
│   │   │   └── prisma.ts
│   │   ├── routes
│   │   │   ├── alerts.ts
│   │   │   ├── appointments.ts
│   │   │   ├── attachments.ts
│   │   │   ├── audit.ts
│   │   │   ├── auth.ts
│   │   │   ├── cases.ts
│   │   │   ├── deliverables.ts
│   │   │   ├── evolutions.ts
│   │   │   ├── family.ts
│   │   │   ├── filters.ts
│   │   │   ├── groups.ts
│   │   │   ├── import.ts
│   │   │   ├── paf.ts
│   │   │   ├── referrals.ts
│   │   │   ├── reports.ts
│   │   │   ├── stats.ts
│   │   │   ├── users.ts
│   │   │   ├── waitingList.ts
│   │   │   └── workspace.ts
│   │   ├── services
│   │   │   └── AnalyticsAI.ts
│   │   └── server.ts
│   ├── uploads
│   │   ├── 1764179328989-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764182484968-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764183756612-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764183937666-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764184076301-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764184735799-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764184853469-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764184993208-Lucid_Origin_A_conceptual_photograph_of_a_lone_human_silhouett_3.jpg
│   │   ├── 1764185117855-Lucid_Origin_Cinematic_shot_of_a_marble_statue_of_Marcus_Aurel_1.jpg
│   │   ├── 1764185151714-Lucid_Origin_Cinematic_shot_of_a_marble_statue_of_Marcus_Aurel_1.jpg
│   │   ├── 1764782299280-SEI_147064112_Despacho.pdf
│   │   └── 79a21aab-7a88-4d39-9241-ff91a3d276d3.pdf
│   ├── .env
│   ├── .gitignore
│   └── package.json
├── frontend
│   ├── public
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-96x96.png
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── site.webmanifest
│   │   ├── vite.svg
│   │   ├── web-app-manifest-192x192.png
│   │   └── web-app-manifest-512x512.png
│   ├── src
│   │   ├── assets
│   │   │   └── react.svg
│   │   ├── components
│   │   │   ├── agenda
│   │   │   │   ├── AppointmentCard.tsx
│   │   │   │   ├── calendar-custom.css
│   │   │   │   ├── FullCalendarWidget.tsx
│   │   │   │   └── UpcomingAppointments.tsx
│   │   │   ├── analytics
│   │   │   │   └── TerritoryMap.tsx
│   │   │   ├── case
│   │   │   │   ├── tabs
│   │   │   │   │   ├── DeliverablesTab.tsx
│   │   │   │   │   ├── FamilyTab.tsx
│   │   │   │   │   ├── OverviewTab.tsx
│   │   │   │   │   └── ReferralsTab.tsx
│   │   │   │   ├── CaseActions.tsx
│   │   │   │   ├── CaseAttachments.tsx
│   │   │   │   ├── CaseEvolutions.tsx
│   │   │   │   ├── CaseFilters.tsx
│   │   │   │   ├── CaseForm.tsx
│   │   │   │   ├── CaseHistory.tsx
│   │   │   │   ├── CaseKanban.tsx
│   │   │   │   ├── CaseStatusBadge.tsx
│   │   │   │   ├── CaseTable.tsx
│   │   │   │   ├── DetailField.tsx
│   │   │   │   ├── DetailSkeleton.tsx
│   │   │   │   ├── EvolutionsSection.tsx
│   │   │   │   ├── PafHistoryModal.tsx
│   │   │   │   └── PafSection.tsx
│   │   │   ├── common
│   │   │   │   ├── CommandMenu.tsx
│   │   │   │   ├── DataTableFilters.tsx
│   │   │   │   ├── Pagination.tsx
│   │   │   │   ├── SavedFilters.tsx
│   │   │   │   ├── theme-provider.tsx
│   │   │   │   ├── ThemeToggle.tsx
│   │   │   │   └── WhatsAppButton.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── DashboardStatCard.tsx
│   │   │   │   ├── RecentActivityFeed.tsx
│   │   │   │   ├── SmartInsightsCard.tsx
│   │   │   │   └── UpcomingPafDeadlines.tsx
│   │   │   ├── layout
│   │   │   │   ├── GdfLogo.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   ├── MobileSidebar.tsx
│   │   │   │   ├── NotificationBell.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   ├── modals
│   │   │   │   ├── AssignSpecialistModal.tsx
│   │   │   │   ├── CloseCaseModal.tsx
│   │   │   │   ├── CreateGroupModal.tsx
│   │   │   │   ├── GroupDetailsModal.tsx
│   │   │   │   ├── ImportCasesModal.tsx
│   │   │   │   ├── NewAppointmentModal.tsx
│   │   │   │   └── NewCaseModal.tsx
│   │   │   ├── settings
│   │   │   │   ├── ChangePasswordDialog.tsx
│   │   │   │   └── NewUserDialog.tsx
│   │   │   ├── ui
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── alert-dialog.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── command.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── error-boundary.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── masked-input.tsx
│   │   │   │   ├── pagination.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── sonner.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   └── ui.zip
│   │   │   └── workspace
│   │   │       └── SharedComponents.tsx
│   │   ├── constants
│   │   │   ├── caseConstants.ts
│   │   │   ├── caseStatus.ts
│   │   │   ├── caseTransitions.ts
│   │   │   ├── navigation.ts
│   │   │   ├── options.ts
│   │   │   ├── routes.ts
│   │   │   └── storage.ts
│   │   ├── contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ModalContext.tsx
│   │   │   ├── PrivacyContext.tsx
│   │   │   └── SidebarContext.tsx
│   │   ├── hooks
│   │   │   ├── api
│   │   │   │   └── useCaseQueries.ts
│   │   │   ├── useAppointments.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useModal.ts
│   │   ├── lib
│   │   │   ├── api.ts
│   │   │   ├── react-query.ts
│   │   │   └── utils.ts
│   │   ├── pages
│   │   │   ├── dashboard
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── ManagerDashboard.tsx
│   │   │   │   ├── SocialAgentDashboard.tsx
│   │   │   │   └── TechnicianDashboard.tsx
│   │   │   ├── reports
│   │   │   │   ├── DismissalAnalytics.tsx
│   │   │   │   ├── ObservatoryTab.tsx
│   │   │   │   ├── Reports.tsx
│   │   │   │   ├── RmaTab.tsx
│   │   │   │   └── TeamProductionTab.tsx
│   │   │   ├── workspace
│   │   │   │   ├── ManagerWorkspace.tsx
│   │   │   │   ├── SocialAgentWorkspace.tsx
│   │   │   │   ├── TechnicianWorkspace.tsx
│   │   │   │   └── Workspace.tsx
│   │   │   ├── AdvancedAnalytics.tsx
│   │   │   ├── Agenda.tsx
│   │   │   ├── CaseDetail.tsx
│   │   │   ├── Cases.tsx
│   │   │   ├── ClosedCases.tsx
│   │   │   ├── GlobalAudit.tsx
│   │   │   ├── GroupManagement.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── NotFound.tsx
│   │   │   ├── TeamOverview.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── WaitingList.tsx
│   │   ├── schemas
│   │   │   ├── caseSchemas.ts
│   │   │   └── userSchemas.ts
│   │   ├── styles
│   │   │   └── index.css
│   │   ├── types
│   │   │   ├── agenda.ts
│   │   │   ├── case.ts
│   │   │   ├── group.ts
│   │   │   ├── pdfmake.d.ts
│   │   │   ├── user.ts
│   │   │   └── workspace.ts
│   │   ├── utils
│   │   │   ├── date.ts
│   │   │   ├── error.ts
│   │   │   ├── formatters.ts
│   │   │   ├── pdfGenerator.ts
│   │   │   ├── phone.ts
│   │   │   └── whatsapp.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── vite-env.d.ts
│   ├── .env.local
│   ├── .gitignore
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.cjs
│   ├── README.md
│   ├── tailwind.config.cjs
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── backend_complete.txt
├── frontend_01_core.txt
├── frontend_02_components.txt
├── frontend_03_pages.txt
├── gerar_txt_pastas.js
├── package.json
├── PROJECT_STRUCTURE.md
├── README-DEPLOY.md
└── README.md
```
