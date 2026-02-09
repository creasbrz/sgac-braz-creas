import os

# Configurações: O que ignorar
IGNORE_DIRS = {
    'node_modules', '.git', 'dist', 'build', 'coverage', 
    '.vscode', '.idea', '__pycache__'
}
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
    '.DS_Store', 'gerar_contexto.py', 'CONTEXTO_COMPLETO.txt',
    '.env', '.env.local' # Segurança: não envie suas chaves!
}
EXTENSIONS_TO_INCLUDE = {
    # Backend
    '.js', '.ts', '.json', 
    # Frontend
    '.jsx', '.tsx', '.css', '.html',
    # Configs
    '.prisma', '.sql', '.md', '.yml', '.yaml'
}

def generate_megazord():
    output_filename = 'CONTEXTO_COMPLETO.txt'
    
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        outfile.write(f"# CONTEXTO TOTAL DO PROJETO\n")
        outfile.write(f"# Este arquivo contem todo o codigo fonte relevante.\n\n")
        
        for root, dirs, files in os.walk('.'):
            # Remove diretórios ignorados para não percorrer
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                _, ext = os.path.splitext(file)
                if ext not in EXTENSIONS_TO_INCLUDE:
                    continue
                
                filepath = os.path.join(root, file)
                
                # Cabeçalho para a IA saber onde começa cada arquivo
                outfile.write(f"\n{'='*50}\n")
                outfile.write(f"ARQUIVO: {filepath}\n")
                outfile.write(f"{'='*50}\n")
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        outfile.write(content + "\n")
                except Exception as e:
                    outfile.write(f"[ERRO AO LER ARQUIVO: {e}]\n")
                    print(f"Erro ao ler {filepath}: {e}")

    print(f"✅ Sucesso! Arquivo '{output_filename}' gerado.")
    print(f"Agora arraste este arquivo para o Gemini.")

if __name__ == "__main__":
    generate_megazord()