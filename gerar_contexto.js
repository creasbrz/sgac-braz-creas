const fs = require('fs');
const path = require('path');

// Configurações
const outputFileName = 'projeto_completo.txt';
const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.vs', '.idea'];
const ignoreFiles = ['package-lock.json', 'yarn.lock', '.env', 'gerar_contexto.js'];
const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.prisma', '.css', '.html', '.json'];

// Função recursiva para ler arquivos
function readDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!ignoreDirs.includes(file)) {
                readDir(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (allowedExtensions.includes(ext) && !ignoreFiles.includes(file)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Formata a saída para eu entender a estrutura
                const separator = `\n\n==================================================\nFILE: ${fullPath}\n==================================================\n\n`;
                
                fs.appendFileSync(outputFileName, separator + content);
                console.log(`Adicionado: ${fullPath}`);
            }
        }
    });
}

// Limpa o arquivo anterior se existir
if (fs.existsSync(outputFileName)) {
    fs.unlinkSync(outputFileName);
}

console.log('Iniciando leitura dos arquivos...');
readDir('./backend'); // Lê pasta backend
readDir('./frontend/src'); // Lê pasta src do frontend (ignora configs de raiz se quiser)
// Adicione outras pastas se necessário, ex: readDir('./frontend');

console.log(`\nConcluído! Todo o código foi salvo em "${outputFileName}".`);