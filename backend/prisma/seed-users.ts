// backend/prisma/seed-users.ts
import { PrismaClient, Cargo } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TEAM_DATA = [
  { nome: 'Alecio Marques', cargo: Cargo.Agente_Social, email: 'alecio.marques@sedes.df.gov.br', matricula: '0280473-5' },
  { nome: 'Gilberto Félix', cargo: Cargo.Agente_Social, email: 'gilberto.felix@sedes.df.gov.br', matricula: '1847597-7' },
  { nome: 'Katiane Silva', cargo: Cargo.Agente_Social, email: 'katiane.silva@sedes.df.gov.br', matricula: '0279689-9' },
  { nome: 'Glísia Mariano', cargo: Cargo.Especialista, email: 'glisia.mariano@sedes.df.gov.br', matricula: '0283051-5' },
  { nome: 'Lara Rodrigues', cargo: Cargo.Especialista, email: 'lara.rodrigues@sedes.df.gov.br', matricula: '00279203-6' },
  { nome: 'Sara Nascimento', cargo: Cargo.Especialista, email: 'sara.nascimento@sedes.df.gov.br', matricula: '0283032-9' },
  { nome: 'Silvia Bitencourt', cargo: Cargo.Especialista, email: 'silvia.bitencourt@sedes.df.gov.br', matricula: '0283269-0' },
  { nome: 'Henrique Rabelo', cargo: Cargo.Gerente, email: 'luiz.araujo@sedes.df.gov.br', matricula: '0277366-X' },
]

async function main() {
  console.log('👥 Iniciando criação da equipe técnica...')
  
  // Senha padrão para todos os usuários iniciais
  const passwordHash = await bcrypt.hash('123456', 10)

  for (const user of TEAM_DATA) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        nome: user.nome,
        cargo: user.cargo,
        matricula: user.matricula,
        ativo: true,
      },
      create: {
        nome: user.nome,
        email: user.email,
        matricula: user.matricula,
        senha: passwordHash,
        cargo: user.cargo,
        ativo: true,
      },
    })
  }

  console.log('✅ Equipe técnica criada/atualizada com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao gerar seed de usuários:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })