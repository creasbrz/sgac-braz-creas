const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO
const outputFileName = 'projeto_completo.txt';
// Pastas que devem ser IGNORADAS
const ignoredFolders = ['node_modules', '.git', '.vscode', 'dist', 'build', 'coverage', 'venv', '__pycache__'];
// Extensões de arquivos que você QUER ler
const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.json', '.php', '.py', '.java', '.sql'];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!ignoredFolders.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Verifica se a extensão é permitida
      if (allowedExtensions.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

function mergeFiles() {
  const allFiles = getAllFiles(__dirname);
  let fullContent = '';

  console.log(`Encontrados ${allFiles.length} arquivos. Gerando TXT...`);

  allFiles.forEach(filePath => {
    // Ignora o próprio script e o arquivo de saída
    if (filePath.includes('gerar_txt.js') || filePath.includes(outputFileName)) return;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Cria um cabeçalho para eu saber qual arquivo é
      const relativePath = path.relative(__dirname, filePath);
      
      fullContent += `\n\n==================================================================\n`;
      fullContent += `FILE START: ${relativePath}\n`;
      fullContent += `==================================================================\n`;
      fullContent += content;
      fullContent += `\n\n=== FILE END ===\n`;
      
    } catch (err) {
      console.error(`Erro ao ler ${filePath}:`, err.message);
    }
  });

  fs.writeFileSync(outputFileName, fullContent);
  console.log(`Sucesso! Arquivo '${outputFileName}' criado.`);
}

mergeFiles();