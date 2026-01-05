const fs = require('fs');
const path = require('path');

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

// ================= CONFIGURAÇÃO DE PROJETO =================
const config = {
  backend: {
    folderName: 'backend', 
    outputPrefix: 'backend', // Prefixo para o nome do arquivo
    title: 'BACKEND'
  },
  frontend: {
    folderName: 'frontend', 
    outputPrefix: 'frontend', 
    title: 'FRONTEND'
  }
};
// ==========================================================

// Gera a árvore visual de arquivos (útil para a IA se localizar)
function generateTree(dirPath, prefix = '') {
  let treeString = '';
  if (!fs.existsSync(dirPath)) return 'Pasta não encontrada.';

  const items = fs.readdirSync(dirPath);

  const filteredItems = items.filter(item => {
    const fullPath = path.join(dirPath, item);
    let isDirectory = false;
    try { isDirectory = fs.statSync(fullPath).isDirectory(); } catch(e) { return false; }
    if (isDirectory) return !ignoredFolders.includes(item);
    if (item.endsWith('.txt')) return false;
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

// Pega todos os arquivos recursivamente de uma pasta específica
function getAllFilesRecursively(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    let stat;
    try { stat = fs.statSync(fullPath); } catch (e) { return; }

    if (stat.isDirectory()) {
      if (!ignoredFolders.includes(file)) {
        arrayOfFiles = getAllFilesRecursively(fullPath, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.txt')) return;
      if (allowedExtensions.includes(path.extname(file)) && !ignoredFiles.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

// Escreve o conteúdo no disco
function writeReportFile(fileName, content) {
    // Se o conteúdo for apenas o cabeçalho, não cria o arquivo
    if (content.length < 500) return; 

    fs.writeFileSync(fileName, content);
    console.log(`   📄 Arquivo gerado: ${fileName} (${(content.length / 1024).toFixed(2)} KB)`);
}

/**
 * Processa o diretório criando um arquivo para a Raiz e um para cada subpasta direta
 */
function createFolderBasedReport(targetConfig) {
  const rootPath = path.join(__dirname, targetConfig.folderName);
  
  console.log(`\n--- Processando: ${targetConfig.title} ---`);
  
  if (!fs.existsSync(rootPath)) {
    console.error(`❌ ERRO: Pasta '${targetConfig.folderName}' não encontrada.`);
    return;
  }

  // 1. Gera a árvore completa do projeto para dar contexto em TODOS os arquivos
  const fullProjectTree = generateTree(rootPath);

  // 2. Lê os itens na raiz da pasta alvo
  const rootItems = fs.readdirSync(rootPath);

  // Separa o que é arquivo solto na raiz e o que é pasta
  const filesInRoot = [];
  const foldersInRoot = [];

  rootItems.forEach(item => {
    const fullPath = path.join(rootPath, item);
    if (ignoredFiles.includes(item) || ignoredFolders.includes(item)) return;

    let stat;
    try { stat = fs.statSync(fullPath); } catch (e) { return; }

    if (stat.isDirectory()) {
      foldersInRoot.push(item);
    } else {
      if (allowedExtensions.includes(path.extname(item))) {
        filesInRoot.push(fullPath);
      }
    }
  });

  // FUNÇÃO AUXILIAR PARA MONTAR O CONTEÚDO
  const buildContent = (fileList, subtitle) => {
    let content = `CONTEXTO DO PROJETO - ${targetConfig.title} - ${subtitle}\n`;
    content += `Gerado em: ${new Date().toLocaleString()}\n`;
    content += `\nESTRUTURA COMPLETA DO PROJETO (Para referência):\n${fullProjectTree}\n`;
    content += `\n==================================================================\n\n`;

    fileList.forEach(filePath => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(rootPath, filePath);
        
        content += `\n==================================================================\n`;
        content += `FILE: ${relativePath}\n`;
        content += `==================================================================\n`;
        content += fileContent;
        content += `\n\n`;
      } catch (err) {
        console.error(`Erro ao ler ${filePath}:`, err.message);
      }
    });
    return content;
  };

  // 3. Gera arquivo dos arquivos soltos na raiz (ex: package.json, tsconfig.json)
  if (filesInRoot.length > 0) {
    const content = buildContent(filesInRoot, 'ARQUIVOS RAIZ (Configs)');
    const outputName = `${targetConfig.outputPrefix}_00_root_files.txt`;
    writeReportFile(outputName, content);
  }

  // 4. Gera um arquivo para cada pasta de primeiro nível (ex: src, prisma, tests)
  foldersInRoot.forEach(folder => {
    const folderPath = path.join(rootPath, folder);
    const allFilesInFolder = getAllFilesRecursively(folderPath);

    if (allFilesInFolder.length > 0) {
      const content = buildContent(allFilesInFolder, `MÓDULO: ${folder.toUpperCase()}`);
      // Nome do arquivo ex: backend_src.txt
      const outputName = `${targetConfig.outputPrefix}_${folder}.txt`;
      writeReportFile(outputName, content);
    }
  });
}

function run() {
  console.log('Iniciando geração baseada em pastas...');
  createFolderBasedReport(config.backend);
  createFolderBasedReport(config.frontend);
  console.log('\nProcesso finalizado.');
}

run();