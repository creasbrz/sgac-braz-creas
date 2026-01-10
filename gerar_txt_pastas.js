const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO DE PACOTES (BUNDLES) =================
// Estratégia de 5 Arquivos para otimizar o Context Window da IA
const BUNDLES = {
  // 1. FUNDAMENTOS DO FRONTEND
  // Configurações, tipos globais, utilitários, hooks e contexto.
  'frontend_01_core': [
    'frontend/package.json',
    'frontend/vite.config.ts',
    'frontend/tsconfig.json',
    'frontend/tailwind.config.cjs',
    'frontend/src/main.tsx',
    'frontend/src/App.tsx',
    'frontend/src/vite-env.d.ts',
    'frontend/src/lib',
    'frontend/src/utils',
    'frontend/src/hooks',
    'frontend/src/contexts',
    'frontend/src/types',
    'frontend/src/constants',
    'frontend/src/schemas', // Schemas do Zod geralmente ficam aqui
    'frontend/src/styles'
  ],

  // 2. FRONTEND - UI LIBRARY & COMMON
  // Isolamos a 'ui' (Shadcn/Radix) e componentes comuns para não poluir a lógica de negócio.
  'frontend_02_ui_base': [
    'frontend/src/components/ui',     // Botões, inputs, cards genéricos
    'frontend/src/components/common'  // Componentes compartilhados (Header, Sidebar, etc)
  ],

  // 3. FRONTEND - COMPONENTES DE NEGÓCIO (FEATURES)
  // Onde a lógica visual complexa acontece (Agendas, Casos, Dashboards).
  'frontend_03_features': [
    'frontend/src/components/agenda',
    'frontend/src/components/analytics',
    'frontend/src/components/case',       // Pasta pesada
    'frontend/src/components/dashboard',
    'frontend/src/components/layout',
    'frontend/src/components/modals',
    'frontend/src/components/settings',
    'frontend/src/components/workspace'
  ],

  // 4. FRONTEND - PÁGINAS E ROTAS
  // A cola que une os componentes.
  'frontend_04_pages': [
    'frontend/src/pages',
    'frontend/src/routes',
    'frontend/src/ProtectedRoute.tsx'
  ],

  // 5. BACKEND COMPLETO
  // API, Banco de dados e Serviços.
  'backend_complete': [
    'backend'
  ]
};

// ================= CONFIGURAÇÃO GERAL =================
const ignoredFolders = [
  'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 
  'coverage', 'venv', '__pycache__', 'tmp', 'temp', '.next',
  'ui.zip', // Ignorando zip dentro de components/ui se houver
  'uploads' // Ignorando pasta de uploads do backend
];

const ignoredFiles = [
  'package-lock.json', 'yarn.lock', 'composer.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'thumbs.db', '.env', 'gerar_txt_pastas.js', 
  'README.md', 'README-DEPLOY.md', 'PROJECT_STRUCTURE.md',
  'migration_lock.toml'
];

const allowedExtensions = [
  '.js', '.jsx', '.ts', '.tsx', 
  '.css', '.scss', 
  '.json', '.prisma', '.sql',
  '.md' // Mantemos MD caso tenha doc interna importante, mas ignoramos os READMEs grandes acima
];
// ======================================================

function getProjectTree(dirPath) {
    if (!fs.existsSync(dirPath)) return '';
    let tree = '';
    const items = fs.readdirSync(dirPath);
    items.forEach((item, index) => {
        if (ignoredFolders.includes(item) || ignoredFiles.includes(item)) return;
        const isLast = index === items.length - 1;
        tree += `${isLast ? '└──' : '├──'} ${item}\n`;
    });
    return tree;
}

function getAllFilesRecursively(targetPath, arrayOfFiles = []) {
    if (!fs.existsSync(targetPath)) return arrayOfFiles;
    
    const stat = fs.statSync(targetPath);
    
    // Se for arquivo, adiciona direto
    if (!stat.isDirectory()) {
        const filename = path.basename(targetPath);
        const ext = path.extname(targetPath);
        
        if (!ignoredFiles.includes(filename) && allowedExtensions.includes(ext)) {
            arrayOfFiles.push(targetPath);
        }
        return arrayOfFiles;
    }

    // Se for diretório, varre
    const files = fs.readdirSync(targetPath);
    files.forEach(file => {
        const fullPath = path.join(targetPath, file);
        if (ignoredFolders.includes(file)) return;
        getAllFilesRecursively(fullPath, arrayOfFiles);
    });

    return arrayOfFiles;
}

function buildFileBlock(rootPath, filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Caminho relativo mais limpo
        const relativePath = filePath.replace(path.join(__dirname, '/'), '');
        return `\n==================================================================\nFILE: ${relativePath}\n==================================================================\n${fileContent}\n`;
    } catch (err) { return ''; }
}

function run() {
    console.log('🚀 Iniciando geração agrupada (5 Arquivos Otimizados)...\n');

    // Gera árvore visual da raiz para contexto global
    // Limitamos a profundidade visual para não gastar tokens à toa, focando nas pastas principais
    const rootTree = `ESTRUTURA GERAL (Frontend):\n${getProjectTree(path.join(__dirname, 'frontend'))}\nESTRUTURA GERAL (Backend):\n${getProjectTree(path.join(__dirname, 'backend'))}\n`;

    Object.entries(BUNDLES).forEach(([bundleName, pathsToInclude]) => {
        console.log(`... Processando ${bundleName}`);
        let content = `CONTEXTO: ${bundleName}\n\n${rootTree}\n\n`;
        let fileCount = 0;

        pathsToInclude.forEach(relativePath => {
            const absolutePath = path.join(__dirname, relativePath);
            const files = getAllFilesRecursively(absolutePath);
            
            files.forEach(file => {
                content += buildFileBlock(__dirname, file);
                fileCount++;
            });
        });

        if (fileCount > 0) {
            fs.writeFileSync(`${bundleName}.txt`, content);
            console.log(`   📦 Gerado: [${bundleName}.txt] com ${fileCount} arquivos.`);
        } else {
            console.log(`   ⚠️  Vazio: [${bundleName}] (caminhos não encontrados).`);
        }
    });

    console.log('\n✅ Concluído! Arquivos prontos para upload.');
}

run();