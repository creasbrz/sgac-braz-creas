// backend/scripts/backup.ts
import { exec } from 'child_process'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Configurações
const DB_URL = process.env.DATABASE_URL
const BACKUP_DIR = path.resolve(__dirname, '../../backups') // Salva na raiz/backups

if (!DB_URL) {
  console.error("❌ Erro: DATABASE_URL não definida no .env")
  process.exit(1)
}

// Cria diretório se não existir
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup_sgac_${timestamp}.sql.gz`
  const filepath = path.join(BACKUP_DIR, filename)

  console.log(`📦 Iniciando backup do banco de dados...`)
  console.log(`📂 Destino: ${filepath}`)

  try {
    // Comando pg_dump (assume que o cliente postgres está instalado no SO)
    // O comando piped para gzip comprime o arquivo na hora
    const command = `pg_dump "${DB_URL}" | gzip > "${filepath}"`
    
    await execAsync(command)

    console.log(`✅ Backup concluído com sucesso!`)
    console.log(`💾 Arquivo gerado: ${filename}`)
    
    // Opcional: Limpeza de backups antigos (manter últimos 7 dias)
    cleanOldBackups()

  } catch (error) {
    console.error("❌ Falha ao realizar backup:", error)
    process.exit(1)
  }
}

function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
  const now = Date.now()
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 dias

  files.forEach(file => {
    if (!file.startsWith('backup_sgac_')) return
    
    const filePath = path.join(BACKUP_DIR, file)
    const stats = fs.statSync(filePath)
    
    if (now - stats.mtimeMs > MAX_AGE) {
      fs.unlinkSync(filePath)
      console.log(`🗑️ Backup antigo removido: ${file}`)
    }
  })
}

runBackup()