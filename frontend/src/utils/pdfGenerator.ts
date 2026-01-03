// frontend/src/utils/pdfGenerator.ts
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { CaseDetailData } from "@/types/case"
import type { GroupActivity, GroupAttendance } from "@/types/group"
import { formatDateSafe, formatCPF, formatPhone } from "./formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// --- CONFIGURAÇÃO VFS (FIX) ---
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

/**
 * Gera o PDF do Prontuário do Caso Individual
 */
export const generateCasePDF = (caseData: CaseDetailData) => {
  const beneficiosSection =
    caseData.beneficios && caseData.beneficios.length > 0
      ? [
          { text: "BENEFÍCIOS ATIVOS:", style: "subHeader", margin: [0, 10, 0, 2] },
          {
            ul: caseData.beneficios,
            fontSize: 10,
            margin: [15, 0, 0, 10],
          },
        ]
      : []

  const pafSection =
    caseData.status === "EM_ACOMPANHAMENTO_PAEFI" ||
    caseData.status === "DESLIGADO"
      ? [
          {
            text: "3. PLANO DE ACOMPANHAMENTO FAMILIAR (PAF)",
            style: "sectionHeader",
            margin: [0, 15, 0, 5],
          },
          {
            text: "Consulte o sistema para detalhes completos do PAF vigente.",
            fontSize: 10,
            italics: true,
            margin: [0, 0, 0, 10],
          },
        ]
      : []

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],

    header: {
      margin: [40, 20, 40, 0],
      columns: [
        {
          text: [
            { text: "GOVERNO DO DISTRITO FEDERAL\n", bold: true, fontSize: 10 },
            { text: "SECRETARIA DE ESTADO DE DESENVOLVIMENTO SOCIAL\n", fontSize: 9 },
            { text: "CREAS BRAZLÂNDIA", fontSize: 9, italics: true },
          ],
          alignment: "center",
          color: "#444444",
        },
      ],
    },

    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount} — Gerado em ${new Date().toLocaleDateString(
        "pt-BR"
      )} via SGAC`,
      alignment: "center",
      fontSize: 8,
      color: "#888888",
      margin: [0, 10, 0, 0],
    }),

    content: [
      {
        text: "PRONTUÁRIO TÉCNICO",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 20],
      },

      // 1 — Identificação
      { text: "1. IDENTIFICAÇÃO DO USUÁRIO", style: "sectionHeader" },
      {
        style: "tableExample",
        table: {
          widths: ["*", "*", "*"],
          body: [
            [
              { text: "Nome Completo", style: "label" },
              { text: "CPF", style: "label" },
              { text: "Data de Nascimento", style: "label" },
            ],
            [
              caseData.nomeCompleto,
              formatCPF(caseData.cpf),
              formatDateSafe(caseData.nascimento),
            ],
            [
              { text: "Telefone", style: "label" },
              { text: "Sexo", style: "label" },
              { text: "Endereço", style: "label" },
            ],
            [
              formatPhone(caseData.telefone),
              caseData.sexo ?? "Não informado",
              caseData.endereco ?? "Não informado",
            ],
          ],
        },
        layout: "lightHorizontalLines",
      },

      // 2 — Dados do Atendimento
      {
        text: "2. DADOS DO ATENDIMENTO",
        style: "sectionHeader",
        margin: [0, 15, 0, 5],
      },
      {
        style: "tableExample",
        table: {
          widths: ["50%", "50%"],
          body: [
            [
              { text: `Status Atual: ${caseData.status.replace(/_/g, " ")}`, bold: true },
              { text: `Data de Entrada: ${formatDateSafe(caseData.dataEntrada)}` },
            ],
            [
              { text: `Violação: ${caseData.violacao}` },
              { text: `Urgência: ${caseData.urgencia}` },
            ],
            [
              {
                text: `Técnico Acolhida: ${
                  caseData.agenteAcolhida?.nome ?? "Não informado"
                }`,
              },
              {
                text: `Técnico PAEFI: ${
                  caseData.especialistaPAEFI?.nome ?? "Não informado"
                }`,
              },
            ],
          ],
        },
        layout: "noBorders",
      },

      // 3 — Benefícios
      ...beneficiosSection,

      // 4 — PAF (se aplicável)
      ...pafSection,

      // 5 — Evoluções
      {
        text: "4. HISTÓRICO DE EVOLUÇÕES E ATENDIMENTOS",
        style: "sectionHeader",
        margin: [0, 15, 0, 10],
      },
      {
        text: "Nota: Para ver as evoluções detalhadas, imprima a partir da visualização completa.",
        fontSize: 9,
        italics: true,
        color: "gray",
      },
    ],

    styles: {
      header: {
        fontSize: 16,
        bold: true,
        color: "#2c3e50",
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: "#ffffff",
        fillColor: "#2c3e50",
        padding: 5,
        margin: [0, 10, 0, 5],
      },
      subHeader: {
        fontSize: 10,
        bold: true,
        color: "#34495e",
      },
      label: {
        fontSize: 8,
        color: "#7f8c8d",
        bold: true,
      },
      tableExample: {
        margin: [0, 5, 0, 5],
        fontSize: 10,
      },
    },
  }

  pdfMake.createPdf(docDefinition).open()
}

/**
 * [NOVO] Gera lista de presença para grupos
 * @param type 'blank' para assinatura presencial, 'filled' para relatório de sistema
 */
export const generateGroupAttendancePDF = (
  group: GroupActivity, 
  participants: GroupAttendance[], 
  type: 'blank' | 'filled' = 'blank'
) => {
  const docTitle = type === 'blank' ? "LISTA DE PRESENÇA" : "RELATÓRIO DE PARTICIPAÇÃO"
  
  // Cabeçalho da Tabela
  const tableHeader = type === 'blank' 
    ? [
        { text: "NOME COMPLETO", style: 'tableHeader' },
        { text: "CPF / IDENTIFICAÇÃO", style: 'tableHeader' },
        { text: "ASSINATURA", style: 'tableHeader' }
      ]
    : [
        { text: "NOME COMPLETO", style: 'tableHeader' },
        { text: "STATUS", style: 'tableHeader' },
        { text: "OBSERVAÇÕES", style: 'tableHeader' }
      ]

  // Corpo da Tabela
  const tableBody = participants.map(p => {
    if (type === 'blank') {
      return [
        { text: p.caso.nomeCompleto, fontSize: 10, margin: [0, 8, 0, 8] },
        { text: "__________________", fontSize: 10, alignment: 'center', margin: [0, 8, 0, 8] },
        { text: "", margin: [0, 15, 0, 15] } // Espaço para assinar
      ]
    } else {
      const statusText = p.presente ? "PRESENTE" : "AUSENTE"
      const statusColor = p.presente ? "green" : "red"
      return [
        { text: p.caso.nomeCompleto, fontSize: 10 },
        { text: statusText, fontSize: 9, bold: true, color: statusColor },
        { text: p.observacoes || "-", fontSize: 9, italics: true }
      ]
    }
  })

  // Adiciona linhas vazias para preencher manualmente se for lista em branco
  if (type === 'blank') {
    for (let i = 0; i < 5; i++) {
      // @ts-ignore
      tableBody.push([
        { text: "", margin: [0, 15, 0, 15] },
        { text: "", margin: [0, 15, 0, 15] },
        { text: "", margin: [0, 15, 0, 15] }
      ])
    }
  }

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    header: {
      margin: [40, 20, 40, 0],
      columns: [
        {
          text: [
            { text: "GOVERNO DO DISTRITO FEDERAL\n", bold: true, fontSize: 10 },
            { text: "SECRETARIA DE ESTADO DE DESENVOLVIMENTO SOCIAL\n", fontSize: 9 },
            { text: "CREAS BRAZLÂNDIA", fontSize: 9 },
          ],
          alignment: "center",
          color: "#444444",
        },
      ],
    },
    content: [
      {
        text: docTitle,
        style: "header",
        alignment: "center",
        margin: [0, 10, 0, 20],
      },
      // Dados da Atividade
      {
        style: 'infoTable',
        table: {
          widths: ['20%', '80%'],
          body: [
            [{ text: 'Atividade:', bold: true }, group.tema],
            [{ text: 'Tipo:', bold: true }, group.tipo.replace('_', ' ')],
            [{ text: 'Data:', bold: true }, format(new Date(group.dataRealizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })],
            [{ text: 'Local:', bold: true }, group.local || 'Não definido'],
            [{ text: 'Facilitador:', bold: true }, group.facilitador?.nome || 'Não informado'],
          ]
        },
        layout: 'noBorders'
      },
      { text: "\n" },
      // Tabela de Participantes
      {
        table: {
          headerRows: 1,
          widths: type === 'blank' ? ['40%', '20%', '40%'] : ['50%', '15%', '35%'],
          body: [
            tableHeader,
            ...tableBody
          ]
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return (rowIndex === 0) ? '#eeeeee' : null;
          }
        }
      }
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        color: "#2c3e50",
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'black',
      },
      infoTable: {
        fontSize: 11,
        color: '#333'
      }
    }
  }

  pdfMake.createPdf(docDefinition).open()
}