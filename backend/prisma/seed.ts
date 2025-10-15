// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker/locale/pt_BR'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const urgencias = [
  'Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte',
  'Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente',
  'PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante', 'Sem risco imediato',
  'Visita periódica',
]
const violacoes = [
  'Abandono', 'Negligência', 'Afastamento do convívio familiar', 'Cumprimento de medidas socioeducativas',
  'Descumprimento de condicionalidade do PBF', 'Discriminação', 'Situação de rua', 'Trabalho infantil',
  'Violência física e/ou psicológica', 'Violência sexual', 'Outros',
]
const categorias = [
  'Mulher', 'POP RUA', 'LGBTQIA+', 'Migrante', 'Idoso', 'Criança/adolescente',
  'PCD', 'Álcool/drogas',
]
const statusPossiveis = [
  'AGUARDANDO_ACOLHIDA', 'EM_ACOLHIDA', 'AGUARDANDO_DISTRIBUICAO_PAEFI',
  'EM_ACOMPANHAMENTO_PAEFI', 'DESLIGADO',
]

async function main() {
  console.log('✅ A iniciar o povoamento da base de dados...')

  console.log('🧹 A limpar tabelas existentes...')
  await prisma.agendamento.deleteMany()
  await prisma.paf.deleteMany()
  await prisma.evolucao.deleteMany()
  await prisma.case.deleteMany()
  await prisma.user.deleteMany()
  console.log('🧼 Tabelas limpas com sucesso.')

  console.log('👤 A criar utilizadores...')
  const hashedPassword = await bcrypt.hash('senha-segura-123', 8)

  const gerente = await prisma.user.create({
    data: {
      nome: 'Gerente CREAS',
      email: 'gerente@creas.com',
      senha: hashedPassword,
      cargo: 'Gerente',
    },
  })

  const agentesSociais = await Promise.all(
    Array.from({ length: 3 }).map((_, i) =>
      prisma.user.create({
        data: {
          nome: `Agente Social ${i + 1}`,
          email: `agente${i + 1}@creas.com`,
          senha: hashedPassword,
          cargo: 'Agente Social',
        },
      }),
    ),
  )

  const especialistas = await Promise.all(
    Array.from({ length: 4 }).map((_, i) =>
      prisma.user.create({
        data: {
          nome: `Especialista ${i + 1}`,
          email: `especialista${i + 1}@creas.com`,
          senha: hashedPassword,
          cargo: 'Especialista',
        },
      }),
    ),
  )
  console.log('👥 Utilizadores (1 Gerente, 3 Agentes, 4 Especialistas) criados com sucesso!')

  console.log('📂 A criar 40 casos simulados...')
  for (let i = 0; i < 40; i++) {
    const status = getRandomItem(statusPossiveis)
    const agenteAcolhida = getRandomItem(agentesSociais)
    let especialistaPAEFI = null
    let dataInicioPAEFI = null
    let dataDesligamento = null

    if (['EM_ACOMPANHAMENTO_PAEFI', 'DESLIGADO'].includes(status)) {
      especialistaPAEFI = getRandomItem(especialistas)
      dataInicioPAEFI = faker.date.past({ years: 1 })
    }
    if (status === 'DESLIGADO') {
      dataDesligamento = faker.date.recent({ days: 30 })
    }
    
    await prisma.case.create({
      data: {
        nomeCompleto: faker.person.fullName(),
        cpf: faker.string.numeric(11),
        nascimento: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }),
        sexo: getRandomItem(['Masculino', 'Feminino']),
        telefone: faker.phone.number('619########'),
        endereco: faker.location.streetAddress(),
        dataEntrada: faker.date.past({ years: 2 }),
        urgencia: getRandomItem(urgencias),
        violacao: getRandomItem(violacoes),
        categoria: getRandomItem(categorias),
        orgaoDemandante: getRandomItem(['CRAS', 'Conselho Tutelar', 'Saúde']),
        numeroSei: `${faker.string.numeric(5)}-${faker.string.numeric(8)}/${faker.string.numeric(4)}-${faker.string.numeric(2)}`,
        status,
        criadoPorId: gerente.id,
        agenteAcolhidaId: agenteAcolhida.id,
        especialistaPAEFIId: especialistaPAEFI?.id,
        dataInicioPAEFI,
        dataDesligamento,
      },
    })
  }
  console.log('📦 40 casos simulados criados com sucesso!')
  console.log('🎉 Povoamento da base de dados concluído.')
}

main()
  .catch((e) => {
    console.error('❌ Ocorreu um erro durante o povoamento:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

