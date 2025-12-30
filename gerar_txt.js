const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO GERAL =================
const ignoredFolders = [
  'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 
  'coverage', 'venv', '__pycache__', 'tmp', 'temp'
];

const ignoredFiles = [
  'package-lock.json', 'yarn.lock', 'composer.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'thumbs.db', '.env', 'gerar_txt.js'
];

const allowedExtensions = [
  '.js', '.jsx', '.ts', '.tsx', 
  '.html', '.css', '.scss', 
  '.json', '.sql', '.prisma', // Adicionei .prisma para sua stack
  '.md', '.env.example'
];

// ================= CONFIGURAÇÃO DE PASTAS =================
// 🚨 EDITE AQUI SE OS NOMES DAS SUAS PASTAS FOREM DIFERENTES
const config = {
  backend: {
    folderName: 'backend', // Nome da pasta do backend (ex: 'server', 'api')
    outputFile: 'projeto_creas_backend.txt',
    title: 'BACKEND - NODE.JS/FASTIFY/PRISMA'
  },
  frontend: {
    folderName: 'frontend', // Nome da pasta do frontend (ex: 'client', 'web')
    outputFile: 'projeto_creas_frontend.txt',
    title: 'FRONTEND - REACT/VITE/SHADCN'
  }
};
// ==========================================================

/**
 * Função auxiliar para gerar a árvore de diretórios visualmente
 */
function generateTree(dirPath, prefix = '') {
  let treeString = '';
  
  if (!fs.existsSync(dirPath)) return 'Pasta não encontrada.';

  const items = fs.readdirSync(dirPath);

  const filteredItems = items.filter(item => {
    const fullPath = path.join(dirPath, item);
    let isDirectory = false;
    try { isDirectory = fs.statSync(fullPath).isDirectory(); } catch(e) { return false; }

    if (isDirectory) return !ignoredFolders.includes(item);
    
    // Filtra arquivos de saída para não ler o próprio relatório
    if (item === config.backend.outputFile || item === config.frontend.outputFile) return false;
    
    return !ignoredFiles.includes(item) && allowedExtensions.includes(path.extname(item));
  });

  filteredItems.forEach((item, index) => {
    const isLast = index === filteredItems.length - 1;
    const marker = isLast ? '└── ' : '├── ';
    const fullPath = path.join(dirPath, item);
    
    let isDirectory = false;
    try { isDirectory = fs.statSync(fullPath).isDirectory(); } catch(e) {}

    treeString += `${prefix}${marker}${item}\n`;

    if (isDirectory) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      treeString += generateTree(fullPath, newPrefix);
    }
  });

  return treeString;
}

/**
 * Função recursiva para pegar todos os caminhos de arquivos
 */
function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    let stat;
    try { stat = fs.statSync(fullPath); } catch (e) { return; }

    if (stat.isDirectory()) {
      if (!ignoredFolders.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Ignora os arquivos de saída gerados
      if (file === config.backend.outputFile || file === config.frontend.outputFile) return;

      if (allowedExtensions.includes(path.extname(file)) && !ignoredFiles.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

/**
 * Processa uma pasta específica e gera um relatório
 */
function createReport(targetConfig) {
  const targetPath = path.join(__dirname, targetConfig.folderName);
  
  console.log(`\n--- Processando: ${targetConfig.title} ---`);
  
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ ERRO: A pasta '${targetConfig.folderName}' não foi encontrada na raiz.`);
    console.error(`   Verifique a variável 'config' no início do script.`);
    return;
  }

  // 1. Gera a árvore visual
  const projectTree = generateTree(targetPath);
  
  // 2. Coleta os arquivos
  const allFiles = getAllFiles(targetPath);
  
  let fullContent = '';

  // Cabeçalho
  fullContent += `RELATÓRIO DE CÓDIGO - ${targetConfig.title}\n`;
  fullContent += `Gerado em: ${new Date().toLocaleString()}\n`;
  fullContent += `Pasta Alvo: /${targetConfig.folderName}\n`;
  fullContent += `Total de arquivos: ${allFiles.length}\n`;
  fullContent += `\nESTRUTURA DE PASTAS:\n`;
  fullContent += `${targetConfig.folderName}\n${projectTree}`;
  fullContent += `\n\n==================================================================\n\n`;

  console.log(`📂 Estrutura mapeada. Encontrados ${allFiles.length} arquivos.`);

  // 3. Lê e concatena
  allFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Mostra o caminho relativo a partir da pasta alvo (ex: src/index.js) e não do root
      const relativePath = path.relative(path.join(__dirname, targetConfig.folderName), filePath);
      const fileSize = fs.statSync(filePath).size;
      
      fullContent += `\n==================================================================\n`;
      fullContent += `FILE: ${relativePath}\n`;
      fullContent += `SIZE: ${fileSize} bytes\n`;
      fullContent += `==================================================================\n`;
      fullContent += content;
      fullContent += `\n\n=== END OF FILE: ${relativePath} ===\n`;
      
    } catch (err) {
      console.error(`Erro ao ler ${filePath}:`, err.message);
    }
  });

  fs.writeFileSync(targetConfig.outputFile, fullContent);
  console.log(`✅ Sucesso! Arquivo criado: '${targetConfig.outputFile}'`);
}

function run() {
  console.log('Iniciando geração de relatórios separados...');
  
  // Gera relatório do Backend
  createReport(config.backend);
  
  // Gera relatório do Frontend
  createReport(config.frontend);
  
  console.log('\nProcesso finalizado.');
}

run();