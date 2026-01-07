import { PrismaClient, CaseStatus, Cargo, LogAction, CaseOrigin, GroupType } from '@prisma/client'
import { faker } from '@faker-js/faker/locale/pt_BR'
import bcrypt from 'bcryptjs'
import { addDays, subDays, differenceInDays } from 'date-fns'

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

// --- LISTAS DE NEGÓCIO (ORIGINAIS MANTIDAS) ---
const LISTA_URGENCIAS = [
  'Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte',
  'Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente',
  'PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante',
  'Sem risco imediato', 'Visita periódica'
]

const LISTA_VIOLACOES = [
  'Abandono', 'Negligência', 'Afastamento do convívio familiar',
  'Cumprimento de medidas socioeducativas', 'Descumprimento de condicionalidade do PBF',
  'Discriminação', 'Situação de rua', 'Trabalho infantil',
  'Violência física e/ou psicológica', 'Violência sexual', 'Outros'
]

const LISTA_DESTINOS = [
  'Referenciado ao CRAS (PAIF)', 'Serviço de Saúde (CAPS/UBS)', 'Sistema de Justiça',
  'Acolhimento Institucional', 'Superação da Vulnerabilidade (Autonomia)',
  'Mudança de Município/Estado', 'Outro'
]

const BENEFICIOS_EVENTUAIS = [
  'Auxilio Natalidade', 'Auxilio Calamidade', 'Benefício Excepcional', 
  'Prato Cheio', 'Auxilio Vulnerabilidade', 'Cesta de Alimentos'
]

const TRANSFERENCIA_RENDA = [
  'PROGRAMA BOLSA FAMÍLIA (PBF)', 'PROGRAMA DF SOCIAL', 
  'PROGRAMA CARTÃO GÁS', 'BENEFÍCIO DE PRESTAÇÃO CONTINUADA (BPC)'
]

const MOTIVOS_DESLIGAMENTO = [
  'Transferência de território', 'Falecimento do(a) usuário(a)',
  'Recusa do atendimento por parte do(a) usuário(a)', 'Usuário(a) não localizado(a)',
  'Usuário(a) acolhido(a)', 'Minimização dos riscos', 'Não pertencente à demanda do CREAS'
]

const ORGAOS_REDE = ['Conselho Tutelar', 'UBS', 'CAPS', 'Escola', 'CRAS', 'Defensoria Pública', 'MPDFT']
const TEMAS_GRUPO = ['Oficina de Parentalidade', 'Grupo de Mulheres', 'Acolhida Coletiva', 'Roda de Conversa BPC', 'Grupo de Idosos']

const EVOLUCAO_TEMPLATES = [
  "Realizada visita domiciliar. Família apresenta vulnerabilidade habitacional. Orientado sobre documentação necessária para inclusão no Cadastro Único.",
  "Atendimento presencial na unidade. Usuário relata melhora na convivência familiar após encaminhamento para o CAPS.",
  "Contato telefônico com a rede de saúde (UBS) para verificar agendamento de consulta psiquiátrica. Confirmado para a próxima semana.",
  "Escuta qualificada realizada. Identificada demanda de violação de direitos (negligência). Inserido no PAEFI para acompanhamento sistemático.",
  "Usuário compareceu para solicitar benefícios eventuais (Cesta de Alimentos). Benefício concedido mediante parecer técnico favorável.",
  "Realizada articulação com o Conselho Tutelar para discussão de caso complexo envolvendo evasão escolar e trabalho infantil.",
  "Genitora compareceu solicitando orientações jurídicas. Encaminhada para a Defensoria Pública."
]

const PAF_OBJETIVOS = [
  "Fortalecer a função protetiva da família.",
  "Superar a situação de violação de direitos (Negligência).",
  "Promover o acesso à rede de serviços socioassistenciais.",
  "Garantir a convivência familiar e comunitária.",
  "Inserção no mercado de trabalho e autonomia financeira."
]

