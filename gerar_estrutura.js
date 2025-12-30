const fs = require('fs');
const path = require('path');

// ================= CONFIGURAÇÃO =================
const outputFileName = 'ESTRUTURA_PROJETO.md';

// Pastas que serão totalmente ignoradas (não abrimos para ver o conteúdo)
const ignoredFolders = [
  'node_modules', 
  '.git', 
  '.vscode', 
  '.idea', 
  'dist', 
  'build', 
  'coverage', 
  '__pycache__',
  '.next',
  '.cache'
];

// Arquivos que você não quer que apareçam na árvore (opcional)
const ignoredFiles = [
  '.DS_Store', 
  'thumbs.db', 
  'package-lock.json', 
  'yarn.lock',
  'pnpm-lock.yaml',
  outputFileName, // Não listar o próprio arquivo gerado
  'gerar_estrutura.js',
  'gerar_txt.js' // Ignorar o script anterior se existir
];
// =================================================

function getTree(dirPath, prefix = '') {
  let treeString = '';
  
  if (!fs.existsSync(dirPath)) return '';

  const items = fs.readdirSync(dirPath);

  // Ordena: Pastas primeiro, depois arquivos
  items.sort((a, b) => {
    const aPath = path.join(dirPath, a);
    const bPath = path.join(dirPath, b);
    const aIsDir = fs.statSync(aPath).isDirectory();
    const bIsDir = fs.statSync(bPath).isDirectory();
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  // Filtra itens ignorados
  const filteredItems = items.filter(item => {
    if (ignoredFolders.includes(item) || ignoredFiles.includes(item)) return false;
    return true;
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
      treeString += getTree(fullPath, newPrefix);
    }
  });

  return treeString;
}

function run() {
  console.log('Gerando mapa da estrutura do projeto...');
  
  const tree = getTree(__dirname);
  
  let mdContent = `# Estrutura do Projeto\n\n`;
  mdContent += `> Gerado em: ${new Date().toLocaleString()}\n\n`;
  mdContent += `Esta é a estrutura de diretórios do projeto, ignorando pastas de dependências (node_modules) e build.\n\n`;
  
  mdContent += `\`\`\`text\n`;
  mdContent += `root\n`;
  mdContent += tree;
  mdContent += `\`\`\`\n`;

  fs.writeFileSync(outputFileName, mdContent);
  
  console.log(`✅ Arquivo '${outputFileName}' gerado com sucesso!`);
}

run();