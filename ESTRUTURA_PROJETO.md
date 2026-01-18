# Estrutura do Projeto

> Gerado em: 17/01/2026, 10:21:35

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
│   │   │   ├── 20260112145440_init_v9_full_fix
│   │   │   │   └── migration.sql
│   │   │   ├── 20260115162752_update_rma
│   │   │   │   └── migration.sql
│   │   │   ├── 20260116194337_add_renda_ocupacao_case
│   │   │   │   └── migration.sql
│   │   │   └── migration_lock.toml
│   │   ├── schema.prisma
│   │   ├── seed-users.ts
│   │   └── seed.ts
│   ├── scripts
│   │   └── backup.ts
│   ├── src
│   │   ├── lib
│   │   │   ├── cache.ts
│   │   │   ├── errorHandler.ts
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
│   │   │   ├── rma.ts
│   │   │   ├── stats.ts
│   │   │   ├── users.ts
│   │   │   ├── waitingList.ts
│   │   │   └── workspace.ts
│   │   ├── schemas
│   │   │   └── caseSchema.ts
│   │   ├── services
│   │   │   ├── AlertService.ts
│   │   │   ├── AnalyticsAI.ts
│   │   │   ├── AppointmentService.ts
│   │   │   ├── AttachmentService.ts
│   │   │   ├── AuditService.ts
│   │   │   ├── AuthService.ts
│   │   │   ├── CaseService.ts
│   │   │   ├── DeliverableService.ts
│   │   │   ├── EvolutionService.ts
│   │   │   ├── ExportService.ts
│   │   │   ├── FamilyService.ts
│   │   │   ├── GroupService.ts
│   │   │   ├── ImportService.ts
│   │   │   ├── PafService.ts
│   │   │   ├── ReferralService.ts
│   │   │   ├── ReportService.ts
│   │   │   ├── RMAService.ts
│   │   │   ├── StatsService.ts
│   │   │   ├── UserService.ts
│   │   │   ├── WaitingListService.ts
│   │   │   └── WorkspaceService.ts
│   │   ├── utils
│   │   │   └── geocoding.ts
│   │   └── server.ts
│   ├── uploads
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── tsup.config.ts
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
│   │   │   │   ├── calendar-custom.css
│   │   │   │   ├── FullCalendarWidget.tsx
│   │   │   │   └── UpcomingAppointments.tsx
│   │   │   ├── analytics
│   │   │   │   ├── sections
│   │   │   │   │   ├── NetworkSection.tsx
│   │   │   │   │   ├── OverviewSection.tsx
│   │   │   │   │   ├── PerformanceSection.tsx
│   │   │   │   │   ├── SocialSection.tsx
│   │   │   │   │   └── TerritorySection.tsx
│   │   │   │   └── TerritoryMap.tsx
│   │   │   ├── case
│   │   │   │   ├── tabs
│   │   │   │   │   ├── AppointmentsTab.tsx
│   │   │   │   │   ├── AttachmentsTab.tsx
│   │   │   │   │   ├── DeliverablesTab.tsx
│   │   │   │   │   ├── FamilyTab.tsx
│   │   │   │   │   ├── HistoryTab.tsx
│   │   │   │   │   ├── OverviewTab.tsx
│   │   │   │   │   ├── PafTab.tsx
│   │   │   │   │   └── ReferralsTab.tsx
│   │   │   │   ├── CaseActions.tsx
│   │   │   │   ├── CaseAddressCard.tsx
│   │   │   │   ├── CaseContactList.tsx
│   │   │   │   ├── CaseEvolutions.tsx
│   │   │   │   ├── CaseFilters.tsx
│   │   │   │   ├── CaseForm.tsx
│   │   │   │   ├── CaseKanban.tsx
│   │   │   │   ├── CaseStatusBadge.tsx
│   │   │   │   ├── CaseTable.tsx
│   │   │   │   ├── CaseWorkflow.tsx
│   │   │   │   ├── DetailField.tsx
│   │   │   │   └── DetailSkeleton.tsx
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
│   │   │   │   ├── NewCaseModal.tsx
│   │   │   │   └── PafHistoryModal.tsx
│   │   │   ├── settings
│   │   │   │   ├── ChangePasswordDialog.tsx
│   │   │   │   └── NewUserDialog.tsx
│   │   │   ├── ui
│   │   │   │   ├── accordion.tsx
│   │   │   │   ├── alert-dialog.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── breadcrumb.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── chart.tsx
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
│   │   │   ├── cases
│   │   │   │   ├── definitions.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── styles.ts
│   │   │   │   └── transitions.ts
│   │   │   ├── app-navigation.ts
│   │   │   ├── app-routes.ts
│   │   │   ├── locations.ts
│   │   │   ├── options.ts
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
│   │   │   ├── rma.ts
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
├── .gitignore
├── backend_complete.txt
├── frontend_01_core.txt
├── frontend_02_ui_base.txt
├── frontend_03_features.txt
├── frontend_04_pages.txt
├── gerar_txt_pastas.js
├── package.json
├── PROJECT_STRUCTURE.md
├── README-DEPLOY.md
├── README.md
└── render.yaml
```