// --- UTILS ---
const randInt = (min: number, max: number) => faker.number.int({ min, max })
const generateCPF = () => faker.string.numeric(11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

async function main() {
  console.log('🌱 [SEED V7.0 - ADAPTADO] Iniciando povoamento...')

  // 1. Limpeza
  try {
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
    console.log('🧹 Banco limpo.')
  } catch (e) {
    console.warn("⚠️  Aviso: Banco já estava limpo ou erro na limpeza.")
  }

  // 2. Usuários
  console.log('👥 Criando equipe técnica...')
  const passwordHash = await bcrypt.hash('123456', 6)
  const users = []
  
  for (const u of TEAM_DATA) {
    const user = await prisma.user.create({
      data: {
        nome: u.nome, email: u.email, matricula: u.matricula, senha: passwordHash, cargo: u.cargo, ativo: true
      }
    })
    users.push(user)
  }
  
  const gerentes = users.filter(u => u.cargo === Cargo.Gerente)
  const especialistas = users.filter(u => u.cargo === Cargo.Especialista)
  const agentes = users.filter(u => u.cargo === Cargo.Agente_Social)
  const createdCases: any[] = []

  // 3. Casos
  const NUM_CASES = 150
  console.log(`📂 Gerando ${NUM_CASES} casos...`)

  for (let i = 0; i < NUM_CASES; i++) {
    const dataEntrada = faker.date.past({ years: 1 })
    const origem = faker.helpers.arrayElement(Object.values(CaseOrigin))
    
    // Status Logic
    const statusRoll = Math.random()
    let status = CaseStatus.AGUARDANDO_ACOLHIDA
    if (statusRoll > 0.10) status = CaseStatus.EM_ACOLHIDA 
    if (statusRoll > 0.25) status = CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI 
    if (statusRoll > 0.35) status = CaseStatus.EM_ACOLHIDA_ESPECIALIZADA 
    if (statusRoll > 0.45) status = CaseStatus.EM_ACOMPANHAMENTO_PAEFI 
    if (statusRoll > 0.75) status = CaseStatus.EM_MONITORAMENTO 
    if (statusRoll > 0.90) status = CaseStatus.DESLIGADO 

    const criador = faker.helpers.arrayElement([...gerentes, ...agentes])
    const agenteResp = faker.helpers.arrayElement(agentes)
    const needsSpecialist = [CaseStatus.EM_ACOLHIDA_ESPECIALIZADA, CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO, CaseStatus.DESLIGADO].includes(status)
    const especialistaResp = needsSpecialist ? faker.helpers.arrayElement(especialistas) : null

    // Lógica de Desligamento
    let desligamentoData = {}
    if (status === CaseStatus.DESLIGADO) {
        desligamentoData = {
            dataDesligamento: addDays(dataEntrada, randInt(60, 300)),
            motivoDesligamento: faker.helpers.arrayElement(MOTIVOS_DESLIGAMENTO),
            destinoDesligamento: faker.helpers.arrayElement(LISTA_DESTINOS),
            parecerFinal: "Superação de vulnerabilidade identificada após intervenção."
        }
    }

    // Urgência
    const urgencia = faker.helpers.arrayElement(LISTA_URGENCIAS)
    const calculateUrgencyWeight = (u: string) => {
        if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(u)) return 4;
        if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(u)) return 3;
        if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(u)) return 2;
        return 1;
    }

    // CRIAÇÃO DO CASO
    const newCase = await prisma.case.create({
      data: {
        nomeCompleto: faker.person.fullName(),
        // [CORREÇÃO] CPF Obrigatório no schema atual
        cpf: generateCPF(), 
        nascimento: faker.date.birthdate({ min: 14, max: 85, mode: 'age' }),
        sexo: faker.helpers.arrayElement(['Masculino', 'Feminino']),
        telefone: `(61) 9${randInt(8000, 9999)}-${randInt(1000, 9999)}`,
        endereco: `Qd ${randInt(1, 50)} Conj ${String.fromCharCode(65 + randInt(0, 20))} - Brazlândia`,
        
        urgencia,
        pesoUrgencia: calculateUrgencyWeight(urgencia),
        violacao: faker.helpers.arrayElement(LISTA_VIOLACOES),
        categoria: faker.helpers.arrayElement(['Idoso', 'PCD', 'Mulher', 'Família', 'Criança/Adolescente']),
        
        origem,
        dataEntrada,
        orgaoDemandante: origem === CaseOrigin.ESPONTANEA ? 'Demanda Espontânea' : faker.helpers.arrayElement(['Disque 100', 'MPDFT', 'UBS 01', 'CRAS', 'Conselho Tutelar']),
        numeroSei: `00431-${faker.string.numeric(8)}/2025`,
        beneficios: faker.helpers.arrayElements(TRANSFERENCIA_RENDA, randInt(0, 2)), 
        
        status,
        
        // [CORREÇÃO] Relações com connect
        criadoPor: { connect: { id: criador.id } },
        agenteAcolhida: agenteResp ? { connect: { id: agenteResp.id } } : undefined,
        especialistaPAEFI: especialistaResp ? { connect: { id: especialistaResp.id } } : undefined,
        
        dataInicioPAEFI: especialistaResp ? addDays(dataEntrada, randInt(10, 30)) : null,
        
        // Dados de desligamento se aplicável
        ...desligamentoData
      }
    })
    createdCases.push(newCase)

    // Log Criação
    await prisma.caseLog.create({
        data: { casoId: newCase.id, autorId: criador.id, acao: LogAction.CRIACAO, descricao: 'Caso criado via Seed.', createdAt: dataEntrada }
    })

    // Evoluções
    if (status !== CaseStatus.AGUARDANDO_ACOLHIDA) {
        const numEvolucoes = randInt(1, 5);
        for(let e = 0; e < numEvolucoes; e++) {
            const dataEvolucao = faker.date.between({ from: dataEntrada, to: new Date() });
            const autorEvolucao = especialistaResp || agenteResp || criador;
            await prisma.evolucao.create({
                data: {
                    casoId: newCase.id,
                    autorId: autorEvolucao.id,
                    conteudo: `[ATENDIMENTO] ` + faker.helpers.arrayElement(EVOLUCAO_TEMPLATES), 
                    sigilo: Math.random() > 0.9, createdAt: dataEvolucao
                }
            });
        }
    }

    // PAF
    if ([CaseStatus.EM_ACOMPANHAMENTO_PAEFI, CaseStatus.EM_MONITORAMENTO].includes(status) && especialistaResp) {
        await prisma.paf.create({
            data: {
                casoId: newCase.id,
                autorId: especialistaResp.id,
                diagnostico: `Situação de risco: ${urgencia}. Violação: ${newCase.violacao}`,
                objetivos: faker.helpers.arrayElement(PAF_OBJETIVOS),
                estrategias: "Visitas mensais, encaminhamento para CRAS e BPC.",
                deadline: addDays(dataEntrada, 180),
                createdAt: addDays(dataEntrada, 30)
            }
        });
    }

    // Agendamentos (Futuro e Passado)
    const responsavelAgendamento = especialistaResp || agenteResp || criador;

    // 1. Passado
    if (Math.random() > 0.3) {
       await prisma.agendamento.create({
         data: {
           titulo: 'Visita Domiciliar Realizada',
           data: faker.date.recent({ days: 30 }), 
           casoId: newCase.id,
           responsavelId: responsavelAgendamento.id,
           observacoes: 'Visita de monitoramento realizada com sucesso.'
         }
       })
    }

    // 2. Futuro
    if (status !== CaseStatus.DESLIGADO && Math.random() > 0.4) {
       await prisma.agendamento.create({
         data: {
           titulo: faker.helpers.arrayElement(['Atendimento Psicossocial', 'Renovação de PIA', 'Visita Domiciliar', 'Reunião de Rede']),
           data: faker.date.soon({ days: 15 }), 
           casoId: newCase.id,
           responsavelId: responsavelAgendamento.id,
           observacoes: 'Confirmar presença por telefone.'
         }
       })
    }

    // Benefícios
    if (status !== CaseStatus.AGUARDANDO_ACOLHIDA && Math.random() > 0.2) {
        const numEventuais = randInt(1, 3)
        for (let j = 0; j < numEventuais; j++) {
           await prisma.serviceDeliverable.create({
             data: {
               casoId: newCase.id,
               responsavelId: agenteResp?.id || criador.id,
               tipo: faker.helpers.arrayElement(BENEFICIOS_EVENTUAIS),
               status: faker.helpers.arrayElement(['SOLICITADO', 'CONCEDIDO', 'ENTREGUE']),
               dataSolicitacao: subDays(new Date(), randInt(1, 180)),
               observacoes: 'Concessão para segurança alimentar.'
             }
           })
        }
    }

    // Encaminhamentos
    if (Math.random() > 0.4) {
      const autorEnc = especialistaResp || agenteResp
      if (autorEnc) {
          const numEnc = randInt(1, 3)
          for(let k=0; k<numEnc; k++) {
            await prisma.encaminhamento.create({
                data: {
                casoId: newCase.id,
                autorId: autorEnc.id,
                tipo: faker.helpers.arrayElement(['Saúde', 'Jurídico', 'Educação']),
                instituicao: faker.helpers.arrayElement(ORGAOS_REDE),
                motivo: "Necessidade identificada em atendimento.",
                status: faker.helpers.arrayElement(['PENDENTE', 'CONCLUIDO']),
                dataEnvio: subDays(new Date(), randInt(1, 150))
                }
            })
          }
      }
    }

    // Família
    const numMembros = randInt(1, 4)
    for (let m = 0; m < numMembros; m++) {
      await prisma.membroFamilia.create({
        data: {
          casoId: newCase.id,
          nome: faker.person.fullName(),
          parentesco: faker.helpers.arrayElement(['Filho(a)', 'Cônjuge', 'Neto(a)', 'Irmão(ã)']),
          idade: randInt(2, 90),
          cpf: Math.random() > 0.3 ? generateCPF() : null, // Aqui pode ser null, é MembroFamilia, não Case
          renda: randInt(0, 1412) 
        }
      })
    }

    process.stdout.write('.')
  }

  // 4. Logs Adicionais
  console.log('\n📈 Gerando histórico de ações...')
  const allWorkers = [...especialistas, ...agentes]
  const safeActions = [LogAction.MUDANCA_STATUS, LogAction.OUTRO, LogAction.ATRIBUICAO]

  for (const worker of allWorkers) {
    const workVolume = randInt(20, 50)
    for (let k = 0; k < workVolume; k++) {
      const randomCase = faker.helpers.arrayElement(createdCases)
      if (!randomCase) continue;
      await prisma.caseLog.create({
        data: {
          casoId: randomCase.id,
          autorId: worker.id,
          acao: faker.helpers.arrayElement(safeActions),
          descricao: `Atualização administrativa do caso.`,
          createdAt: faker.date.past({ years: 1 })
        }
      })
    }
  }

  // 5. Grupos
  console.log('\n👥 Criando Grupos e Presenças...')
  const NUM_GROUPS = 15
  for (let i = 0; i < NUM_GROUPS; i++) {
    const facilitator = faker.helpers.arrayElement(especialistas)
    const isFuture = Math.random() > 0.7
    const groupDate = isFuture ? faker.date.soon({ days: 30 }) : faker.date.recent({ days: 90 })
    
    const grupo = await prisma.groupActivity.create({
      data: {
        tema: faker.helpers.arrayElement(TEMAS_GRUPO),
        tipo: GroupType.OFICINA,
        dataRealizacao: groupDate,
        local: 'Sala de Grupos',
        descricao: 'Atividade de fortalecimento de vínculos.',
        // [CORREÇÃO] Connect no facilitador e AttendanceConfirmed
        facilitador: { connect: { id: facilitator.id } },
        attendanceConfirmed: !isFuture 
      }
    })

    const participantes = faker.helpers.arrayElements(createdCases, randInt(5, 12))
    for (const p of participantes) {
      await prisma.groupAttendance.create({
        data: {
          grupoId: grupo.id,
          casoId: p.id,
          presente: !isFuture // Se já passou, assume presença
        }
      })
    }
  }

  console.log('\n✅ Seed V7.0 COMPLETO! Agendamentos Individuais e Grupos gerados.')
}

main().catch(console.error).finally(() => prisma.$disconnect())