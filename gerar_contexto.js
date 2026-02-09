const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO DOS GRUPOS (BUNDLES) =================
const BUNDLES = {
  // --- BACKEND (4 Arquivos) ---
  'backend_01_controllers': ['backend/src/controllers'],
  'backend_02_services':    ['backend/src/services'],
  'backend_03_routes':      ['backend/src/routes'],
  'backend_04_restante': [
    'backend/prisma',      // Vai pegar schema.prisma e seeds, ignorando migrations (ver abaixo)
    'backend/scripts',
    'backend/src/lib',
    'backend/src/schemas',
    'backend/src/utils',
    'backend/src/server.ts',
    'backend/package.json',
    'backend/tsconfig.json'
  ],

  // --- FRONTEND (6 Arquivos) ---

  // 1. UI Base: Fundação (Config, Hooks, UI Kit, Utils)
  '1_frontend_ui_base': [
    'frontend/src/components/ui',
    'frontend/src/components/common',
    'frontend/src/contexts',
    'frontend/src/hooks',
    'frontend/src/lib',
    'frontend/src/types',
    'frontend/src/utils',
    'frontend/src/styles',
    'frontend/src/constants',
    'frontend/src/schemas',
    'frontend/vite.config.ts',
    'frontend/tailwind.config.cjs',
    'frontend/tsconfig.json',
    'frontend/package.json'
  ],

  // 2. Features 01: Analytics e Visualização
  '2_frontend_features_01': [
    'frontend/src/components/analytics',
    'frontend/src/components/dashboard',
    'frontend/src/components/layout'
  ],

  // 3. Features 02: Gestão de Casos (Módulo denso)
  '3_frontend_features_02': [
    'frontend/src/components/case'
  ],

  // 4. Features 03: Funcionalidades de Apoio
  '4_frontend_features_03': [
    'frontend/src/components/agenda',
    'frontend/src/components/modals',
    'frontend/src/components/reports',
    'frontend/src/components/settings',
    'frontend/src/components/workspace'
  ],

  // 5. Pages 01: Dashboards e Áreas de Trabalho
  '5_frontend_pages_01': [
    'frontend/src/pages/dashboard',
    'frontend/src/pages/workspace'
  ],

  // 6. Pages 02: Navegação e Telas Gerais
  '6_frontend_pages_02': [
    'frontend/src/pages/reports',
    'frontend/src/pages/Cases.tsx',
    'frontend/src/pages/CaseDetail.tsx',
    'frontend/src/pages/Login.tsx',
    'frontend/src/pages/WaitingList.tsx',
    'frontend/src/pages/UserManagement.tsx',
    'frontend/src/pages/GroupManagement.tsx',
    'frontend/src/pages/Agenda.tsx',
    'frontend/src/App.tsx',
    'frontend/src/main.tsx',
    'frontend/src/ProtectedRoute.tsx'
  ]
};

// ================= CONFIGURAÇÕES DE FILTRO =================
const ignoredFolders = [
  'node_modules', 
  '.git', 
  '.vscode', 
  'dist', 
  'build', 
  'coverage', 
  'uploads', 
  '.next', 
  'migration-scripts',
  'migrations' // <--- ADICIONADO: Ignora a pasta de migrações do Prisma
];

const ignoredFiles = [
  'package-lock.json', 
  'yarn.lock', 
  '.DS_Store', 
  '.env', 
  '.env.local',
  'gerar_txt_pastas.js', 
  'README.md', 
  'README-DEPLOY.md', 
  'PROJECT_STRUCTURE.md', 
  'migration_lock.toml', 
  'pnpm-lock.yaml'
];

const allowedExtensions = [
  '.js', '.jsx', '.ts', '.tsx', 
  '.css', '.scss', 
  '.prisma', '.sql', '.json'
];

// ================= LÓGICA DE EXECUÇÃO =================

function getAllFilesRecursively(targetPath, arrayOfFiles = []) {
    if (!fs.existsSync(targetPath)) return arrayOfFiles;

    const stat = fs.statSync(targetPath);

    // Se for arquivo
    if (!stat.isDirectory()) {
        const filename = path.basename(targetPath);
        const ext = path.extname(targetPath);
        if (!ignoredFiles.includes(filename) && allowedExtensions.includes(ext)) {
            arrayOfFiles.push(targetPath);
        }
        return arrayOfFiles;
    }

    // Se for diretório
    const files = fs.readdirSync(targetPath);
    files.forEach(file => {
        const fullPath = path.join(targetPath, file);
        if (ignoredFolders.includes(file)) return; // Pula pastas ignoradas
        getAllFilesRecursively(fullPath, arrayOfFiles);
    });

    return arrayOfFiles;
}

function buildFileBlock(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(__dirname, filePath); 
        return `\nFILE: ${relativePath}\n${'-'.repeat(50)}\n${content}\n`;
    } catch (err) {
        console.error(`Erro ao ler arquivo: ${filePath}`);
        return ''; 
    }
}

function run() {
    console.log('🚀 Iniciando geração organizada (Backend: 4 | Frontend: 6)...');
    console.log('🚫 Ignorando pastas: migrations, node_modules, etc.\n');

    Object.entries(BUNDLES).forEach(([bundleName, pathsToInclude]) => {
        let content = `CONTEXTO: ${bundleName}\n\n`;
        let fileCount = 0;

        pathsToInclude.forEach(relativePath => {
            const absolutePath = path.resolve(__dirname, relativePath);
            
            if (fs.existsSync(absolutePath)) {
                const files = getAllFilesRecursively(absolutePath);
                files.forEach(file => {
                    content += buildFileBlock(file);
                    fileCount++;
                });
            }
        });

        if (fileCount > 0) {
            fs.writeFileSync(`${bundleName}.txt`, content);
            console.log(`   📦 [${bundleName}.txt] gerado com ${fileCount} arquivos.`);
        } else {
            console.log(`   ⚠️ [${bundleName}.txt] ficou vazio.`);
        }
    });

    console.log('\n✅ Processo concluído!');
}

run();