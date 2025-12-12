const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO =================
const outputFileName = 'projeto_creas_completo.txt';

// Pastas que devem ser IGNORADAS (Adicionei .git e pastas de cache comuns)
const ignoredFolders = [
  'node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 
  'coverage', 'venv', '__pycache__', 'tmp', 'temp'
];

// Arquivos específicos que devem ser IGNORADOS (Para não poluir o txt)
const ignoredFiles = [
  'package-lock.json', 'yarn.lock', 'composer.lock', 
  '.DS_Store', 'thumbs.db', '.env', 'gerar_txt.js', outputFileName
];

// Extensões de arquivos que você QUER ler
// Adicionei .md (documentação) e .env.example (configuração segura)
const allowedExtensions = [
  '.js', '.jsx', '.ts', '.tsx', 
  '.html', '.css', '.scss', 
  '.json', '.php', '.py', '.java', 
  '.sql', '.md', '.env.example'
];
// =================================================

/**
 * Função auxiliar para gerar a árvore de diretórios visualmente
 */
function generateTree(dirPath, prefix = '') {
  let treeString = '';
  const items = fs.readdirSync(dirPath);

  // Filtra itens ignorados para não aparecerem nem na árvore
  const filteredItems = items.filter(item => {
    const fullPath = path.join(dirPath, item);
    const isDirectory = fs.statSync(fullPath).isDirectory();
    if (isDirectory) return !ignoredFolders.includes(item);
    return !ignoredFiles.includes(item) && allowedExtensions.includes(path.extname(item));
  });

  filteredItems.forEach((item, index) => {
    const isLast = index === filteredItems.length - 1;
    const marker = isLast ? '└── ' : '├── ';
    const fullPath = path.join(dirPath, item);
    const isDirectory = fs.statSync(fullPath).isDirectory();

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
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoredFolders.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Verifica extensão E se o arquivo não está na lista de ignorados
      if (allowedExtensions.includes(path.extname(file)) && !ignoredFiles.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function mergeFiles() {
  console.log('Iniciando leitura do projeto CREAS...');
  
  // 1. Gera a árvore visual do projeto
  const projectTree = generateTree(__dirname);
  
  // 2. Coleta os arquivos
  const allFiles = getAllFiles(__dirname);
  
  let fullContent = '';

  // Cabeçalho Principal do Documento
  fullContent += `RELATÓRIO DE CÓDIGO - PROJETO CREAS\n`;
  fullContent += `Gerado em: ${new Date().toLocaleString()}\n`;
  fullContent += `Total de arquivos: ${allFiles.length}\n`;
  fullContent += `\nESTRUTURA DE PASTAS:\n`;
  fullContent += `root\n${projectTree}`;
  fullContent += `\n\n==================================================================\n\n`;

  console.log(`Estrutura mapeada. Encontrados ${allFiles.length} arquivos válidos.`);

  // 3. Lê e concatena o conteúdo
  allFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      const fileSize = fs.statSync(filePath).size; // Tamanho em bytes
      
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

  fs.writeFileSync(outputFileName, fullContent);
  console.log(`\nSucesso! O arquivo '${outputFileName}' foi criado na raiz.`);
  console.log('Agora você pode enviar este arquivo para análise.');
}

mergeFiles();