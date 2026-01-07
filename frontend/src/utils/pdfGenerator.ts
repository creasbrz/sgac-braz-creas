import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { api } from "@/lib/api"
import type { TDocumentDefinitions, StyleDictionary, Content } from "pdfmake/interfaces"

// Imports de tipos do projeto
import type { CaseDetailData, FamilyMember, PafData } from "@/types/case"
import type { GroupActivity, GroupAttendance } from "@/types/group"
import { formatDateSafe, formatCPF, formatPhone } from "./formatters"

// --- INTERFACES DE DADOS ---

export enum CaseStatus {
  TRIAGEM = "AGUARDANDO_ACOLHIDA",
  ACOLHIDA = "EM_ACOLHIDA",
  PAEFI = "EM_ACOMPANHAMENTO_PAEFI",
  MSE = "EM_ACOMPANHAMENTO_MSE",
  DESLIGADO = "DESLIGADO"
}

interface ExtendedCaseData extends Omit<CaseDetailData, 'beneficios'> {
  familia?: FamilyMember[]
  idade?: number
  entregas?: any[]
  encaminhamentos?: any[]
  evolucoes?: any[]
  beneficios?: string[]
}

export interface RmaReportData {
  periodo: string
  bloco1: {
    familiasAcompPaefi: number
    novosCasos: number
    desligamentos: number
  }
  bloco2: {
    totalAtendimentos: number
    visitasDomiciliares: number
    abordagensRua: number
  }
  bloco3: {
    violenciaFisica: number
    violenciaPsicologica: number
    negligencia: number
    abusoSexual: number
  }
}

export interface ManagementReportData {
  periodo: string
  stats: { ativos: number; acolhidas: number; paefi: number; novos: number; desligados: number }
  cargaHoraria: { agentes: { name: string; value: number }[]; especialistas: { name: string; value: number }[] }
  vigilancia?: { violacoes: { name: string; value: number }[]; demografia: { name: string; value: number }[]; territorio?: { name: string; value: number }[] }
}

export interface ObservatoryData {
  evolutionData: { name: string; novos: number; desligados: number }[]
  violationData: { name: string; value: number }[]
  urgencyData: { name: string; value: number; weight: number }[]
  originData: { name: string; value: number }[]
  networkData: { name: string; value: number }[]
  benefitsData: { name: string; value: number }[]
  collectiveData: { totalGroups: number; totalParticipants: number; avgAttendance: number }
  efficiencyData: { avgPermanence: number; avgWaitTime: number; totalClosed: number; retentionRate: number }
  ageData: { name: string; value: number }[]
  sexData: { name: string; value: number }[]
}

export interface DismissalReportData {
  periodo: string
  total: number
  successRate: number
  evasionRate: number
  byReason: { name: string; value: number }[]
  monthlyTrend: { name: string; value: number }[]
}

// --- CONFIGURAÇÃO VFS ---
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && (pdfFonts as any).vfs) {
  pdfMake.vfs = (pdfFonts as any).vfs;
} else if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts;
}

// --- CONSTANTES E ESTILOS ---
const BRAND_COLOR = "#2e4a7d"
const HEADER_BG = "#eef2f6"

const COMMON_STYLES: StyleDictionary = {
  header: { fontSize: 14, bold: true, color: BRAND_COLOR, margin: [0, 0, 0, 5] },
  subHeader: { fontSize: 12, bold: true, color: "#333", margin: [0, 10, 0, 5] },
  sectionTitle: { fontSize: 11, bold: true, color: "white", margin: [2, 2, 2, 2] },
  label: { fontSize: 9, bold: true, color: "#555" },
  value: { fontSize: 10, color: "#000" },
  tableHeader: { bold: true, fontSize: 10, color: "black", fillColor: "#e0e0e0", alignment: "center" },
  kpiValue: { fontSize: 16, bold: true, alignment: "center", color: "#333", margin: [0, 5, 0, 0] }
}

const REPORT_TEXTS = {
  header: {
    gov: "GOVERNO DO DISTRITO FEDERAL",
    sec: "SECRETARIA DE ESTADO DE DESENVOLVIMENTO SOCIAL - SEDES",
    unit: "CREAS BRAZLÂNDIA"
  },
  footer: { system: "Sistema de Gestão de Assistência - CREAS Brazlândia\n", page: "Página" }
}

// --- HELPERS DE TABELA ---
const TABLE_LAYOUTS = {
  lightHorizontalLines: {
    hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
    vLineWidth: () => 0,
    hLineColor: '#ccc'
  },
  alternatingRows: {
    fillColor: (i: number) => (i === 0 ? '#e0e0e0' : (i % 2 === 0 ? null : '#f9f9f9')),
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: '#ccc',
    vLineColor: '#ccc'
  }
}

// --- AUDITORIA ---
const registerPdfAudit = async (type: string, details: string, caseId?: string) => {
  try {
    api.post('/audit/log', {
      action: 'GENERATE_PDF',
      resource: type,
      details,
      targetId: caseId,
      timestamp: new Date().toISOString()
    }).catch(err => console.warn("Falha no log de auditoria PDF", err))
  } catch (e) { console.warn(e) }
}

// --- HELPER FINALIZADOR ---
const finalizePdf = (
  docDefinition: TDocumentDefinitions, 
  filenamePrefix: string, 
  identifier: string,
  mode: 'open' | 'download' = 'open'
) => {
  const sanitizedId = identifier.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const filename = `${filenamePrefix}_${sanitizedId}_${dateStr}.pdf`

  const pdf = pdfMake.createPdf(docDefinition)
  
  if (mode === 'download') pdf.download(filename)
  else pdf.open()
}

// --- HELPERS DE LAYOUT ---
const getOfficialHeader = (docTitle: string): Content => ({
  stack: [
    { text: REPORT_TEXTS.header.gov, style: "header", alignment: "center", fontSize: 11, margin: [0, 0, 0, 2] },
    { text: REPORT_TEXTS.header.sec, alignment: "center", fontSize: 9 },
    { text: REPORT_TEXTS.header.unit, alignment: "center", fontSize: 9, bold: true, margin: [0, 0, 0, 5] },
    { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#ccc' }] },
    { text: docTitle.toUpperCase(), style: "header", alignment: "center", margin: [0, 15, 0, 10] }
  ],
  margin: [0, 10, 0, 0]
})

const getOfficialFooter = (currentPage: number, pageCount: number): Content => ({
  stack: [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#ccc' }] },
    {
      text: [
        { text: REPORT_TEXTS.footer.system, bold: true },
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • ${REPORT_TEXTS.footer.page} ${currentPage} de ${pageCount}`
      ],
      alignment: "center",
      fontSize: 8,
      color: "#888",
      margin: [0, 5, 0, 0]
    }
  ],
  margin: [40, 0, 40, 10]
})

const createSectionHeader = (title: string): Content => ({
  table: { widths: ['*'], body: [[{ text: title.toUpperCase(), style: 'sectionTitle', border: [false, false, false, false], fillColor: BRAND_COLOR }]] },
  margin: [0, 15, 0, 10],
  unbreakable: true
})

// ============================================================================
// GERADORES
// ============================================================================

export const generateCasePDF = (caseDataRaw: CaseDetailData, mode: 'open' | 'download' = 'open') => {
  const caseData = caseDataRaw as ExtendedCaseData;
  registerPdfAudit('PRONTUARIO', `Prontuário gerado para: ${caseData.nomeCompleto}`, caseData.id)

  const familyBody: any[] = [
    [{ text: "NOME", style: "tableHeader", alignment: "left" }, { text: "PARENTESCO", style: "tableHeader" }, { text: "IDADE", style: "tableHeader" }, { text: "RENDA", style: "tableHeader" }]
  ]

  if (caseData.familia && caseData.familia.length > 0) {
    caseData.familia.forEach(m => familyBody.push([
      { text: m.nome, fontSize: 9 },
      { text: m.parentesco, fontSize: 9, alignment: "center" },
      { text: m.idade ? `${m.idade} anos` : "-", fontSize: 9, alignment: "center" },
      { text: m.renda ? `R$ ${Number(m.renda).toFixed(2)}` : "-", fontSize: 9, alignment: "right" }
    ]))
  } else {
    familyBody.push([{ text: "Nenhum familiar cadastrado.", colSpan: 4, alignment: "center", fontSize: 9, italics: true }, {}, {}, {}])
  }

  const evolucoesBody: any[] = [[{ text: "DATA/HORA", style: "tableHeader" }, { text: "TÉCNICO", style: "tableHeader" }, { text: "DESCRIÇÃO", style: "tableHeader", alignment: "left" }]];
  if (caseData.evolucoes && caseData.evolucoes.length > 0) {
    caseData.evolucoes.forEach(e => evolucoesBody.push([
      { text: format(new Date(e.createdAt), "dd/MM/yy HH:mm"), fontSize: 8, alignment: 'center' },
      { text: e.autor?.nome || 'Sistema', fontSize: 8, bold: true },
      { text: e.conteudo || e.descricao, fontSize: 8, alignment: 'justify' }
    ]))
  } else {
    evolucoesBody.push([{ text: "Sem registros recentes.", colSpan: 3, alignment: "center", fontSize: 9, italics: true }, {}, {}])
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],
    content: [
      getOfficialHeader("Prontuário Técnico Simplificado"),
      {
        style: 'tableExample',
        table: {
          widths: ['auto', '*'],
          body: [
            [{ text: "NOME:", style: "label" }, { text: caseData.nomeCompleto.toUpperCase(), style: "value", bold: true }],
            [{ text: "CPF:", style: "label" }, { text: formatCPF(caseData.cpf), style: "value" }],
            [{ text: "NASCIMENTO:", style: "label" }, { text: `${formatDateSafe(caseData.nascimento)} (${caseData.idade ?? '?'} anos)`, style: "value" }],
            [{ text: "ENDEREÇO:", style: "label" }, { text: caseData.endereco, style: "value" }],
            [{ text: "CONTATO:", style: "label" }, { text: formatPhone(caseData.telefone), style: "value" }]
          ]
        },
        layout: { hLineWidth: (i) => (i === 0 || i === 5) ? 1 : 0.5, vLineWidth: () => 0, hLineColor: '#ccc', fillColor: (i) => (i % 2 === 0) ? HEADER_BG : null }
      },
      createSectionHeader("1. Situação do Atendimento"),
      {
        columns: [
          { width: '*', text: [{ text: "Status: ", style: "label" }, { text: caseData.status.replace(/_/g, " "), style: "value" }] },
          { width: '*', text: [{ text: "Data Entrada: ", style: "label" }, { text: formatDateSafe(caseData.dataEntrada), style: "value" }] },
          { width: '*', text: [{ text: "Urgência: ", style: "label" }, { text: caseData.urgencia, style: "value" }] }
        ]
      },
      { text: "\n" },
      {
        columns: [
          { width: '*', text: [{ text: "Técnico Acolhida: ", style: "label" }, { text: caseData.agenteAcolhida?.nome || "Não definido", style: "value" }] },
          { width: '*', text: [{ text: "Técnico Referência (PAEFI): ", style: "label" }, { text: caseData.especialistaPAEFI?.nome || "Não definido", style: "value" }] }
        ]
      },
      createSectionHeader("2. Composição Familiar"),
      { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'], body: familyBody }, layout: 'lightHorizontalLines' },
      
      createSectionHeader("3. Benefícios e Rede"),
      { text: "Benefícios Ativos:", fontSize: 10, bold: true, margin: [0, 5, 0, 2] },
      caseData.beneficios?.length ? { ul: caseData.beneficios, fontSize: 9, margin: [10, 0, 0, 10] } : { text: "Nenhum benefício ativo.", fontSize: 9, italics: true, color: "#666", margin: [10, 0, 0, 10] },
      
      { text: '', pageBreak: 'before' },
      createSectionHeader("4. Histórico Técnico (Últimos Registros)"),
      {
        table: { headerRows: 1, widths: [70, 80, '*'], body: evolucoesBody },
        layout: 'lightHorizontalLines'
      },

      createSectionHeader("5. Observações do PAF"),
      {
        text: caseData.status === CaseStatus.PAEFI ? "Caso em acompanhamento PAEFI. Ver anexo PAF detalhado para metas e prazos." : "Não há PAF ativo para o status atual.",
        fontSize: 10, alignment: "justify"
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }

  finalizePdf(docDefinition, "PRONTUARIO", caseData.nomeCompleto, mode)
}

export const generatePafPDF = (caseData: CaseDetailData, paf: PafData, mode: 'open' | 'download' = 'open') => {
  registerPdfAudit('PAF', `PAF Versão ${paf.versaoAtual} gerado`, caseData.id)

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],
    content: [
      getOfficialHeader("Plano de Acompanhamento Familiar (PAF)"),
      {
        table: { widths: ['*'], body: [[{ text: `FAMÍLIA: ${caseData.nomeCompleto.toUpperCase()}`, fontSize: 11, bold: true, fillColor: HEADER_BG, alignment: 'center' }], [{ text: `CPF Resp: ${formatCPF(caseData.cpf)} | Versão: ${paf.versaoAtual}`, fontSize: 10, alignment: 'center' }]] },
        layout: 'noBorders', margin: [0, 0, 0, 20]
      },
      createSectionHeader("1. Diagnóstico Sociofamiliar"),
      { text: paf.diagnostico, fontSize: 10, alignment: "justify", margin: [0, 0, 0, 15] },
      createSectionHeader("2. Objetivos Pactuados"),
      { text: paf.objetivos, fontSize: 10, alignment: "justify", margin: [0, 0, 0, 15] },
      createSectionHeader("3. Estratégias e Encaminhamentos"),
      { text: paf.estrategias, fontSize: 10, alignment: "justify", margin: [0, 0, 0, 15] },
      createSectionHeader("4. Prazos"),
      { text: ["Reavaliação prevista para: ", { text: formatDateSafe(paf.deadline), bold: true }], fontSize: 10, margin: [0, 0, 0, 30] },
      {
        columns: [
          { stack: [{ text: "_______________________", alignment: "center" }, { text: "Usuário(a)", alignment: "center", fontSize: 9 }] },
          { stack: [{ text: "_______________________", alignment: "center" }, { text: paf.autor.nome, alignment: "center", fontSize: 9, bold: true }, { text: "Técnico(a)", alignment: "center", fontSize: 8 }] }
        ],
        margin: [0, 20, 0, 0], unbreakable: true
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }

  finalizePdf(docDefinition, "PAF", caseData.nomeCompleto, mode)
}

export const generateGroupAttendancePDF = (
  group: GroupActivity, 
  participants: GroupAttendance[], 
  type: 'blank' | 'filled' = 'blank', 
  mode: 'open' | 'download' = 'open'
) => {
  registerPdfAudit('GRUPO', `Lista de frequência: ${group.tema}`)
  
  const title = type === 'blank' ? "LISTA DE FREQUÊNCIA" : "RELATÓRIO DE EXECUÇÃO"
  
  const tableHeader = type === 'blank' 
    ? [
        { text: "Nº", style: 'tableHeader', width: 20 },
        { text: "NOME DO PARTICIPANTE", style: 'tableHeader', alignment: 'left' },
        { text: "ASSINATURA / RUBRICA", style: 'tableHeader', alignment: 'left' }
      ]
    : [
        { text: "NOME DO PARTICIPANTE", style: 'tableHeader', alignment: 'left' },
        { text: "STATUS", style: 'tableHeader' },
        { text: "OBSERVAÇÕES", style: 'tableHeader', alignment: 'left' }
      ]

  const tableBody = participants.map((p, index) => {
    if (type === 'blank') {
      return [
        { text: (index + 1).toString(), fontSize: 10, alignment: 'center', margin: [0, 8, 0, 8] },
        { text: p.caso.nomeCompleto.toUpperCase(), fontSize: 10, margin: [0, 8, 0, 8] },
        { text: "", margin: [0, 8, 0, 8] }
      ]
    } else {
      return [
        { text: p.caso.nomeCompleto, fontSize: 10 },
        { text: p.presente ? "PRESENTE" : "AUSENTE", fontSize: 9, bold: true, color: p.presente ? "#166534" : "#991b1b", alignment: 'center' },
        { text: p.observacoes || "-", fontSize: 9 }
      ]
    }
  }) as any[]

  if (type === 'blank') {
    for (let i = 0; i < 5; i++) {
      tableBody.push([
        { text: "", margin: [0, 12, 0, 12] },
        { text: "", margin: [0, 12, 0, 12] },
        { text: "", margin: [0, 12, 0, 12] }
      ])
    }
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],
    content: [
      getOfficialHeader(title),
      {
        style: 'tableExample',
        table: {
          widths: ['15%', '35%', '15%', '35%'],
          body: [
            [
              { text: "ATIVIDADE:", style: "label", fillColor: HEADER_BG }, 
              { text: group.tema, style: "value", fillColor: HEADER_BG, colSpan: 3 }, 
              {}, {}
            ],
            [
              { text: "TIPO:", style: "label" }, { text: group.tipo.replace(/_/g, ' '), style: "value" },
              { text: "DATA:", style: "label" }, { text: format(new Date(group.dataRealizacao), "dd/MM/yyyy HH:mm"), style: "value" }
            ],
            [
              { text: "LOCAL:", style: "label" }, { text: group.local || "CREAS", style: "value" },
              { text: "TÉCNICO:", style: "label" }, { text: group.facilitador.nome, style: "value" }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: '#ccc',
          vLineColor: '#ccc'
        }
      },
      { text: "\n" },
      {
        table: {
          headerRows: 1,
          widths: type === 'blank' ? [25, '*', 150] : ['*', 70, '*'],
          body: [
            tableHeader,
            ...tableBody
          ]
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0) ? '#e0e0e0' : (rowIndex % 2 === 0 ? null : '#f9f9f9'),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: '#aaa',
          vLineColor: '#aaa'
        }
      },
      (type === 'blank' ? {
        stack: [
          { text: "______________________________________________________", alignment: "center", margin: [0, 40, 0, 5] },
          { text: group.facilitador.nome, alignment: "center", fontSize: 10, bold: true },
          { text: "Técnico(a) Responsável", alignment: "center", fontSize: 9 }
        ],
        unbreakable: true
      } : {}) as Content
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }
  
  finalizePdf(docDefinition, "GRUPO", group.tema, mode)
}

// ----------------------------------------------------------------------------
// [NOVO] GERADOR DE RMA (Modelo Oficial SUAS)
// ----------------------------------------------------------------------------
export const generateRmaPDF = (data: RmaReportData, mode: 'open' | 'download' = 'open') => {
  registerPdfAudit('RMA', `RMA gerado: ${data.periodo}`)

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      getOfficialHeader("REGISTRO MENSAL DE ATENDIMENTOS (RMA)"),
      { text: [{ text: "MÊS DE REFERÊNCIA: ", bold: true }, data.periodo], alignment: "center", margin: [0, 0, 0, 20] },

      createSectionHeader("BLOCO I - Famílias e Indivíduos em Acompanhamento"),
      {
        table: {
          widths: ['*', 80],
          body: [
            [{ text: "INDICADOR", style: "tableHeader", alignment: "left" }, { text: "TOTAL", style: "tableHeader" }],
            [{ text: "A.1. Famílias em acompanhamento PAEFI", fontSize: 10 }, { text: String(data.bloco1.familiasAcompPaefi), alignment: "center" }],
            [{ text: "A.2. Novos casos inseridos no mês", fontSize: 10 }, { text: String(data.bloco1.novosCasos), alignment: "center" }],
            [{ text: "A.3. Casos desligados no mês", fontSize: 10 }, { text: String(data.bloco1.desligamentos), alignment: "center" }]
          ]
        }, layout: 'lightHorizontalLines'
      },

      createSectionHeader("BLOCO II - Atendimentos Realizados"),
      {
        table: {
          widths: ['*', 80],
          body: [
            [{ text: "TIPO DE ATENDIMENTO", style: "tableHeader", alignment: "left" }, { text: "QTD", style: "tableHeader" }],
            [{ text: "B.1. Total de atendimentos particularizados", fontSize: 10 }, { text: String(data.bloco2.totalAtendimentos), alignment: "center" }],
            [{ text: "B.2. Visitas domiciliares realizadas", fontSize: 10 }, { text: String(data.bloco2.visitasDomiciliares), alignment: "center" }],
            [{ text: "B.3. Abordagens sociais (Rua)", fontSize: 10 }, { text: String(data.bloco2.abordagensRua), alignment: "center" }]
          ]
        }, layout: 'lightHorizontalLines'
      },

      createSectionHeader("BLOCO III - Violações Identificadas"),
      {
        table: {
          widths: ['*', 80],
          body: [
            [{ text: "NATUREZA DA VIOLAÇÃO", style: "tableHeader", alignment: "left" }, { text: "CASOS", style: "tableHeader" }],
            [{ text: "C.1. Violência Física", fontSize: 10 }, { text: String(data.bloco3.violenciaFisica), alignment: "center" }],
            [{ text: "C.2. Violência Psicológica", fontSize: 10 }, { text: String(data.bloco3.violenciaPsicologica), alignment: "center" }],
            [{ text: "C.3. Negligência / Abandono", fontSize: 10 }, { text: String(data.bloco3.negligencia), alignment: "center" }],
            [{ text: "C.4. Abuso / Exploração Sexual", fontSize: 10 }, { text: String(data.bloco3.abusoSexual), alignment: "center" }]
          ]
        }, layout: 'lightHorizontalLines'
      },
      
      { text: "\nDeclaro que as informações acima são verdadeiras e baseadas nos registros técnicos da unidade.", fontSize: 9, italics: true, alignment: "center", margin: [0, 30, 0, 0] },
      
      {
        stack: [
          { text: "______________________________________________________", alignment: "center", margin: [0, 40, 0, 5] },
          { text: "Coordenador(a) do CREAS", alignment: "center", fontSize: 10, bold: true }
        ],
        unbreakable: true
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }

  finalizePdf(docDefinition, "RMA_SUAS", data.periodo, mode)
}

export const generateManagementPDF = (data: ManagementReportData, mode: 'open' | 'download' = 'open') => {
  registerPdfAudit('RELATORIO_GESTAO', `Relatório gerencial: ${data.periodo}`)

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4", pageMargins: [40, 60, 40, 60],
    content: [
      getOfficialHeader("Relatório Gerencial de Monitoramento"),
      { text: [{ text: "PERÍODO: ", bold: true, fontSize: 10 }, { text: data.periodo.toUpperCase(), fontSize: 10 }], margin: [0, 0, 0, 20], alignment: "center" },
      createSectionHeader("1. Indicadores de Volume"),
      {
        table: {
          widths: ['*', '*', '*', '*', '*'],
          body: [
            [{ text: "ATIVOS", style: "tableHeader" }, { text: "ACOLHIDA", style: "tableHeader" }, { text: "ACOMPANHAMENTO", style: "tableHeader" }, { text: "NOVOS", style: "tableHeader" }, { text: "DESLIGADOS", style: "tableHeader" }],
            [{ text: String(data.stats.ativos), style: "kpiValue" }, { text: String(data.stats.acolhidas), style: "kpiValue" }, { text: String(data.stats.paefi), style: "kpiValue" }, { text: String(data.stats.novos), style: "kpiValue", color: "#2563eb" }, { text: String(data.stats.desligados), style: "kpiValue", color: "#16a34a" }]
          ]
        }, layout: 'noBorders', margin: [0, 0, 0, 15]
      },
      createSectionHeader("2. Equipe Técnica"),
      {
        columns: [
          { width: '48%', stack: [{ text: "AGENTES (ACOLHIDA)", style: "subHeader", fontSize: 9, alignment: "center" }, { table: { widths: ['*', 40], body: [[{ text: "Técnico", style: "tableHeader", alignment: "left" }, { text: "Qtd", style: "tableHeader" }], ...data.cargaHoraria.agentes.map(a => [{ text: a.name, fontSize: 9 }, { text: String(a.value), fontSize: 9, alignment: "center", bold: true }])] }, layout: 'lightHorizontalLines' }] },
          { width: '4%', text: '' },
          { width: '48%', stack: [{ text: "ESPECIALISTAS (PAEFI)", style: "subHeader", fontSize: 9, alignment: "center" }, { table: { widths: ['*', 40], body: [[{ text: "Técnico", style: "tableHeader", alignment: "left" }, { text: "Qtd", style: "tableHeader" }], ...data.cargaHoraria.especialistas.map(e => [{ text: e.name, fontSize: 9 }, { text: String(e.value), fontSize: 9, alignment: "center", bold: true }])] }, layout: 'lightHorizontalLines' }] }
        ]
      },
      ...(data.vigilancia ? [{ text: '', pageBreak: 'before' }, createSectionHeader("3. Vigilância Socioassistencial"), { table: { widths: ['*', 60, 60], body: [[{ text: "VIOLAÇÃO", style: "tableHeader", alignment: "left" }, { text: "CASOS", style: "tableHeader" }, { text: "%", style: "tableHeader" }], ...data.vigilancia.violacoes.map(v => [{ text: v.name, fontSize: 10 }, { text: String(v.value), fontSize: 10, alignment: "center" }, { text: ((v.value / (data.stats.ativos || 1)) * 100).toFixed(1) + '%', fontSize: 10, alignment: "center" }])] }, layout: 'lightHorizontalLines' }] : []) as any
    ],
    footer: getOfficialFooter, styles: COMMON_STYLES
  }
  
  finalizePdf(docDefinition, "GESTAO", data.periodo, mode)
}

export const generateObservatoryPDF = (data: ObservatoryData, mode: 'open' | 'download' = 'open') => {
  registerPdfAudit('OBSERVATORIO', `Observatório Social Detalhado gerado em ${new Date().toLocaleDateString()}`)
  
  const totalViolacoes = data.violationData.reduce((acc, v) => acc + v.value, 0) || 1
  const totalBeneficios = data.benefitsData.reduce((acc, b) => acc + b.value, 0) || 1
  const totalCasosPerfil = data.sexData.reduce((acc, s) => acc + s.value, 0) || 1

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      getOfficialHeader("Relatório do Observatório Social"),
      { 
        text: [
          { text: "EMISSÃO: ", bold: true }, 
          `${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}`
        ], 
        alignment: "center", 
        fontSize: 10, 
        margin: [0, 0, 0, 20] 
      },

      // 1. DINÂMICA DE ATENDIMENTO
      createSectionHeader("1. Dinâmica de Atendimentos (Fluxo Mensal)"),
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: "MÊS DE REFERÊNCIA", style: "tableHeader", alignment: "left" },
              { text: "NOVOS CASOS", style: "tableHeader" },
              { text: "DESLIGAMENTOS", style: "tableHeader" },
              { text: "SALDO LÍQUIDO", style: "tableHeader" }
            ],
            ...data.evolutionData.map(d => [
              { text: d.name, fontSize: 10 },
              { text: String(d.novos), fontSize: 10, alignment: "center", color: "#2563eb", bold: true },
              { text: String(d.desligados), fontSize: 10, alignment: "center", color: "#16a34a", bold: true },
              { text: String(d.novos - d.desligados), fontSize: 10, alignment: "center", bold: true }
            ]),
            [
              { text: "TOTAL NO PERÍODO", style: "tableHeader", alignment: "right" },
              { text: String(data.evolutionData.reduce((acc, d) => acc + d.novos, 0)), style: "tableHeader" },
              { text: String(data.evolutionData.reduce((acc, d) => acc + d.desligados, 0)), style: "tableHeader" },
              { text: String(data.evolutionData.reduce((acc, d) => acc + (d.novos - d.desligados), 0)), style: "tableHeader" }
            ]
          ]
        },
        layout: TABLE_LAYOUTS.lightHorizontalLines as any,
        margin: [0, 0, 0, 15]
      },

      // 2. DETALHAMENTO DE VIOLAÇÕES
      createSectionHeader("2. Analítico de Violações de Direitos"),
      {
        table: {
          widths: ['*', 60, 60],
          body: [
            [
              { text: "TIPIFICAÇÃO DA VIOLAÇÃO", style: "tableHeader", alignment: "left" },
              { text: "OCORRÊNCIAS", style: "tableHeader" },
              { text: "% DO TOTAL", style: "tableHeader" }
            ],
            ...data.violationData
              .sort((a, b) => b.value - a.value)
              .map(v => [
                { text: v.name, fontSize: 10 },
                { text: String(v.value), fontSize: 10, alignment: "center" },
                { text: ((v.value / totalViolacoes) * 100).toFixed(1) + '%', fontSize: 10, alignment: "center" }
              ])
          ]
        },
        layout: TABLE_LAYOUTS.alternatingRows as any,
        margin: [0, 0, 0, 15]
      },

      { text: '', pageBreak: 'before' },

      // 3. PERFIL E RISCO
      {
        columns: [
          {
            width: '48%',
            stack: [
              createSectionHeader("3. Estratificação de Risco"),
              {
                table: {
                  widths: ['*', 50],
                  body: [
                    [{ text: "NÍVEL DE URGÊNCIA", style: "tableHeader", alignment: "left" }, { text: "QTD", style: "tableHeader" }],
                    ...data.urgencyData.map(u => [
                      { text: u.name, fontSize: 10 },
                      { text: String(u.value), fontSize: 10, alignment: "center", bold: true }
                    ])
                  ]
                },
                layout: TABLE_LAYOUTS.lightHorizontalLines as any
              }
            ]
          },
          { width: '4%', text: '' },
          {
            width: '48%',
            stack: [
              createSectionHeader("4. Perfil - Gênero"),
              {
                table: {
                  widths: ['*', 40, 45],
                  body: [
                    [{ text: "GÊNERO", style: "tableHeader", alignment: "left" }, { text: "QTD", style: "tableHeader" }, { text: "%", style: "tableHeader" }],
                    ...data.sexData.map(s => [
                      { text: s.name, fontSize: 10 },
                      { text: String(s.value), fontSize: 10, alignment: "center" },
                      { text: ((s.value / totalCasosPerfil) * 100).toFixed(1) + '%', fontSize: 10, alignment: "center" }
                    ])
                  ]
                },
                layout: TABLE_LAYOUTS.lightHorizontalLines as any
              }
            ]
          }
        ]
      },

      // 5. PERFIL ETÁRIO
      createSectionHeader("5. Perfil Demográfico - Faixa Etária"),
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            ...Array.from({ length: Math.ceil(data.ageData.length / 4) }).map((_, rowIndex) => {
              const rowItems = data.ageData.slice(rowIndex * 4, (rowIndex + 1) * 4)
              while (rowItems.length < 4) rowItems.push({ name: '', value: 0 })
              return rowItems.map(item => ({
                stack: [
                  { text: item.name, fontSize: 9, color: '#666' },
                  { text: item.name ? String(item.value) : '', fontSize: 12, bold: true, color: '#333' }
                ],
                margin: [0, 5, 0, 5],
                alignment: 'center' as const
              }))
            })
          ]
        },
        layout: 'noBorders'
      },

      // 6. BENEFÍCIOS
      createSectionHeader("6. Benefícios Eventuais e Transferência de Renda"),
      {
        table: {
          widths: ['*', 50, 50],
          body: [
            [
              { text: "BENEFÍCIO CONCEDIDO", style: "tableHeader", alignment: "left" },
              { text: "QTD", style: "tableHeader" },
              { text: "%", style: "tableHeader" }
            ],
            ...(data.benefitsData.length > 0 
              ? data.benefitsData.map(b => [
                  { text: b.name, fontSize: 10 },
                  { text: String(b.value), fontSize: 10, alignment: "center" },
                  { text: ((b.value / totalBeneficios) * 100).toFixed(1) + '%', fontSize: 10, alignment: "center" }
                ])
              : [[{ text: "Nenhum benefício registrado no período.", colSpan: 3, alignment: "center", italics: true, fontSize: 10 }, {}, {}]]
            ),
            [
              { text: "TOTAL GERAL", style: "tableHeader", alignment: "right" },
              { text: String(totalBeneficios), style: "tableHeader", alignment: "center" },
              { text: "100%", style: "tableHeader", alignment: "center" }
            ]
          ]
        },
        layout: TABLE_LAYOUTS.alternatingRows as any
      },

      // 7. ARTICULAÇÃO
      createSectionHeader("7. Articulação em Rede"),
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: "PRINCIPAIS ENCAMINHAMENTOS (SAÍDA)", style: "tableHeader", alignment: "center", margin: [0, 0, 0, 5] },
              {
                ul: data.networkData.slice(0, 8).map(n => ({
                  text: `${n.name}: ${n.value} ofícios`, fontSize: 10, margin: [0, 2, 0, 2]
                }))
              }
            ]
          },
          {
            width: '48%',
            stack: [
              { text: "PORTA DE ENTRADA (ORIGEM)", style: "tableHeader", alignment: "center", margin: [0, 0, 0, 5] },
              {
                ul: data.originData.slice(0, 8).map(o => ({
                  text: `${o.name}: ${o.value} casos`, fontSize: 10, margin: [0, 2, 0, 2]
                }))
              }
            ]
          }
        ]
      },

      // 8. EFICIÊNCIA OPERACIONAL
      createSectionHeader("8. Eficiência Operacional"),
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: "TEMPO MÉDIO ACOMP.", style: "tableHeader" },
              { text: "TEMPO ESPERA", style: "tableHeader" },
              { text: "TAXA RETENÇÃO", style: "tableHeader" },
              { text: "GRUPOS REALIZADOS", style: "tableHeader" }
            ],
            [
              { text: `${data.efficiencyData.avgPermanence} dias`, style: "kpiValue" },
              { text: `${data.efficiencyData.avgWaitTime} dias`, style: "kpiValue" },
              { text: `${data.efficiencyData.retentionRate}%`, style: "kpiValue" },
              { text: String(data.collectiveData.totalGroups), style: "kpiValue" }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 5]
      },
      { text: "Dados calculados com base nos atendimentos e encerramentos do período.", fontSize: 8, italics: true, color: "#888", alignment: 'center' },

      // Assinatura do Gerente
      {
        stack: [
          { text: "______________________________________________________", alignment: "center", margin: [0, 40, 0, 5] },
          { text: "Gerente", alignment: "center", fontSize: 10, bold: true },
          { text: REPORT_TEXTS.header.unit, alignment: "center", fontSize: 9 }
        ],
        unbreakable: true
      }
    ] as Content[], 
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }
  
  finalizePdf(docDefinition, "OBSERVATORIO_SOCIAL", "DETALHADO", mode)
}

export const generateDismissalPDF = (data: DismissalReportData, mode: 'open' | 'download' = 'open') => {
  registerPdfAudit('RELATORIO_DESLIGAMENTOS', `Relatório de desligamentos: ${data.periodo}`)

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      getOfficialHeader("Relatório Analítico de Desligamentos"),
      {
        text: [{ text: "PERÍODO: ", bold: true, fontSize: 10 }, { text: data.periodo.toUpperCase(), fontSize: 10 }],
        margin: [0, 0, 0, 20], alignment: "center"
      },
      
      createSectionHeader("1. Visão Geral"),
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [{ text: "TOTAL DE DESLIGAMENTOS", style: "tableHeader" }, { text: "TAXA DE SUCESSO", style: "tableHeader" }, { text: "ÍNDICE DE EVASÃO", style: "tableHeader" }],
            [
              { text: String(data.total), style: "kpiValue" },
              { text: `${data.successRate}%`, style: "kpiValue", color: "#16a34a" },
              { text: `${data.evasionRate}%`, style: "kpiValue", color: "#dc2626" }
            ]
          ]
        },
        layout: 'noBorders', margin: [0, 0, 0, 15]
      },

      createSectionHeader("2. Motivos de Desligamento"),
      {
        table: {
          widths: ['*', 60, 60],
          body: [
            [{ text: "MOTIVO REGISTRADO", style: "tableHeader", alignment: "left" }, { text: "QTD", style: "tableHeader" }, { text: "%", style: "tableHeader" }],
            ...data.byReason.sort((a, b) => b.value - a.value).map(r => [
              { text: r.name, fontSize: 10 },
              { text: String(r.value), fontSize: 10, alignment: "center" as const },
              { text: ((r.value / (data.total || 1)) * 100).toFixed(1) + '%', fontSize: 10, alignment: "center" as const }
            ])
          ]
        },
        layout: TABLE_LAYOUTS.alternatingRows as any
      },

      createSectionHeader("3. Evolução Temporal"),
      {
        table: {
          widths: ['*', 60],
          body: [
            [{ text: "MÊS", style: "tableHeader", alignment: "left" }, { text: "DESLIGAMENTOS", style: "tableHeader" }],
            ...data.monthlyTrend.map(m => [
              { text: m.name, fontSize: 10 },
              { text: String(m.value), fontSize: 10, alignment: "center" as const, bold: true }
            ])
          ]
        },
        layout: TABLE_LAYOUTS.lightHorizontalLines as any
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }

  finalizePdf(docDefinition, "DESLIGAMENTOS", data.periodo, mode)
}