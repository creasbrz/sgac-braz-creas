const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO DE PACOTES (BUNDLES) =================
// Aqui definimos EXATAMENTE quais arquivos queremos gerar.
// O script vai pegar tudo que estiver nas listas e juntar em um único txt.

const BUNDLES = {
  // ARQUIVO 1: O "Coração" do Frontend (Configs, Hooks, Utils, Contexts, Types)
  'frontend_01_core': [
    'frontend/package.json',
    'frontend/vite.config.ts',
    'frontend/tsconfig.json',
    'frontend/src/main.tsx',
    'frontend/src/App.tsx',
    'frontend/src/lib',
    'frontend/src/utils',
    'frontend/src/hooks',
    'frontend/src/contexts',
    'frontend/src/types',
    'frontend/src/constants',
    'frontend/src/styles',
    'frontend/src/services'
  ],

  // ARQUIVO 2: Interface Visual e Componentes Reutilizáveis
  'frontend_02_components': [
    'frontend/src/components'
  ],

  // ARQUIVO 3: Páginas e Rotas (Onde a lógica de negócio acontece)
  'frontend_03_pages': [
    'frontend/src/pages',
    'frontend/src/routes', // Se houver pasta de rotas separada
    'frontend/src/layouts' // Se layouts estiver fora de components
  ],

  // ARQUIVO 4: Backend Completo (Geralmente cabe num só se não for microsserviço)
  'backend_complete': [
    'backend'
  ]
};

// ================= CONFIGURAÇÃO GERAL =================
const ignoredFolders = [
  'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 
  'coverage', 'venv', '__pycache__', 'tmp', 'temp', '.next'
];

const ignoredFiles = [
  'package-lock.json', 'yarn.lock', 'composer.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'thumbs.db', '.env', 'gerar_txt.js'
];

const allowedExtensions = [
  '.js', '.jsx', '.ts', '.tsx', 
  '.html', '.css', '.scss', 
  '.json', '.sql', '.prisma',
  '.md', '.env.example'
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
        // Não vamos descer recursivamente na árvore visual para economizar tokens, 
        // apenas o primeiro nível já dá contexto suficiente.
    });
    return tree;
}

function getAllFilesRecursively(targetPath, arrayOfFiles = []) {
    if (!fs.existsSync(targetPath)) return arrayOfFiles;
    
    const stat = fs.statSync(targetPath);
    
    // Se for arquivo, adiciona direto
    if (!stat.isDirectory()) {
        if (!ignoredFiles.includes(path.basename(targetPath)) && allowedExtensions.includes(path.extname(targetPath))) {
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
        // Caminho relativo mais limpo para a IA ler
        const relativePath = filePath.replace(path.join(__dirname, '/'), '');
        return `\n==================================================================\nFILE: ${relativePath}\n==================================================================\n${fileContent}\n`;
    } catch (err) { return ''; }
}

function run() {
    console.log('🚀 Iniciando geração agrupada (Modo Compacto)...\n');

    // Gera árvore visual da raiz para contexto global
    const rootTree = `ESTRUTURA GERAL (Frontend):\n${getProjectTree(path.join(__dirname, 'frontend'))}\nESTRUTURA GERAL (Backend):\n${getProjectTree(path.join(__dirname, 'backend'))}\n`;

    Object.entries(BUNDLES).forEach(([bundleName, pathsToInclude]) => {
        let content = `CONTEXTO: ${bundleName}\n\n${rootTree}\n\n`;
        let fileCount = 0;

        pathsToInclude.forEach(relativePath => {
            const absolutePath = path.join(__dirname, relativePath);
            
            // Pega todos os arquivos (seja um arquivo solto ou uma pasta inteira)
            const files = getAllFilesRecursively(absolutePath);
            
            files.forEach(file => {
                content += buildFileBlock(__dirname, file);
                fileCount++;
            });
        });

        if (fileCount > 0) {
            fs.writeFileSync(`${bundleName}.txt`, content);
            console.log(`📦 [${bundleName}.txt] - ${fileCount} arquivos incluídos.`);
        } else {
            console.log(`⚠️  [${bundleName}] ignorado (nenhum arquivo encontrado nos caminhos definidos).`);
        }
    });

    console.log('\n✅ Concluído! Agora você tem poucos arquivos para enviar.');
}

run();