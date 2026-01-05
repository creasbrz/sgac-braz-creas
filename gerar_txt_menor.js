const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO GERAL =================
// Tamanho máximo aproximado por arquivo de texto (em bytes)
// 1024 * 1024 = 1MB (Ideal para Gemini, gera poucos arquivos)
// 500 * 1024 = 500KB (Gera mais arquivos, mais leves)
const MAX_FILE_SIZE = 1024 * 1024 * 1; // Aqui defini 2MB como limite, ajuste se quiser arquivos menores.

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

// ================= CONFIGURAÇÃO DE PASTAS =================
const config = {
  backend: {
    folderName: 'backend', 
    outputBaseName: 'projeto_creas_backend', // Removi a extensão .txt aqui
    title: 'BACKEND - NODE.JS/FASTIFY/PRISMA'
  },
  frontend: {
    folderName: 'frontend', 
    outputBaseName: 'projeto_creas_frontend', // Removi a extensão .txt aqui
    title: 'FRONTEND - REACT/VITE/SHADCN'
  }
};
// ==========================================================

function generateTree(dirPath, prefix = '') {
  let treeString = '';
  if (!fs.existsSync(dirPath)) return 'Pasta não encontrada.';

  const items = fs.readdirSync(dirPath);

  const filteredItems = items.filter(item => {
    const fullPath = path.join(dirPath, item);
    let isDirectory = false;
    try { isDirectory = fs.statSync(fullPath).isDirectory(); } catch(e) { return false; }
    if (isDirectory) return !ignoredFolders.includes(item);
    if (item.endsWith('.txt')) return false; // Ignora txts gerados
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
      if (file.endsWith('.txt')) return;
      if (allowedExtensions.includes(path.extname(file)) && !ignoredFiles.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

/**
 * Nova função que escreve o arquivo físico
 */
function writeChunkFile(fileName, content) {
    fs.writeFileSync(fileName, content);
    console.log(`   📄 Arquivo gerado: ${fileName} (${(content.length / 1024).toFixed(2)} KB)`);
}

/**
 * Processa uma pasta e divide em múltiplos arquivos se necessário
 */
function createReport(targetConfig) {
  const targetPath = path.join(__dirname, targetConfig.folderName);
  
  console.log(`\n--- Processando: ${targetConfig.title} ---`);
  
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ ERRO: Pasta '${targetConfig.folderName}' não encontrada.`);
    return;
  }

  const projectTree = generateTree(targetPath);
  const allFiles = getAllFiles(targetPath);
  
  console.log(`📂 Estrutura mapeada. ${allFiles.length} arquivos para processar.`);

  // Variáveis de controle de "Chunk" (Pedaço)
  let currentPart = 1;
  let currentContent = '';
  
  // Cabeçalho Inicial (vai apenas no primeiro arquivo ou em todos, decidi colocar só no 1)
  let header = `RELATÓRIO DE CÓDIGO - ${targetConfig.title} (PARTE ${currentPart})\n`;
  header += `Gerado em: ${new Date().toLocaleString()}\n`;
  header += `\nESTRUTURA DE PASTAS:\n${projectTree}\n`;
  header += `\n==================================================================\n\n`;

  currentContent += header;

  allFiles.forEach((filePath, index) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(path.join(__dirname, targetConfig.folderName), filePath);
      const fileSize = fs.statSync(filePath).size;

      // Monta o bloco de texto deste arquivo específico
      let fileBlock = '';
      fileBlock += `\n==================================================================\n`;
      fileBlock += `FILE: ${relativePath}\n`;
      fileBlock += `SIZE: ${fileSize} bytes\n`;
      fileBlock += `==================================================================\n`;
      fileBlock += content;
      fileBlock += `\n\n=== END OF FILE: ${relativePath} ===\n`;

      // Verifica se adicionar esse arquivo vai estourar o limite
      if ((currentContent.length + fileBlock.length) > MAX_FILE_SIZE) {
        // 1. Salva o arquivo atual que encheu
        const outputName = `${targetConfig.outputBaseName}_part${currentPart}.txt`;
        writeChunkFile(outputName, currentContent);

        // 2. Reseta para o próximo arquivo
        currentPart++;
        currentContent = `RELATÓRIO DE CÓDIGO - ${targetConfig.title} (PARTE ${currentPart} - Continuação)\n`;
        currentContent += `\n==================================================================\n\n`;
        
        // 3. Adiciona o conteúdo do arquivo que não coube no anterior
        currentContent += fileBlock;
      } else {
        // Se cabe, apenas adiciona
        currentContent += fileBlock;
      }

      // Se for o último arquivo da lista, salva o que sobrou
      if (index === allFiles.length - 1) {
        const outputName = `${targetConfig.outputBaseName}_part${currentPart}.txt`;
        writeChunkFile(outputName, currentContent);
      }
      
    } catch (err) {
      console.error(`Erro ao ler ${filePath}:`, err.message);
    }
  });
}

function run() {
  console.log('Iniciando geração particionada...');
  createReport(config.backend);
  createReport(config.frontend);
  console.log('\nProcesso finalizado.');
}

run();