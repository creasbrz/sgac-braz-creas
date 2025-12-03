// backend/prisma/seed.ts
/**
 * Seed Realista e Blindado para SGAC-BRAZ (CREAS)
 * - Textos técnicos baseados no SUAS.
 * - Cálculo automático de peso de urgência.
 * - Tratamento de datas para evitar erros de geração.
 * - Inserção em lotes (chunks) para performance.
 */

import { PrismaClient, CaseStatus, Cargo, LogAction } from '@prisma/client'
import { faker } from '@faker-js/faker/locale/pt_BR'
import bcrypt from 'bcryptjs'
import { addDays, addMonths, subDays, startOfDay, isAfter } from 'date-fns'

const prisma = new PrismaClient()

/* --------------------------- CONFIGURAÇÕES --------------------------- */
const NUM_AGENTES = 3
const NUM_ESPECIALISTAS = 4
const NUM_CASOS = 150 
const MAX_EVOLUCOES = 8
const MAX_AGENDAMENTOS = 3
const CONCURRENCY = 10

/* --------------------------- UTILITÁRIOS --------------------------- */

// Remove horas da data para consistência
const stripTime = (date: Date): Date => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function randWeighted<T>(arr: [T, number][]): T {
  const total = arr.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [item, weight] of arr) {
    if (r < weight) return item
    r -= weight
  }
  return arr[0][0]
}

function pickMultiple<T>(arr: T[], min = 0, max = 2): T[] {
  const n = faker.number.int({ min, max })
  return faker.helpers.arrayElements(arr, n)
}

function chunkArray<T>(arr: T[], size = 10): T[][] {
  const res: T[][] = []
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size))
  return res
}

// Calcula Peso da Urgência (Sincronizado com o Backend)
const calculateWeight = (urgencia: string): number => {
  const term = urgencia.trim()
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(term)) return 2;
  return 1;
}

/* --------------------------- DADOS TÉCNICOS (SUAS) --------------------------- */

const textosEvolucao = [
  "Realizada visita domiciliar. A família reside em imóvel próprio, porém em condições precárias de habitabilidade. Identificada necessidade de encaminhamento para o CRAS para atualização do CadÚnico.",
  "Atendimento psicossocial realizado na unidade. O usuário relata sofrimento psíquico decorrente da violência sofrida. Foi realizado acolhimento e agendado retorno.",
  "Contato telefônico com a UBS de referência. A enfermeira responsável informou que a idosa compareceu à consulta agendada e está com a medicação regularizada.",
  "Busca ativa realizada no território. O usuário não foi localizado no endereço informado. Vizinhos relataram que a família mudou-se há cerca de duas semanas.",
  "Participação em estudo de caso com a rede intersetorial (Saúde, Educação e Conselho Tutelar). Definidas estratégias conjuntas para proteção da criança.",
  "Atendimento ao familiar responsável. Foram prestadas orientações sobre o Benefício de Prestação Continuada (BPC) e entregue a lista de documentação necessária.",
  "O adolescente compareceu ao grupo de convivência. Demonstrou boa interação com os pares, embora ainda apresente resistência em falar sobre o conflito familiar.",
  "Realizada articulação com o CAPS para avaliação psiquiátrica do usuário, visando suporte ao tratamento de dependência química.",
  "Entrega de benefício eventual (Auxílio Alimentação/Cesta Básica) em caráter emergencial, conforme parecer técnico.",
  "Escuta especializada realizada. O relato foi registrado conforme protocolo e o caso será discutido em reunião de equipe para definição de fluxo."
]

const pafDiagnosticos = [
  "Núcleo familiar monoparental chefiado por mulher, em situação de extrema pobreza. Observa-se fragilidade nos vínculos familiares agravada pelo desemprego e uso abusivo de álcool por parte de um dos membros.",
  "Idoso em situação de negligência e abandono afetivo. Reside sozinho, apresenta limitações de mobilidade e não conta com suporte da rede familiar extensa. Renda proveniente de BPC.",
  "Família com histórico de violação de direitos (violência física) contra criança. Genitores apresentam dificuldades no exercício da função protetiva e acessam a rede de serviços de forma irregular.",
  "Adolescente em cumprimento de medida socioeducativa. Família apresenta vínculos fragilizados e dificuldade em impor limites. O jovem evadiu da escola e não possui atividades no contraturno.",
  "Pessoa com deficiência (PCD) em situação de isolamento social. Família sobrecarregada com os cuidados e sem acesso a serviços de reabilitação adequados."
]

