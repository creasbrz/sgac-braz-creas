// backend/prisma/seed.ts
import { PrismaClient, CaseStatus, Cargo, LogAction } from '@prisma/client'
import { faker } from '@faker-js/faker/locale/pt_BR'
import bcrypt from 'bcryptjs'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

// --- DADOS REAIS DA EQUIPE ---
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

const DEFAULT_PASSWORD = 'senha-segura-123'
const NUM_CASES = 80
const FIXED_SEI = '00431-00005359/2025-14'
const FIXED_LINK_SEI = 'http://sei.df.gov.br/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=184671104'

const EVOLUCOES_TEXTOS = [
  "Realizada visita domiciliar. Família reside em condições precárias de habitabilidade. Identificada insegurança alimentar.",
  "Atendimento presencial na unidade. O usuário relata conflitos familiares intensos e solicita orientação jurídica.",
  "Contato telefônico com a rede de saúde (CAPS) para verificar adesão ao tratamento. Confirmado comparecimento regular.",
  "Usuário compareceu para atualização cadastral. Documentação apresentada está completa.",
  "Realizada escuta especializada. O relato sugere violação de direitos patrimoniais contra a pessoa idosa.",
  "Encaminhamento realizado para o CRAS visando inserção no PAIF e acesso a benefícios eventuais.",
  "Participação em estudo de caso com a rede intersetorial. Definido plano de cuidados conjunto.",
  "Família não localizada no endereço informado. Vizinhos relataram mudança para local desconhecido.",
]

// --- UTILITÁRIOS ---
const rand = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min: number, max: number) => faker.number.int({ min, max })
function generateCPF() {
  const n = () => randInt(0, 9)
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`
}

const calculateUrgencyWeight = (urgencia: string): number => {
  const term = urgencia.trim()
  if (['Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte'].includes(term)) return 4;
  if (['Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente'].includes(term)) return 3;
  if (['PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante'].includes(term)) return 2;
  return 1;
}

async function main() {
  console.log('🌱 Iniciando Seed v3.3 (Atualizado)...')

  console.log('🧹 Limpando banco de dados...')
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

  console.log('👥 Criando equipe técnica...')
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 6)
  
  const agentes: any[] = []
  const especialistas: any[] = []
  let gerente: any = null

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
    
    if (u.cargo === Cargo.Agente_Social) agentes.push(user)
    if (u.cargo === Cargo.Especialista) especialistas.push(user)
    if (u.cargo === Cargo.Gerente) gerente = user
  }

  console.log(`📂 Gerando ${NUM_CASES} casos completos...`)
  
  for (let i = 0; i < NUM_CASES; i++) {
    const sexo = rand(['Masculino', 'Feminino'])
    const dataEntrada = faker.date.past({ years: 1 })
    const urgencia = rand(['Sem risco imediato', 'Visita periódica', 'Idoso 80+', 'Risco de desabrigo', 'Sofre ameaça'])
    const pesoUrgencia = calculateUrgencyWeight(urgencia)
    
    const statusRoll = Math.random()
    let status = CaseStatus.AGUARDANDO_ACOLHIDA
    if (statusRoll > 0.2) status = CaseStatus.EM_ACOLHIDA
    if (statusRoll > 0.4) status = CaseStatus.AGUARDANDO_DISTRIBUICAO_PAEFI
    if (statusRoll > 0.5) status = CaseStatus.EM_ACOMPANHAMENTO_PAEFI
    if (statusRoll > 0.9) status = CaseStatus.DESLIGADO

    const agente = rand(agentes)
    const especialista = (status === CaseStatus.EM_ACOMPANHAMENTO_PAEFI || status === CaseStatus.DESLIGADO) 
      ? rand(especialistas) 
      : null

    // Motivo de desligamento
    let motivoDesligamento = null
    if (status === CaseStatus.DESLIGADO) {
        // [NOVO - Pedido 2] Incluindo "Usuário não localizado"
        motivoDesligamento = rand(['Superação da situação de violação', 'Usuário não localizado (Busca Ativa esgotada)', 'Mudança de endereço para outra região'])
    }

    const newCase = await prisma.case.create({
      data: {
        nomeCompleto: faker.person.fullName({ sex: sexo === 'Masculino' ? 'male' : 'female' }),
        cpf: generateCPF(),
        nascimento: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
        sexo,
        telefone: faker.helpers.fromRegExp(/\(61\) 9[0-9]{4}-[0-9]{4}/),
        endereco: `${faker.location.street()}, Qd ${randInt(1, 50)} Casa ${randInt(1, 30)} - Brazlândia`,
        urgencia,
        pesoUrgencia,
        violacao: rand(['Negligência', 'Violência Patrimonial', 'Violência Psicológica', 'Abandono', 'Conflito Familiar']),
        categoria: rand(['Idoso', 'PCD', 'Mulher', 'Família']),
        dataEntrada,
        orgaoDemandante: rand(['Disque 100', 'MPDFT', 'UBS', 'CRAS', 'Demanda Espontânea']),
        numeroSei: FIXED_SEI,
        linkSei: FIXED_LINK_SEI,
        observacoes: faker.lorem.paragraph(),
        beneficios: faker.helpers.arrayElements(['BPC', 'Bolsa Família', 'DF Social'], randInt(0, 2)),
        status,
        criadoPorId: gerente.id,
        agenteAcolhidaId: agente.id,
        especialistaPAEFIId: especialista?.id,
        dataInicioPAEFI: especialista ? addDays(dataEntrada, randInt(5, 20)) : null,
        dataDesligamento: status === CaseStatus.DESLIGADO ? new Date() : null,
        motivoDesligamento
      }
    })

    // [NOVO - Pedido 1] Log de Criação via Sistema
    await prisma.caseLog.create({
        data: {
            casoId: newCase.id,
            autorId: gerente.id,
            acao: LogAction.CRIACAO,
            descricao: 'Caso importado via sistema (Seed/Migração).',
            createdAt: dataEntrada
        }
    })

    // 3. Sub-dados

    const numMembros = randInt(1, 4)
    for (let m = 0; m < numMembros; m++) {
      await prisma.membroFamilia.create({
        data: {
          casoId: newCase.id,
          nome: faker.person.fullName(),
          parentesco: rand(['Filho(a)', 'Cônjuge', 'Neto(a)', 'Irmão(ã)']),
          idade: randInt(5, 80),
          cpf: generateCPF(),
          nascimento: faker.date.birthdate(),
          telefone: Math.random() > 0.5 ? faker.helpers.fromRegExp(/\(61\) 9[0-9]{4}-[0-9]{4}/) : null,
          ocupacao: rand(['Estudante', 'Desempregado', 'Aposentado', 'Autônomo']),
          renda: faker.number.float({ min: 0, max: 2000, fractionDigits: 2 })
        }
      })
    }

    const numEvos = randInt(3, 8)
    for (let e = 0; e < numEvos; e++) {
      const isSecret = Math.random() > 0.9
      await prisma.evolucao.create({
        data: {
          casoId: newCase.id,
          autorId: especialista?.id || agente.id,
          conteudo: rand(EVOLUCOES_TEXTOS),
          sigilo: isSecret,
          createdAt: faker.date.between({ from: dataEntrada, to: new Date() })
        }
      })
    }

    if (Math.random() > 0.6) {
      await prisma.encaminhamento.create({
        data: {
          casoId: newCase.id,
          autorId: especialista?.id || agente.id,
          tipo: rand(['Saúde', 'Jurídico', 'Educação']),
          instituicao: rand(['UBS 01 Brazlândia', 'Defensoria Pública', 'Escola Classe 06']),
          motivo: "Necessidade de acompanhamento especializado.",
          status: rand(['PENDENTE', 'CONCLUIDO']),
          dataEnvio: faker.date.recent({ days: 30 })
        }
      })
    }

    if (status !== CaseStatus.DESLIGADO) {
      await prisma.agendamento.create({
        data: {
          casoId: newCase.id,
          responsavelId: especialista?.id || agente.id,
          titulo: rand(['Visita Domiciliar', 'Atendimento Psicossocial', 'Reunião de Rede']),
          data: faker.date.soon({ days: 15 }),
          observacoes: "Confirmar presença."
        }
      })
    }

    process.stdout.write('.')
  }

  console.log('\n✅ Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('Erro fatal no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })