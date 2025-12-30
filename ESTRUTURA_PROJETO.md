# Estrutura do Projeto

> Gerado em: 29/12/2025, 18:56:19

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
│   │   │   ├── 20251124152204_init_db_sgac
│   │   │   │   └── migration.sql
│   │   │   ├── 20251124161643_adicionar_peso_urgencia
│   │   │   │   └── migration.sql
│   │   │   ├── 20251203001215_add_saved_filters
│   │   │   │   └── migration.sql
│   │   │   ├── 20251203185629_add_referrals
│   │   │   │   └── migration.sql
│   │   │   ├── 20251203204803_add_family_and_privacy
│   │   │   │   └── migration.sql
│   │   │   ├── 20251203205723_add_member_details
│   │   │   │   └── migration.sql
│   │   │   ├── 20251203212639_add_user_matricula
│   │   │   │   └── migration.sql
│   │   │   ├── 20251208214338_v4_2_0_deliverables
│   │   │   │   └── migration.sql
│   │   │   ├── 20251209150338_v4_3_0_groups
│   │   │   │   └── migration.sql
│   │   │   ├── 20251209171746_v4_3_1_activity_details
│   │   │   │   └── migration.sql
│   │   │   ├── 20251209184515_v4_4_0_waiting_list
│   │   │   │   └── migration.sql
│   │   │   ├── 20251212165206_add_specialized_reception
│   │   │   │   └── migration.sql
│   │   │   ├── 20251216162358_add_monitoring_status
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
│   │   │   └── users.ts
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
│   │   └── 1764782299280-SEI_147064112_Despacho.pdf
│   ├── .env
│   ├── .gitignore
│   └── package.json
├── frontend
│   ├── public
│   │   └── vite.svg
│   ├── src
│   │   ├── assets
│   │   │   └── react.svg
│   │   ├── components
│   │   │   ├── agenda
│   │   │   │   ├── AppointmentCard.tsx
│   │   │   │   ├── calendar-custom.css
│   │   │   │   └── FullCalendarWidget.tsx
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
│   │   │   │   ├── CaseHistory.tsx
│   │   │   │   ├── DetailField.tsx
│   │   │   │   ├── DetailSkeleton.tsx
│   │   │   │   ├── EvolutionsSection.tsx
│   │   │   │   ├── PafHistoryModal.tsx
│   │   │   │   └── PafSection.tsx
│   │   │   ├── common
│   │   │   │   └── WhatsAppButton.tsx
│   │   │   ├── dashboard
│   │   │   │   ├── DashboardStatCard.tsx
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
│   │   │   │   └── ImportCasesModal.tsx
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
│   │   │   │   ├── pagination.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── sonner.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   └── ui.zip
│   │   │   ├── CaseForm.tsx
│   │   │   ├── CaseKanban.tsx
│   │   │   ├── CaseStatusBadge.tsx
│   │   │   ├── CaseTable.tsx
│   │   │   ├── DataTableFilters.tsx
│   │   │   ├── NewAppointmentModal.tsx
│   │   │   ├── NewCaseModal.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── RmaReport.tsx
│   │   │   ├── SavedFilters.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── UpcomingAppointments.tsx
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
│   │   │   ├── AdvancedAnalytics.tsx
│   │   │   ├── Agenda.tsx
│   │   │   ├── CaseDetail.tsx
│   │   │   ├── Cases.tsx
│   │   │   ├── ClosedCases.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── GlobalAudit.tsx
│   │   │   ├── GroupManagement.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ManagerDashboard.tsx
│   │   │   ├── NotFound.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── SocialAgentDashboard.tsx
│   │   │   ├── TeamOverview.tsx
│   │   │   ├── TechnicianDashboard.tsx
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
│   │   │   └── user.ts
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
├── package.json
├── PROJECT_STRUCTURE.md
├── projeto_completo.txt
├── projeto_creas_backend.txt
├── projeto_creas_completo.txt
├── projeto_creas_frontend.txt
├── README-DEPLOY.md
└── README.md
```
