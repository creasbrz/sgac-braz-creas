// backend/prisma/seed.ts
import { PrismaClient, CaseStatus, Cargo, LogAction, CaseOrigin, GroupType } from '@prisma/client'
import { faker } from '@faker-js/faker/locale/pt_BR'
import bcrypt from 'bcryptjs'
import { addDays, subDays } from 'date-fns'

const prisma = new PrismaClient()

// --- 1. DADOS MESTRES (EQUIPE FIXA) ---
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

// --- LISTAS DE NEGÓCIO PADRONIZADAS ---

const LISTA_URGENCIAS = [
  'Convive com agressor',
  'Idoso 80+',
  'Primeira infância',
  'Risco de morte',
  'Risco de reincidência',
  'Sofre ameaça',
  'Risco de desabrigo',
  'Criança/Adolescente',
  'PCD',
  'Idoso',
  'Internação',
  'Acolhimento',
  'Gestante/Lactante',
  'Sem risco imediato',
  'Visita periódica'
]

const LISTA_VIOLACOES = [
  'Abandono',
  'Negligência',
  'Afastamento do convívio familiar',
  'Cumprimento de medidas socioeducativas',
  'Descumprimento de condicionalidade do PBF',
  'Discriminação',
  'Situação de rua',
  'Trabalho infantil',
  'Violência física e/ou psicológica',
  'Violência sexual',
  'Outros'
]

const LISTA_DESTINOS = [
  'Referenciado ao CRAS (PAIF)',
  'Serviço de Saúde (CAPS/UBS)',
  'Sistema de Justiça',
  'Acolhimento Institucional',
  'Superação da Vulnerabilidade (Autonomia)',
  'Mudança de Município/Estado',
  'Outro'
]

const BENEFICIOS_EVENTUAIS = [
  'Auxilio Natalidade', 
  'Auxilio Calamidade', 
  'Benefício Excepcional', 
  'Prato Cheio', 
  'Auxilio Vulnerabilidade'
]

const TRANSFERENCIA_RENDA = [
  'PROGRAMA BOLSA FAMÍLIA (PBF)', 
  'PROGRAMA DF SOCIAL', 
  'PROGRAMA CARTÃO GÁS', 
  'BENEFÍCIO DE PRESTAÇÃO CONTINUADA (BPC)'
]

const MOTIVOS_DESLIGAMENTO = [
  'Transferência de território',
  'Falecimento do(a) usuário(a)',
  'Recusa do atendimento por parte do(a) usuário(a)',
  'Usuário(a) não localizado(a)',
  'Usuário(a) acolhido(a)',
  'Minimização dos riscos',
  'Não pertencente à demanda do CREAS'
]

// Textos Técnicos para Evolução
const EVOLUCOES_TECNICAS = [
  "Realizada visita domiciliar. Observa-se precariedade habitacional e saneamento básico insuficiente.",
  "Atendimento psicossocial realizado na unidade. Usuária relata episódios recorrentes de violência.",
  "Articulação com a rede de saúde (CAPS AD) para verificar a adesão do adolescente ao tratamento.",
  "Realizada escuta qualificada. Identificada demanda de segurança alimentar.",
  "Reunião de estudo de caso com o Conselho Tutelar. Definido plano conjunto.",
  "Usuário compareceu para atendimento espontâneo solicitando segunda via de documentação civil.",
  "Tentativa de contato telefônico sem êxito. Enviada mensagem via WhatsApp.",
  "Acompanhamento da medida socioeducativa. O adolescente demonstra reflexão sobre o ato infracional."
]

const DIAGNOSTICOS_PAF = [
  "Família vivencia situação de negligência e insegurança alimentar grave.",
  "Idoso em situação de violência patrimonial e psicológica intrafamiliar.",
  "Adolescente em cumprimento de MSE (Liberdade Assistida).",
  "Mulher vítima de violência doméstica com medida protetiva."
]

const OBJETIVOS_PAF = [
  "Fortalecer a função protetiva da família e superar a situação de violação de direitos.",
  "Promover o acesso à rede de serviços públicos e garantir direitos básicos.",
  "Romper o ciclo de violência e fortalecer a autonomia do usuário.",
  "Garantir a convivência familiar e comunitária livre de violência."
]

const ESTRATEGIAS_PAF = [
  "Acompanhamento quinzenal presencial; Inserção no SCFV; Encaminhamento para BPC.",
  "Visitas domiciliares mensais; Articulação com CRAS para benefícios eventuais.",
  "Atendimentos psicossociais semanais; Grupo de convivência para mulheres."
]