const pafObjetivos = [
  "1. Fortalecer a função protetiva da família.\n2. Superar a situação de violação de direitos.\n3. Promover o acesso à rede de serviços públicos.",
  "1. Restabelecer vínculos familiares rompidos.\n2. Garantir a segurança e integridade física do usuário.\n3. Viabilizar a inserção em programas de transferência de renda.",
  "1. Promover a autonomia e emancipação dos membros da família.\n2. Articular ações de saúde mental para o agressor.\n3. Acompanhar o desempenho escolar das crianças.",
  "1. Reduzir os danos causados pela situação de violência.\n2. Incluir o usuário em atividades comunitárias e de lazer.\n3. Monitorar a situação habitacional."
]

const pafEstrategias = [
  "Visitas domiciliares quinzenais; Encaminhamento para o CRAS (PAIF); Articulação com a UBS para acompanhamento médico.",
  "Atendimentos psicossociais individuais e em grupo; Busca ativa de familiares extensos; Encaminhamento para assessoria jurídica.",
  "Inserção em oficinas de convivência; Reuniões de rede com a escola e Conselho Tutelar; Orientações sobre direitos e cidadania.",
  "Acompanhamento sistemático da equipe técnica; Encaminhamento para qualificação profissional; Solicitação de benefícios eventuais."
]

/* --------------------------- LISTAS DETALHADAS (STRINGS) --------------------------- */
const urgenciasWeighted: [string, number][] = [
  ['Convive com agressor', 0.15],
  ['Risco de morte', 0.05],
  ['Idoso 80+', 0.10],
  ['Primeira infância', 0.10],
  ['Risco de reincidência', 0.15],
  ['Sofre ameaça', 0.10],
  ['Risco de desabrigo', 0.05],
  ['Sem risco imediato', 0.20],
  ['Visita periódica', 0.10],
]

const violacoesWeighted: [string, number][] = [
  ['Violência física e/ou psicológica', 0.40],
  ['Negligência', 0.25],
  ['Abandono', 0.10],
  ['Violência sexual', 0.08],
  ['Trabalho infantil', 0.02],
  ['Situação de rua', 0.05],
  ['Outros', 0.10],
]

const categoriasWeighted: [string, number][] = [
  ['Mulher', 0.35],
  ['Idoso', 0.20],
  ['Criança/adolescente', 0.25],
  ['Família em vulnerabilidade', 0.10],
  ['PCD', 0.05],
  ['POP RUA', 0.05],
]

const sexos = ['Masculino', 'Feminino', 'Outro', 'Não Informado']

const beneficiosList = [
  'BPC (Idoso/PCD)', 
  'Bolsa Família', 
  'Prato Cheio', 
  'DF Social', 
  'Auxílio Vulnerabilidade', 
  'Auxílio Calamidade'
]

const motivosDesligamento = [
  'Superação da situação de violação',
  'Mudança de território (transferência)',
  'Óbito do usuário',
  'Recusa de atendimento',
  'Contra-referência para CRAS (PAIF)',
  'Acolhimento Institucional'
]

const titulosAgendamento = [
  'Visita Domiciliar',
  'Atendimento Psicossocial',
  'Escuta Especializada',
  'Reunião de Rede',
  'Estudo de Caso'
]

/* --------------------------- SEED PRINCIPAL --------------------------- */

