// frontend/src/utils/pdfGenerator.ts
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { CaseDetailData } from "@/types/case"
import { formatDateSafe, formatCPF, formatPhone } from "./formatters"

// --- CORREÇÃO DO BUG (VFS) ---
// Verifica a estrutura do pdfFonts antes de atribuir, evitando o erro "undefined"
// @ts-ignore
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  // @ts-ignore
  pdfMake.vfs = pdfFonts.pdfMake.vfs
} else if (pdfFonts && (pdfFonts as any).vfs) {
  // @ts-ignore
  pdfMake.vfs = (pdfFonts as any).vfs
} else {
  // Fallback: às vezes o objeto importado já é o próprio VFS
  // @ts-ignore
  pdfMake.vfs = pdfFonts
}
// --- FIM DA CORREÇÃO ---

/**
 * Gera o PDF do Prontuário do Caso
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
            { text: "SECRETARIA DE DESENVOLVIMENTO SOCIAL\n", fontSize: 9 },
            { text: "CREAS BRAZLÂNDIA - SGAC", fontSize: 9, italics: true },
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