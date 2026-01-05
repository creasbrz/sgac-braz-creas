import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { CaseDetailData, FamilyMember, PafData } from "@/types/case"
import type { GroupActivity, GroupAttendance } from "@/types/group"
import { formatDateSafe, formatCPF, formatPhone } from "./formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// [CORREÇÃO] Estendendo a interface para evitar erros de TS
interface ExtendedCaseData extends CaseDetailData {
  familia?: FamilyMember[]
  idade?: number
}

// --- CONFIGURAÇÃO VFS ---
// @ts-ignore
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  // @ts-ignore
  pdfMake.vfs = pdfFonts.pdfMake.vfs
} else if (pdfFonts && (pdfFonts as any).vfs) {
  // @ts-ignore
  pdfMake.vfs = (pdfFonts as any).vfs
} else {
  // @ts-ignore
  pdfMake.vfs = pdfFonts
}

// ... (Interfaces e Styles mantidos) ...
export interface ManagementReportData {
  periodo: string
  stats: {
    ativos: number
    acolhidas: number
    paefi: number
    novos: number
    desligados: number
  }
  cargaHoraria: {
    agentes: { name: string; value: number }[]
    especialistas: { name: string; value: number }[]
  }
  vigilancia?: {
    violacoes: { name: string; value: number }[]
    demografia: { name: string; value: number }[]
    territorio: { name: string; value: number }[]
  }
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

const BRAND_COLOR = "#2e4a7d"
const HEADER_BG = "#eef2f6"

const COMMON_STYLES = {
  header: { fontSize: 14, bold: true, color: BRAND_COLOR, margin: [0, 0, 0, 5] },
  subHeader: { fontSize: 12, bold: true, color: "#333", margin: [0, 10, 0, 5] },
  sectionTitle: { fontSize: 11, bold: true, color: "white", margin: [2, 2, 2, 2] },
  label: { fontSize: 9, bold: true, color: "#555" },
  value: { fontSize: 10, color: "#000" },
  tableHeader: { bold: true, fontSize: 10, color: "black", fillColor: "#e0e0e0", alignment: "center" },
  smallText: { fontSize: 8, color: "#666" },
  kpiValue: { fontSize: 16, bold: true, alignment: "center", color: "#333", margin: [0, 5, 0, 0] }
}

const createSectionHeader = (title: string) => ({
  table: {
    widths: ['*'],
    body: [
      [{ 
        text: title.toUpperCase(), 
        style: 'sectionTitle', 
        border: [false, false, false, false], 
        fillColor: BRAND_COLOR 
      }]
    ]
  },
  margin: [0, 15, 0, 10]
})

const getOfficialHeader = (docTitle: string) => {
  return {
    stack: [
      { text: "GOVERNO DO DISTRITO FEDERAL", style: "header", alignment: "center", fontSize: 11, margin: [0, 0, 0, 2] },
      { text: "SECRETARIA DE ESTADO DE DESENVOLVIMENTO SOCIAL - SEDES", alignment: "center", fontSize: 9 },
      { text: "CREAS BRAZLÂNDIA", alignment: "center", fontSize: 9, bold: true, margin: [0, 0, 0, 5] },
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#ccc' }] },
      { text: docTitle.toUpperCase(), style: "header", alignment: "center", margin: [0, 15, 0, 10] }
    ],
    margin: [0, 10, 0, 0]
  }
}

const getOfficialFooter = (currentPage: number, pageCount: number) => ({
  stack: [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#ccc' }] },
    {
      text: [
        { text: "Sistema de Gestão de Assistência - CREAS Brazlândia\n", bold: true },
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • Página ${currentPage} de ${pageCount}`
      ],
      alignment: "center",
      fontSize: 8,
      color: "#888",
      margin: [0, 5, 0, 0]
    }
  ],
  margin: [40, 0, 40, 10]
})

// [CORREÇÃO] Usando ExtendedCaseData no parâmetro
export const generateCasePDF = (caseDataRaw: CaseDetailData) => {
  const caseData = caseDataRaw as ExtendedCaseData;

  const familyBody: any[] = [
    [
      { text: "NOME", style: "tableHeader", alignment: "left" },
      { text: "PARENTESCO", style: "tableHeader" },
      { text: "IDADE", style: "tableHeader" },
      { text: "RENDA", style: "tableHeader" }
    ]
  ]

  if (caseData.familia && caseData.familia.length > 0) {
    caseData.familia.forEach((m: FamilyMember) => {
      // [CORREÇÃO] Usando any para evitar erro de 'fontSize' em objeto literal
      familyBody.push([
        { text: m.nome, fontSize: 9 },
        { text: m.parentesco, fontSize: 9, alignment: "center" },
        { text: m.idade ? `${m.idade} anos` : "-", fontSize: 9, alignment: "center" },
        { text: m.renda ? `R$ ${Number(m.renda).toFixed(2)}` : "-", fontSize: 9, alignment: "right" }
      ] as any)
    })
  } else {
    familyBody.push([{ text: "Nenhum familiar cadastrado.", colSpan: 4, alignment: "center", fontSize: 9, italics: true }, {}, {}, {}] as any)
  }

  const beneficiosList = caseData.beneficios?.length ? 
    { ul: caseData.beneficios, fontSize: 10, margin: [10, 0, 0, 0] } : 
    { text: "Nenhum benefício ativo registrado.", fontSize: 10, italics: true, color: "#666" }

  const docDefinition: any = {
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
            // [CORREÇÃO] 'idade' agora é reconhecido via cast
            [{ text: "NASCIMENTO:", style: "label" }, { text: `${formatDateSafe(caseData.nascimento)} (${caseData.idade ?? '?'} anos)`, style: "value" }],
            [{ text: "ENDEREÇO:", style: "label" }, { text: caseData.endereco, style: "value" }],
            [{ text: "CONTATO:", style: "label" }, { text: formatPhone(caseData.telefone), style: "value" }]
          ]
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 5) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: '#ccc',
          fillColor: (i: number) => (i % 2 === 0) ? HEADER_BG : null
        }
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
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: familyBody
        },
        layout: 'lightHorizontalLines'
      },

      createSectionHeader("3. Benefícios e Transferência de Renda"),
      beneficiosList,

      createSectionHeader("4. Plano de Acompanhamento (PAF)"),
      {
        text: caseData.status === "EM_ACOMPANHAMENTO_PAEFI" 
          ? "O caso encontra-se em acompanhamento. Consulte o documento específico do PAF para ver objetivos, metas e prazos detalhados." 
          : "Não há PAF ativo para o status atual do caso.",
        fontSize: 10,
        alignment: "justify"
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }

  pdfMake.createPdf(docDefinition).open()
}

// ... Resto do arquivo (generateGroupAttendancePDF, generatePafPDF, generateManagementPDF, generateObservatoryPDF) 
// MANTENHA O RESTANTE IGUAL AO QUE JÁ ESTAVA, AS CORREÇÕES ERAM SÓ NO generateCasePDF
// Vou incluir o restante simplificado para não cortar nada se você copiar e colar:

export const generateGroupAttendancePDF = (
  group: GroupActivity, 
  participants: GroupAttendance[], 
  type: 'blank' | 'filled' = 'blank'
) => {
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
  })

  if (type === 'blank') {
    for (let i = 0; i < 5; i++) {
      // @ts-ignore
      tableBody.push([
        { text: "", margin: [0, 12, 0, 12] },
        { text: "", margin: [0, 12, 0, 12] },
        { text: "", margin: [0, 12, 0, 12] }
      ])
    }
  }

  const docDefinition: any = {
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
      type === 'blank' ? {
        stack: [
          { text: "______________________________________________________", alignment: "center", margin: [0, 40, 0, 5] },
          { text: group.facilitador.nome, alignment: "center", fontSize: 10, bold: true },
          { text: "Técnico(a) Responsável", alignment: "center", fontSize: 9 }
        ]
      } : {}
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }

  pdfMake.createPdf(docDefinition).open()
}

export const generatePafPDF = (caseData: CaseDetailData, paf: PafData) => {
  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],
    content: [
      getOfficialHeader("Plano de Acompanhamento Familiar (PAF)"),
      {
        table: {
          widths: ['*'],
          body: [
            [{ text: `FAMÍLIA DE: ${caseData.nomeCompleto.toUpperCase()}`, fontSize: 11, bold: true, fillColor: HEADER_BG, alignment: 'center' }],
            [{ text: `CPF Responsável: ${formatCPF(caseData.cpf)}  |  Versão do PAF: ${paf.versaoAtual}`, fontSize: 10, alignment: 'center' }]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      },
      createSectionHeader("1. Diagnóstico Sociofamiliar"),
      { text: paf.diagnostico, fontSize: 10, textAlign: "justify", margin: [0, 0, 0, 15] },
      createSectionHeader("2. Objetivos Pactuados"),
      { text: paf.objetivos, fontSize: 10, textAlign: "justify", margin: [0, 0, 0, 15] },
      createSectionHeader("3. Estratégias e Encaminhamentos"),
      { text: paf.estrategias, fontSize: 10, textAlign: "justify", margin: [0, 0, 0, 15] },
      createSectionHeader("4. Prazos"),
      { 
        text: [
          "A família e a equipe técnica se comprometem com os objetivos acima, com previsão de reavaliação em: ",
          { text: formatDateSafe(paf.deadline), bold: true }
        ],
        fontSize: 10, margin: [0, 0, 0, 30] 
      },
      {
        columns: [
          {
            stack: [
              { text: "__________________________________", alignment: "center" },
              { text: "Assinatura do(a) Usuário(a)", alignment: "center", fontSize: 9, bold: true }
            ]
          },
          {
            stack: [
              { text: "__________________________________", alignment: "center" },
              { text: paf.autor.nome, alignment: "center", fontSize: 9, bold: true },
              { text: "Técnico(a) de Referência", alignment: "center", fontSize: 8 }
            ]
          }
        ],
        margin: [0, 20, 0, 0]
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }
  pdfMake.createPdf(docDefinition).open()
}

export const generateManagementPDF = (data: ManagementReportData) => {
  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      getOfficialHeader("Relatório Gerencial de Monitoramento"),
      {
        text: [
          { text: "PERÍODO DE REFERÊNCIA: ", bold: true, fontSize: 10 },
          { text: data.periodo.toUpperCase(), fontSize: 10 }
        ],
        margin: [0, 0, 0, 20],
        alignment: "center"
      },
      createSectionHeader("1. Indicadores de Volume (Mensal)"),
      {
        table: {
          widths: ['*', '*', '*', '*', '*'],
          body: [
            [
              { text: "TOTAL ATIVOS", style: "tableHeader" },
              { text: "EM ACOLHIDA", style: "tableHeader" },
              { text: "EM PAEFI", style: "tableHeader" },
              { text: "NOVOS (MÊS)", style: "tableHeader" },
              { text: "DESLIGADOS", style: "tableHeader" }
            ],
            [
              { text: data.stats.ativos, style: "kpiValue" },
              { text: data.stats.acolhidas, style: "kpiValue" },
              { text: data.stats.paefi, style: "kpiValue" },
              { text: data.stats.novos, style: "kpiValue", color: "#2563eb" },
              { text: data.stats.desligados, style: "kpiValue", color: "#16a34a" }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15]
      },
      createSectionHeader("2. Distribuição da Equipe Técnica"),
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: "AGENTES SOCIAIS (ACOLHIDA)", style: "subHeader", fontSize: 9, alignment: "center" },
              {
                table: {
                  widths: ['*', 40],
                  body: [
                    [{ text: "Técnico", style: "tableHeader", alignment: "left" }, { text: "Qtd", style: "tableHeader" }],
                    ...data.cargaHoraria.agentes.map(a => [
                      { text: a.name, fontSize: 9 },
                      { text: a.value, fontSize: 9, alignment: "center", bold: true }
                    ])
                  ]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          },
          { width: '4%', text: '' },
          {
            width: '48%',
            stack: [
              { text: "ESPECIALISTAS (PAEFI)", style: "subHeader", fontSize: 9, alignment: "center" },
              {
                table: {
                  widths: ['*', 40],
                  body: [
                    [{ text: "Técnico", style: "tableHeader", alignment: "left" }, { text: "Qtd", style: "tableHeader" }],
                    ...data.cargaHoraria.especialistas.map(e => [
                      { text: e.name, fontSize: 9 },
                      { text: e.value, fontSize: 9, alignment: "center", bold: true }
                    ])
                  ]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          }
        ]
      },
      ...(data.vigilancia ? [
        createSectionHeader("3. Vigilância Socioassistencial"),
        {
          table: {
            widths: ['*', 60, 60],
            body: [
              [
                { text: "TIPIFICAÇÃO DA VIOLAÇÃO", style: "tableHeader", alignment: "left" },
                { text: "CASOS", style: "tableHeader" },
                { text: "%", style: "tableHeader" }
              ],
              ...data.vigilancia.violacoes.map(v => {
                const total = data.stats.ativos || 1
                const percent = ((v.value / total) * 100).toFixed(1) + '%'
                return [
                  { text: v.name, fontSize: 10 },
                  { text: v.value, fontSize: 10, alignment: "center" },
                  { text: percent, fontSize: 10, alignment: "center" }
                ]
              })
            ]
          },
          layout: {
            fillColor: (i: number) => (i === 0 ? '#e0e0e0' : (i % 2 === 0 ? null : '#f9f9f9')),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: '#ccc',
            vLineColor: '#ccc'
          }
        },
        createSectionHeader("4. Perfil Demográfico (Faixa Etária)"),
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [
              data.vigilancia.demografia.map(d => ({ text: d.name, style: "tableHeader" })),
              data.vigilancia.demografia.map(d => ({ text: d.value, style: "kpiValue", fontSize: 12 }))
            ]
          },
          layout: 'noBorders'
        }
      ] : []),
      {
        stack: [
          { text: "______________________________________________________", alignment: "center", margin: [0, 60, 0, 5] },
          { text: "Coordenação CREAS Brazlândia", alignment: "center", fontSize: 10, bold: true },
          { text: "Responsável pelo Relatório", alignment: "center", fontSize: 9 }
        ]
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }
  pdfMake.createPdf(docDefinition).open()
}

export const generateObservatoryPDF = (data: ObservatoryData) => {
  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      getOfficialHeader("Relatório do Observatório Social"),
      {
        text: `Data de Emissão: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
        alignment: "center", fontSize: 10, margin: [0, 0, 0, 20]
      },
      createSectionHeader("1. Dinâmica de Atendimento (Últimos 6 Meses)"),
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: "MÊS DE REFERÊNCIA", style: "tableHeader", alignment: "left" },
              { text: "ENTRADAS (NOVOS)", style: "tableHeader" },
              { text: "SAÍDAS (DESLIGAMENTOS)", style: "tableHeader" },
              { text: "SALDO", style: "tableHeader" }
            ],
            ...data.evolutionData.map(d => [
              { text: d.name, fontSize: 10 },
              { text: d.novos, fontSize: 10, alignment: "center", color: "#2563eb" },
              { text: d.desligados, fontSize: 10, alignment: "center", color: "#16a34a" },
              { text: (d.novos - d.desligados), fontSize: 10, alignment: "center", bold: true }
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 15]
      },
      createSectionHeader("2. Caracterização das Violações e Risco"),
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: "PRINCIPAIS VIOLAÇÕES", style: "subHeader", fontSize: 10, alignment: "center" },
              {
                table: {
                  widths: ['*', 40],
                  body: [
                    [{ text: "Tipificação", style: "tableHeader", alignment: "left" }, { text: "Qtd", style: "tableHeader" }],
                    ...data.violationData.slice(0, 10).map(v => [
                      { text: v.name, fontSize: 9 },
                      { text: v.value, fontSize: 9, alignment: "center", bold: true }
                    ])
                  ]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          },
          { width: '4%', text: '' },
          {
            width: '48%',
            stack: [
              { text: "NÍVEL DE RISCO/URGÊNCIA", style: "subHeader", fontSize: 10, alignment: "center" },
              {
                table: {
                  widths: ['*', 40],
                  body: [
                    [{ text: "Classificação", style: "tableHeader", alignment: "left" }, { text: "Qtd", style: "tableHeader" }],
                    ...data.urgencyData.map(u => [
                      { text: u.name, fontSize: 9 },
                      { text: u.value, fontSize: 9, alignment: "center", bold: true }
                    ])
                  ]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          }
        ]
      },
      createSectionHeader("3. Eficiência Operacional e Articulação"),
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: "TEMPO MÉDIO ACOMP.", style: "tableHeader" },
              { text: "TEMPO DE ESPERA", style: "tableHeader" },
              { text: "GRUPOS REALIZADOS", style: "tableHeader" },
              { text: "BENEFÍCIOS CONCEDIDOS", style: "tableHeader" }
            ],
            [
              { text: `${data.efficiencyData.avgPermanence} dias`, style: "kpiValue" },
              { text: `${data.efficiencyData.avgWaitTime} dias`, style: "kpiValue" },
              { text: data.collectiveData.totalGroups, style: "kpiValue" },
              { text: data.benefitsData.reduce((acc, b) => acc + b.value, 0), style: "kpiValue" }
            ]
          ]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15]
      },
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: "PORTA DE ENTRADA (ORIGEM)", style: "subHeader", fontSize: 10 },
              {
                ul: data.originData.slice(0, 5).map(o => `${o.name}: ${o.value} casos`),
                fontSize: 9, margin: [10, 0, 0, 0]
              }
            ]
          },
          {
            width: '48%',
            stack: [
              { text: "ENCAMINHAMENTOS (SAÍDA)", style: "subHeader", fontSize: 10 },
              {
                ul: data.networkData.slice(0, 5).map(n => `${n.name}: ${n.value} ofícios`),
                fontSize: 9, margin: [10, 0, 0, 0]
              }
            ]
          }
        ]
      },
      createSectionHeader("4. Perfil Demográfico do Público Atendido"),
      {
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: "FAIXA ETÁRIA", style: "tableHeader", colSpan: 2, alignment: "center" }, {},
              { text: "GÊNERO", style: "tableHeader", colSpan: 2, alignment: "center" }, {}
            ],
            [
              { 
                stack: data.ageData.map(a => ({ 
                  columns: [{ text: a.name, fontSize: 9 }, { text: a.value, fontSize: 9, bold: true, alignment: "right" }] 
                })) 
              },
              {},
              { 
                stack: data.sexData.map(s => ({ 
                  columns: [{ text: s.name, fontSize: 9 }, { text: s.value, fontSize: 9, bold: true, alignment: "right" }] 
                })) 
              },
              {}
            ]
          ]
        },
        layout: 'noBorders'
      },
      {
        stack: [
          { text: "______________________________________________________", alignment: "center", margin: [0, 40, 0, 5] },
          { text: "Coordenação de Vigilância Socioassistencial", alignment: "center", fontSize: 10, bold: true },
          { text: "CREAS Brazlândia", alignment: "center", fontSize: 9 }
        ]
      }
    ],
    footer: getOfficialFooter,
    styles: COMMON_STYLES
  }
  pdfMake.createPdf(docDefinition).open()
}