async function main() {
  console.log('🌱 Iniciando seed REALISTA (SUAS)...')

  console.log('🧹 Limpando dados antigos...')
  await prisma.caseLog.deleteMany()
  await prisma.pafVersion.deleteMany()
  await prisma.paf.deleteMany()
  await prisma.agendamento.deleteMany()
  await prisma.anexo.deleteMany()
  await prisma.evolucao.deleteMany()
  await prisma.case.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('senha-segura-123', 8)

  // 1. Usuários
  console.log('👥 Criando equipe técnica...')
  const gerente = await prisma.user.create({
    data: { nome: 'Gerente CREAS', email: 'gerente@creas.test', senha: hashedPassword, cargo: Cargo.Gerente, ativo: true }
  })

  const agentes = []
  for (let i = 1; i <= NUM_AGENTES; i++) {
    agentes.push(await prisma.user.create({
      data: { nome: `Agente Social ${i}`, email: `agente${i}@creas.test`, senha: hashedPassword, cargo: Cargo.Agente_Social, ativo: true }
    }))
  }

  const especialistas = []
  for (let i = 1; i <= NUM_ESPECIALISTAS; i++) {
    especialistas.push(await prisma.user.create({
      data: { nome: `Especialista ${i}`, email: `especialista${i}@creas.test`, senha: hashedPassword, cargo: Cargo.Especialista, ativo: true }
    }))
  }

  // 2. Preparar Casos
  console.log(`📂 Gerando ${NUM_CASOS} prontuários detalhados...`)
  const now = new Date()
  const casePayloads: any[] = []

  for (let i = 0; i < NUM_CASOS; i++) {
    const statusOptionsWeighted: [CaseStatus, number][] = [
      [CaseStatus.AGUARDANDO_ACOLHIDA, 0.10],
      [CaseStatus.EM_ACOLHIDA, 0.15],
      [CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI, 0.10],
      [CaseStatus.EM_ACOMPANHAMENTO_PAEFI, 0.50], 
      [CaseStatus.DESLIGADO, 0.15]
    ]
    const status = randWeighted(statusOptionsWeighted)
    
    const agente = rand(agentes)
    const especialista = rand(especialistas)
    
    // Data de entrada no passado (até ontem)
    const rawDataEntrada = faker.date.between({ from: subDays(now, 365), to: subDays(now, 1) })
    const dataEntrada = stripTime(rawDataEntrada)
    
    const urgencia = randWeighted(urgenciasWeighted)
    const violacao = randWeighted(violacoesWeighted)
    const categoria = randWeighted(categoriasWeighted)

    const base: any = {
      nomeCompleto: faker.person.fullName(),
      cpf: faker.string.numeric(11),
      nascimento: stripTime(faker.date.birthdate({ min: 0, max: 90 })),
      sexo: rand(sexos),
      telefone: faker.string.numeric(11),
      endereco: `${faker.location.street()}, ${faker.location.buildingNumber()} - ${faker.location.city()}`,
      dataEntrada,
      urgencia,
      pesoUrgencia: calculateWeight(urgencia),
      violacao,
      categoria,
      orgaoDemandante: rand(['CRAS', 'Conselho Tutelar', 'MPDFT', 'Demanda Espontânea', 'Disque 100', 'Saúde']),
      numeroSei: faker.datatype.boolean() ? `SEI-${faker.number.int({ min: 10000, max: 99999 })}` : null,
      linkSei: null,
      observacoes: faker.lorem.paragraph(1),
      status,
      criadoPorId: gerente.id,
      agenteAcolhidaId: agente.id,
      beneficios: pickMultiple(beneficiosList, 0, 3)
    }

    const updates: any = {}

    if (status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI || status === CaseStatus.DESLIGADO) {
      updates.especialistaPAEFIId = especialista.id
      const diasTriagem = faker.number.int({ min: 5, max: 45 })
      updates.dataInicioPAEFI = stripTime(addDays(dataEntrada, diasTriagem))
    }

    if (status === CaseStatus.DESLIGADO) {
      const baseStart = updates.dataInicioPAEFI ?? dataEntrada
      const diasAteDeslig = faker.number.int({ min: 30, max: 180 })
      const dataDeslig = addDays(baseStart, diasAteDeslig)
      updates.dataDesligamento = stripTime(isAfter(dataDeslig, now) ? now : dataDeslig)
      updates.motivoDesligamento = rand(motivosDesligamento)
      updates.parecerFinal = `Caso desligado após cumprimento dos objetivos. ${faker.lorem.sentence()}`
    }

    casePayloads.push({ base, updates })
  }

  // 3. Inserção em Chunks
  console.log('⚙️ Processando inserção em lotes...')
  const chunks = chunkArray(casePayloads, CONCURRENCY)
  let createdCount = 0

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (item) => {
      const { base, updates } = item
      try {
        await prisma.$transaction(async (tx) => {
          // Cria Caso
          const novoCaso = await tx.case.create({ data: { ...base, ...updates } })
          createdCount++

          // Logs
          const logsToCreate: any[] = [{
            acao: LogAction.CRIACAO,
            descricao: 'Caso inserido no sistema (Triagem).',
            casoId: novoCaso.id,
            autorId: base.criadoPorId,
            createdAt: base.dataEntrada
          }]

          if (novoCaso.status !== CaseStatus.AGUARDANDO_ACOLHIDA) {
            logsToCreate.push({
              acao: LogAction.MUDANCA_STATUS,
              descricao: 'Encaminhado para Acolhida/Técnico.',
              casoId: novoCaso.id,
              autorId: novoCaso.agenteAcolhidaId!,
              createdAt: addDays(base.dataEntrada, 1)
            })
          }

          if (novoCaso.especialistaPAEFIId) {
            logsToCreate.push({
              acao: LogAction.ATRIBUICAO,
              descricao: `Atribuído ao especialista (id: ${novoCaso.especialistaPAEFIId}).`,
              casoId: novoCaso.id,
              autorId: gerente.id,
              createdAt: novoCaso.dataInicioPAEFI ?? addDays(base.dataEntrada, 2)
            })
          }

          if (novoCaso.dataDesligamento) {
            logsToCreate.push({
              acao: LogAction.DESLIGAMENTO,
              descricao: `Caso desligado. Motivo: ${novoCaso.motivoDesligamento}`,
              casoId: novoCaso.id,
              autorId: gerente.id,
              createdAt: novoCaso.dataDesligamento
            })
          }

          if (logsToCreate.length > 0) await tx.caseLog.createMany({ data: logsToCreate })

          // Evoluções
          const numEvos = faker.number.int({ min: 2, max: MAX_EVOLUCOES })
          const evolutionsData: any[] = []
          for (let e = 0; e < numEvos; e++) {
            const maxDate = novoCaso.dataDesligamento ?? now
            let start = addDays(base.dataEntrada, 2)
            
            if (isAfter(start, maxDate) || start.getTime() === maxDate.getTime()) {
                start = base.dataEntrada
            }
            
            const evoDate = start.getTime() === maxDate.getTime() 
                ? start 
                : faker.date.between({ from: start, to: maxDate })

            evolutionsData.push({
              conteudo: rand(textosEvolucao),
              casoId: novoCaso.id,
              autorId: rand([novoCaso.agenteAcolhidaId!, novoCaso.especialistaPAEFIId ?? novoCaso.agenteAcolhidaId!]),
              createdAt: stripTime(evoDate)
            })
          }
          if (evolutionsData.length) await tx.evolucao.createMany({ data: evolutionsData })

          // PAF
          if (novoCaso.status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI || novoCaso.dataDesligamento) {
            const dataInicio = novoCaso.dataInicioPAEFI ?? addDays(base.dataEntrada, 10)
            const deadline = addMonths(dataInicio, 6)

            const paf = await tx.paf.create({
              data: {
                diagnostico: rand(pafDiagnosticos),
                objetivos: rand(pafObjetivos),
                estrategias: rand(pafEstrategias),
                deadline,
                casoId: novoCaso.id,
                autorId: novoCaso.especialistaPAEFIId ?? gerente.id,
                createdAt: addDays(dataInicio, 7)
              }
            })

            // Versão anterior do PAF
            if (faker.datatype.boolean()) {
              await tx.pafVersion.create({
                data: {
                  pafId: paf.id,
                  diagnostico: rand(pafDiagnosticos),
                  objetivos: rand(pafObjetivos),
                  estrategias: 'Estratégias iniciais definidas em reunião de equipe.',
                  deadline: addMonths(dataInicio, 3),
                  autorId: paf.autorId,
                  savedAt: addDays(dataInicio, 8)
                }
              })
            }

            await tx.caseLog.create({
              data: {
                acao: LogAction.PAF_CRIADO,
                descricao: 'Plano de Acompanhamento (PAF) elaborado.',
                casoId: novoCaso.id,
                autorId: paf.autorId,
                createdAt: addDays(dataInicio, 7)
              }
            })
          }

          // Agendamentos
          if (!novoCaso.dataDesligamento) {
            const numAg = faker.number.int({ min: 0, max: MAX_AGENDAMENTOS })
            const agendas: any[] = []
            for (let a = 0; a < numAg; a++) {
              const dataAg = addDays(now, faker.number.int({ min: 1, max: 30 }))
              agendas.push({
                titulo: rand(titulosAgendamento),
                data: stripTime(dataAg),
                observacoes: 'Confirmar presença.',
                responsavelId: novoCaso.especialistaPAEFIId ?? novoCaso.agenteAcolhidaId!,
                casoId: novoCaso.id,
                createdAt: now
              })
            }
            if (agendas.length) await tx.agendamento.createMany({ data: agendas })
          }
        })
      } catch (err) { console.error('Erro no caso:', err) }
    }))
    await new Promise((res) => setTimeout(res, 50))
  }

  console.log('🎉 Seed concluído!')
  console.log(`📊 ${createdCount} prontuários gerados.`)
  console.log('🔐 Login: gerente@creas.test | Senha: senha-segura-123')
}

main()
  .catch((e) => {
    console.error('❌ Erro Fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })