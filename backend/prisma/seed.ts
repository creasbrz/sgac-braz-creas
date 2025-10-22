// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker/locale/pt_BR'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// --- Funções Auxiliares de Geração de Dados ---

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Gera um parecer final realista em português, baseado no motivo do desligamento.
 */
function generateParecerFinal(motivo: string, nome: string): string {
  switch (motivo) {
    case 'Mudança de território':
      return `A família/indivíduo, Sr(a). ${nome}, informou mudança de endereço para outra regional administrativa. O caso está sendo encaminhado via SEI para o CREAS de referência do novo território. Não há mais pendências nesta unidade.`
    case 'Falecimento':
      return `Recebida comunicação de falecimento do(a) usuário(a) Sr(a). ${nome}, confirmado por documentação (certidão de óbito anexa ao processo). O acompanhamento do núcleo familiar restante, se necessário, será avaliado em novo registro.`
    case 'Recusa de atendimento':
      return `Após múltiplas tentativas de contato (TC) e visita domiciliar (VD), o(a) usuário(a) ${nome} recusou formalmente o acompanhamento ofertado pela equipe, assinando o termo de recusa. O caso será encerrado por desejo do utilizador, que foi orientado sobre os serviços.`
    case 'Violação cessada':
      return `O acompanhamento foi concluído com sucesso. As violações de direito identificadas no início do atendimento foram cessadas e os objetivos do PAF foram alcançados. A família (Sr(a). ${nome}) demonstrou fortalecimento dos vínculos e superação da situação de vulnerabilidade.`
    case 'Contrareferenciamento':
      return `Caso contrareferenciado para o CRAS de origem (${getRandomItem(['CRAS Brazlândia', 'CRAS Incra'])}) para acompanhamento no PAIF, visto que as demandas de proteção especial foram superadas e a família se enquadra no perfil de Proteção Básica.`
    case 'Não localizado':
      return `Realizadas 3 (três) tentativas de visita domiciliar em dias e horários alternados e múltiplos contatos telefônicos sem sucesso. O(A) usuário(a) ${nome} não foi localizado no endereço fornecido e não há novos contatos. Esgotadas as possibilidades de busca ativa no território.`
    case 'Acolhimento':
      return `O(A) usuário(a) ${nome} foi encaminhado(a) e recebido(a) em serviço de acolhimento institucional em ${faker.date.recent({ days: 10 }).toLocaleDateString('pt-BR')}. O acompanhamento será continuado pela equipe do serviço de acolhimento.`
    default:
      return 'Desligamento realizado conforme parecer técnico detalhado em evoluções anteriores.'
  }
}

/**
 * Gera um PAF realista em português, baseado nos dados do caso.
 */
function generateRealisticPaf(violacao: string, categoria: string): { diagnostico: string, objetivos: string, estrategias: string } {
  const diagnostico = `Núcleo familiar apresenta vulnerabilidade social e relacional, agravada pela situação de ${violacao.toLowerCase()}. Observa-se fragilidade nos vínculos familiares e comunitários, impactando o(a) ${categoria.toLowerCase()}.`
  
  const objetivos = `1. Superação da situação de ${violacao.toLowerCase()}.\n2. Fortalecimento da função protetiva da família.\n3. Promoção de acesso a outros serviços e benefícios socioassistenciais.`
  
  const estrategias = `1. Realização de atendimentos psicossociais individualizados e familiares.\n2. Visitas domiciliares para monitoramento e orientação.\n3. Articulação com a rede (Saúde, Educação, Conselho Tutelar) para ações integradas.`

  return { diagnostico, objetivos, estrategias }
}

/**
 * Gera observações iniciais realistas em português.
 */
function generateObservacoes(orgao: string, violacao: string, categoria: string): string {
  const obs = [
    `Caso encaminhado via SEI pelo(a) ${orgao}. Demanda inicial: ${violacao.toLowerCase()}.`,
    `Usuário(a) compareceu por demanda espontânea, relatando ${violacao.toLowerCase()}. Perfil: ${categoria.toLowerCase()}.`,
    `Recebido ofício do ${orgao} solicitando acompanhamento para o(a) usuário(a) da categoria ${categoria.toLowerCase()}.`,
  ]
  return getRandomItem(obs)
}

// --- Listas de Opções (em Português) ---
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
const beneficiosList = [
  'BPC', 'Bolsa Família', 'Prato Cheio', 'Vulnerabilidade', 'Excepcional', 'Calamidade',
]
const motivosDesligamento = [
  'Mudança de território', 'Falecimento', 'Recusa de atendimento', 
  'Violação cessada', 'Contrareferenciamento', 'Não localizado', 'Acolhimento',
]
const prazosPaf = [
  'Curto prazo (3 meses)', 'Médio prazo (6 meses)', 'Longo prazo (12 meses)'
]
const titulosAgendamento = [
  'Visita Domiciliar', 'Atendimento Individualizado', 'Escuta Especializada', 'Reunião de Rede (Saúde)', 'Acompanhamento Telefônico'
]

// --- Função Principal de Povoamento ---
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

  const createdCases = []
  console.log('📂 A criar 80 casos simulados...')
  for (let i = 0; i < 80; i++) {
    const status = getRandomItem(statusPossiveis)
    const agenteAcolhida = getRandomItem(agentesSociais)
    const nomeCompleto = faker.person.fullName()
    const violacao = getRandomItem(violacoes)
    const categoria = getRandomItem(categorias)
    const orgaoDemandante = getRandomItem(['CRAS', 'Conselho Tutelar', 'Saúde', 'Demanda Espontânea'])
    
    let especialistaPAEFI = null
    let dataInicioPAEFI = null
    let dataDesligamento = null
    let motivoDesligamento = null
    let parecerFinal = null
    let pafData = undefined

    const beneficios = faker.helpers.arrayElements(beneficiosList, { min: 0, max: 2 })

    if (['EM_ACOMPANHAMENTO_PAEFI', 'DESLIGADO'].includes(status)) {
      especialistaPAEFI = getRandomItem(especialistas)
      dataInicioPAEFI = faker.date.past({ years: 1 })
      
      const { diagnostico, objetivos, estrategias } = generateRealisticPaf(violacao, categoria)
      
      pafData = {
        create: {
          diagnostico,
          objetivos,
          estrategias,
          prazos: getRandomItem(prazosPaf),
          autorId: especialistaPAEFI.id,
        }
      }
    }
    
    if (status === 'DESLIGADO') {
      dataDesligamento = faker.date.recent({ days: 30 })
      motivoDesligamento = getRandomItem(motivosDesligamento)
      parecerFinal = generateParecerFinal(motivoDesligamento, nomeCompleto)
    }
    
    const newCase = await prisma.case.create({
      data: {
        nomeCompleto,
        cpf: faker.string.numeric(11),
        nascimento: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }),
        sexo: getRandomItem(['Masculino', 'Feminino']),
        telefone: faker.phone.number('619########'),
        endereco: faker.location.streetAddress({ useFullAddress: true }),
        dataEntrada: faker.date.past({ years: 2 }),
        urgencia: getRandomItem(urgencias),
        violacao,
        categoria,
        orgaoDemandante,
        numeroSei: `${faker.string.numeric(5)}-${faker.string.numeric(8)}/${faker.string.numeric(4)}-${faker.string.numeric(2)}`,
        observacoes: generateObservacoes(orgaoDemandante, violacao, categoria),
        status,
        criadoPorId: gerente.id,
        agenteAcolhidaId: agenteAcolhida.id,
        especialistaPAEFIId: especialistaPAEFI?.id,
        dataInicioPAEFI,
        dataDesligamento,
        beneficios,
        motivoDesligamento,
        parecerFinal,
        paf: pafData,
      },
    })
    createdCases.push(newCase)
  }
  console.log(`📦 ${createdCases.length} casos simulados criados com sucesso!`)

  // --- Criação de Agendamentos ---
  console.log('🗓️ A criar agendamentos simulados...')
  let agendamentoCount = 0
  const activeCases = createdCases.filter(c => 
    c.status === 'EM_ACOLHIDA' || c.status === 'EM_ACOMPANHAMENTO_PAEFI'
  )

  for (const c of activeCases) {
    let responsavelId = null
    if (c.status === 'EM_ACOLHIDA' && c.agenteAcolhidaId) {
      responsavelId = c.agenteAcolhidaId
    } else if (c.status === 'EM_ACOMPANHAMENTO_PAEFI' && c.especialistaPAEFIId) {
      responsavelId = c.especialistaPAEFIId
    }

    if (responsavelId) {
      const numAgendamentos = getRandomItem([1, 2]) // 1 ou 2 agendamentos por caso ativo
      for (let j = 0; j < numAgendamentos; j++) {
        await prisma.agendamento.create({
          data: {
            titulo: getRandomItem(titulosAgendamento),
            data: faker.date.future({ days: 30 }),
            casoId: c.id,
            responsavelId: responsavelId,
          },
        })
        agendamentoCount++
      }
    }
  }
  console.log(`📅 ${agendamentoCount} agendamentos futuros criados com sucesso!`)
  
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