const TEMAS_GRUPO = [
  'Oficina de Parentalidade', 'Grupo de Mulheres', 'Acolhida Coletiva (Novos Casos)',
  'Roda de Conversa sobre BPC', 'Grupo de Convivência para Idosos'
]

const ORGAOS_REDE = ['Conselho Tutelar', 'UBS', 'CAPS', 'Escola', 'CRAS', 'Defensoria Pública', 'MPDFT']

// --- UTILITÁRIOS ---
const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min: number, max: number) => faker.number.int({ min, max })
const generateCPF = () => faker.string.numeric(11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

// --- EXECUÇÃO ---

async function main() {
  console.log('🌱 [SEED v4.4.1] Iniciando povoamento COMPLETO (120 Casos + Fila + Grupos)...')

  // 1. Limpeza Total
  console.log('🧹 Limpando base de dados antiga...')
  await prisma.groupAttendance.deleteMany()
  await prisma.groupActivity.deleteMany()
  await prisma.serviceDeliverable.deleteMany()
  await prisma.encaminhamento.deleteMany()
  await prisma.membroFamilia.deleteMany()
  await prisma.caseLog.deleteMany()
  await prisma.agendamento.deleteMany()
  await prisma.pafVersion.deleteMany()
  await prisma.paf.deleteMany()
  await prisma.evolucao.deleteMany()
  await prisma.anexo.deleteMany()
  await prisma.case.deleteMany()
  await prisma.savedFilter.deleteMany()
  await prisma.user.deleteMany()

  // 2. Criar Usuários (Equipe)
  console.log('👥 Cadastrando equipe técnica...')
  const passwordHash = await bcrypt.hash('123456', 6)
  
  const users = []
  for (const u of TEAM_DATA) {
    const user = await prisma.user.create({
      data: {
        nome: u.nome,
        email: u.email,
        matricula: u.matricula,
        senha: passwordHash,
        cargo: u.cargo,
        ativo: true
      }
    })
    users.push(user)
  }

  const gerentes = users.filter(u => u.cargo === Cargo.Gerente)
  const especialistas = users.filter(u => u.cargo === Cargo.Especialista)
  const agentes = users.filter(u => u.cargo === Cargo.Agente_Social)
  const createdCases = []

  // 3. Criar Casos (120 Registros)
  const NUM_CASES = 120
  console.log(`📂 Gerando ${NUM_CASES} prontuários detalhados...`)

  for (let i = 0; i < NUM_CASES; i++) {
    const sexo = rand(['Masculino', 'Feminino'])
    const dataEntrada = faker.date.past({ years: 1 })
    const origem = faker.helpers.arrayElement(Object.values(CaseOrigin))
    
    // Lógica de Status (Com Fila de Espera)
    const statusRoll = Math.random()
    let status = CaseStatus.AGUARDANDO_ACOLHIDA
    
    if (statusRoll > 0.1) status = CaseStatus.EM_ACOLHIDA
    // Aumentando fila de espera propositalmente para teste
    if (statusRoll > 0.25) status = CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI 
    if (statusRoll > 0.5) status = CaseStatus.EM_ACOMPANHAMENTO_PAEFI
    if (statusRoll > 0.85) status = CaseStatus.DESLIGADO

    const criador = rand(gerentes) || rand(agentes)
    const agenteResp = rand(agentes)
    const especialistaResp = status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI ? rand(especialistas) : null

    // Dados de Desligamento
    let motivoDesligamento = null
    let destinoDesligamento = null
    let dataDesligamento = null
    let parecerFinal = null

    if (status === CaseStatus.DESLIGADO) {
        motivoDesligamento = rand(MOTIVOS_DESLIGAMENTO)
        destinoDesligamento = rand(LISTA_DESTINOS)
        dataDesligamento = addDays(dataEntrada, randInt(60, 300))
        parecerFinal = "Família superou a situação de vulnerabilidade e foi referenciada ao CRAS."
    }

    // Cálculo de Urgência
    const urgencia = rand(LISTA_URGENCIAS)
    const calculateUrgencyWeight = (u: string) => {
        if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(u)) return 4;
        if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(u)) return 3;
        if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(u)) return 2;
        return 1;
    }

    // Transferência de Renda (Campo Array no Case)
    const rendaBeneficios = faker.helpers.arrayElements(TRANSFERENCIA_RENDA, randInt(0, 2))

    const newCase = await prisma.case.create({
      data: {
        nomeCompleto: faker.person.fullName({ sex: sexo === 'Masculino' ? 'male' : 'female' }),
        cpf: generateCPF(),
        nascimento: faker.date.birthdate({ min: 14, max: 85, mode: 'age' }),
        sexo,
        telefone: `(61) 9${randInt(8000, 9999)}-${randInt(1000, 9999)}`,
        endereco: `Qd ${randInt(1, 50)} Conjunto ${String.fromCharCode(65 + randInt(0, 20))} Casa ${randInt(1, 40)} - Brazlândia`,
        urgencia,
        pesoUrgencia: calculateUrgencyWeight(urgencia),
        violacao: rand(LISTA_VIOLACOES),
        categoria: rand(['Idoso', 'PCD', 'Mulher', 'Família', 'Criança/Adolescente']),
        
        origem,
        dataEntrada,
        orgaoDemandante: origem === CaseOrigin.ESPONTANEA ? 'Demanda Espontânea' : rand(['Disque 100', 'MPDFT', 'UBS 01', 'CRAS Brazlândia', 'Conselho Tutelar']),
        
        numeroSei: `00431-${faker.string.numeric(8)}/2025-${faker.string.numeric(2)}`,
        linkSei: 'https://sei.df.gov.br/sei/controlador.php?acao=procedimento_trabalhar',
        observacoes: "Família reside em área de vulnerabilidade social.",
        
        // Benefícios de Transferência de Renda
        beneficios: rendaBeneficios, 
        
        status,
        criadoPorId: criador.id,
        agenteAcolhidaId: agenteResp.id,
        especialistaPAEFIId: especialistaResp?.id,
        dataInicioPAEFI: especialistaResp ? addDays(dataEntrada, randInt(10, 30)) : null,
        dataDesligamento,
        motivoDesligamento,
        destinoDesligamento,
        parecerFinal
      }
    })
    
    createdCases.push(newCase)

    // Log Inicial
    await prisma.caseLog.create({
        data: {
            casoId: newCase.id,
            autorId: criador?.id,
            acao: LogAction.CRIACAO,
            descricao: 'Caso importado via sistema (Seed/Migração).',
            createdAt: dataEntrada
        }
    })

    // [NOVO] Benefícios Eventuais (Entregas do CREAS)
    if (status !== CaseStatus.AGUARDANDO_ACOLHIDA) {
      const numEventuais = randInt(0, 2)
      for (let j = 0; j < numEventuais; j++) {
        await prisma.serviceDeliverable.create({
          data: {
            casoId: newCase.id,
            responsavelId: agenteResp?.id || criador.id,
            tipo: rand(BENEFICIOS_EVENTUAIS), // Apenas eventuais na tabela de entregas
            status: rand(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE']),
            dataSolicitacao: subDays(new Date(), randInt(1, 30)),
            observacoes: 'Concessão eventual conforme demanda.'
          }
        })
      }
    }

    // Membros da Família
    const numMembros = randInt(1, 4)
    for (let m = 0; m < numMembros; m++) {
      await prisma.membroFamilia.create({
        data: {
          casoId: newCase.id,
          nome: faker.person.fullName(),
          parentesco: rand(['Filho(a)', 'Cônjuge', 'Neto(a)', 'Irmão(ã)', 'Sobrinho(a)', 'Tio(a)']),
          idade: randInt(2, 90),
          cpf: Math.random() > 0.3 ? generateCPF() : null,
          ocupacao: rand(['Estudante', 'Desempregado', 'Aposentado', 'Autônomo', 'Do Lar', 'Bico']),
          renda: faker.number.float({ min: 0, max: 1412, fractionDigits: 2 }),
          observacoes: Math.random() > 0.8 ? "Apresenta problemas de saúde." : null
        }
      })
    }

    // Evoluções
    const numEvos = randInt(2, 6)
    for (let e = 0; e < numEvos; e++) {
      const dataEvo = addDays(dataEntrada, randInt(1, 100))
      if (newCase.dataDesligamento && dataEvo > newCase.dataDesligamento) continue;
      if (dataEvo > new Date()) continue;

      const autorEvo = especialistaResp || agenteResp

      if (autorEvo) {
        await prisma.evolucao.create({
            data: {
            casoId: newCase.id,
            autorId: autorEvo.id,
            conteudo: rand(EVOLUCOES_TECNICAS),
            sigilo: Math.random() > 0.8,
            createdAt: dataEvo
            }
        })
      }
    }

    // PAF
    if (especialistaResp) {
      const pafDate = addDays(dataEntrada, 45)
      const paf = await prisma.paf.create({
        data: {
          casoId: newCase.id,
          autorId: especialistaResp.id,
          diagnostico: rand(DIAGNOSTICOS_PAF),
          objetivos: rand(OBJETIVOS_PAF),
          estrategias: rand(ESTRATEGIAS_PAF),
          deadline: addDays(pafDate, 180),
          createdAt: pafDate,
          versaoAtual: 1
        }
      })
      await prisma.caseLog.create({
        data: {
          casoId: newCase.id,
          autorId: especialistaResp.id,
          acao: LogAction.PAF_CRIADO,
          descricao: "Elaboração do Plano de Acompanhamento Familiar (PAF) inicial.",
          createdAt: pafDate
        }
      })
    }

    // Encaminhamentos
    if (Math.random() > 0.5) {
      const autorEnc = especialistaResp || agenteResp
      if (autorEnc) {
          await prisma.encaminhamento.create({
            data: {
            casoId: newCase.id,
            autorId: autorEnc.id,
            tipo: rand(['Saúde', 'Jurídico', 'Educação', 'Assistência Social']),
            instituicao: rand(['UBS 01', 'Defensoria Pública', 'Escola Classe 06', 'CRAS', 'INSS']),
            motivo: "Necessidade identificada durante atendimento técnico.",
            status: rand(['PENDENTE', 'CONCLUIDO']),
            dataEnvio: addDays(dataEntrada, randInt(5, 60))
            }
        })
      }
    }

    // Agendamentos Individuais (Futuros e Passados)
    if (status !== CaseStatus.DESLIGADO) {
      const respAgend = especialistaResp || agenteResp
      if (respAgend) {
          if (Math.random() > 0.6) {
            await prisma.agendamento.create({
              data: {
              casoId: newCase.id,
              responsavelId: respAgend.id,
              titulo: rand(['Visita Domiciliar', 'Atendimento Psicossocial', 'Reunião de Rede']),
              data: faker.date.soon({ days: 30 }),
              observacoes: "Confirmar presença."
              }
            })
          }
      }
    }

    process.stdout.write('.')
  }

  // 4. Criar Grupos e Oficinas
  console.log('\n👥 Criando Grupos e Oficinas...')
  const NUM_GROUPS = 12
  for (let i = 0; i < NUM_GROUPS; i++) {
    const facilitator = faker.helpers.arrayElement(especialistas)
    
    // Mistura datas passadas e futuras
    const isFuture = Math.random() > 0.5
    const groupDate = isFuture ? faker.date.soon({ days: 60 }) : faker.date.recent({ days: 60 })
    const tema = faker.helpers.arrayElement(TEMAS_GRUPO)
    const parceiros = faker.helpers.arrayElements(ORGAOS_REDE, randInt(0, 2))

    let tipo = GroupType.GRUPO_PAEFI
    if (tema.includes('Oficina')) tipo = GroupType.OFICINA
    if (tema.includes('Acolhida')) tipo = GroupType.ACOLHIDA_COLETIVA

    const grupo = await prisma.groupActivity.create({
      data: {
        tema,
        tipo,
        dataRealizacao: groupDate,
        local: 'Sala de Grupos CREAS',
        descricao: 'Atividade realizada com foco no fortalecimento de vínculos.',
        orgaosEnvolvidos: parceiros,
        facilitadorId: facilitator.id
      }
    })

    const numParticipantes = faker.number.int({ min: 3, max: 10 })
    const participantes = faker.helpers.arrayElements(createdCases, numParticipantes)

    for (const p of participantes) {
      await prisma.groupAttendance.create({
        data: {
          grupoId: grupo.id,
          casoId: p.id,
          presente: isFuture ? false : Math.random() > 0.2
        }
      })

      if (!isFuture) {
         await prisma.evolucao.create({
            data: {
              casoId: p.id,
              autorId: facilitator.id,
              conteudo: `[SISTEMA] Registro de Frequência - ${tema} (${tipo}). Participação em grupo.`,
              createdAt: groupDate
            }
         })
      }
    }
  }

  console.log('\n✅ Seed v4.4.1 COMPLETO concluído com sucesso!')
}

main().catch(console.error).finally(() => prisma.$disconnect())