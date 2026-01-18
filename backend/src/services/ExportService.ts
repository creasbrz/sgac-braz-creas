// backend/src/services/ExportService.ts
import { prisma } from '../lib/prisma'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Buffer } from 'node:buffer' // Mantemos a importação explícita

export class ExportService {
  
  // --- HELPERS PRIVADOS ---

  private static formatDate(date: Date | null | undefined): string {
    return date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-'
  }

  private static formatCurrency(val: any): string {
    if (!val) return '0,00'
    return Number(val).toFixed(2).replace('.', ',')
  }

  private static formatAddress(c: any): string {
    const parts = [
      c.endereco_logradouro,
      c.endereco_complemento,
      c.endereco_bairro,
      c.endereco_ra && c.endereco_ra !== 'Não Informada' ? `RA: ${c.endereco_ra}` : null,
      c.endereco_cidade !== 'Brasília' ? c.endereco_cidade : null
    ]
    return parts.filter(Boolean).join(', ')
  }

  /**
   * Definição Centralizada das Colunas
   */
  private static getColumns() {
    return [
      { header: 'ID (Sistema)', key: 'id', width: 15 },
      { header: 'Nome Completo', key: 'nome', width: 35 },
      { header: 'Nome Social', key: 'nome_social', width: 25 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Data Nascimento', key: 'nasc', width: 15 },
      { header: 'Sexo', key: 'sexo', width: 15 },
      { header: 'Categoria', key: 'cat', width: 20 },
      
      // [NOVOS CAMPOS]
      { header: 'Ocupação', key: 'ocupacao', width: 25 },
      { header: 'Renda', key: 'renda', width: 15 },

      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'Endereço', key: 'endereco', width: 40 },
      { header: 'CEP', key: 'cep', width: 12 },
      { header: 'RA', key: 'ra', width: 15 },
      
      { header: 'Data Entrada', key: 'entrada', width: 15 },
      { header: 'Urgência', key: 'urgencia', width: 20 },
      { header: 'Peso', key: 'peso', width: 8 },
      { header: 'Violações', key: 'violacoes', width: 35 },
      { header: 'Benefícios', key: 'beneficios', width: 25 },
      
      { header: 'Orgão Demandante', key: 'orgao', width: 20 },
      { header: 'Nº SEI', key: 'sei', width: 20 },
      { header: 'Responsável Legal', key: 'resp', width: 30 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Agente Acolhida', key: 'agente', width: 25 },
      { header: 'Especialista Ref.', key: 'spec', width: 25 },
      { header: 'Origem do Cadastro', key: 'origem', width: 15 },
    ]
  }

  /**
   * Gera o Buffer do Modelo de Importação
   */
  static async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Modelo de Importação')

    worksheet.columns = this.getColumns()

    // Estilo do Cabeçalho
    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    // Adiciona Linha de Exemplo
    worksheet.addRow({
      nome: 'Maria da Silva Exemplo',
      cpf: '000.000.000-00',
      nasc: '01/01/1980',
      sexo: 'Feminino',
      ocupacao: 'Autônomo',
      renda: '1412,00',
      telefone: '61999999999',
      endereco: 'QNN 10 Conjunto A Casa 5',
      ra: 'Ceilândia',
      urgencia: 'MUITO GRAVE',
      violacoes: 'Negligência; Violência Patrimonial',
      status: 'AGUARDANDO_DISTRIBUICAO'
    })

    // [CORREÇÃO] Usamos Buffer.from() para garantir compatibilidade com Node.js
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  /**
   * Gera o Buffer do Excel completo com dados reais
   */
  static async generateCasesExcel(): Promise<Buffer> {
    const casos = await prisma.case.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } 
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Base Completa')

    worksheet.columns = this.getColumns()

    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }

    casos.forEach((c) => {
      worksheet.addRow({
          id: c.id.slice(0, 8),
          nome: c.nomeCompleto,
          nome_social: c.nomeSocial || '-',
          cpf: c.cpf || '-',
          nasc: this.formatDate(c.nascimento),
          sexo: c.sexo,
          cat: c.categoria,
          
          ocupacao: c.ocupacao || '-',
          renda: this.formatCurrency(c.renda),

          telefone: Array.isArray(c.contatos) ? (c.contatos as any[]).map(ct => `${ct.numero}`).join('; ') : '-',
          endereco: this.formatAddress(c),
          cep: c.endereco_cep || '-',
          ra: c.endereco_ra,
          
          entrada: this.formatDate(c.dataEntrada),
          urgencia: c.urgencia,
          peso: c.pesoUrgencia,
          violacoes: Array.isArray(c.violacao) ? c.violacao.join('; ') : (c.violacao || ''),
          beneficios: Array.isArray(c.beneficios) ? c.beneficios.join('; ') : '',
          
          orgao: c.orgaoDemandante,
          sei: c.numeroSei || '-',
          resp: c.responsavelLegal || '-',
          status: c.status.replace(/_/g, ' '),
          agente: c.agenteAcolhida?.nome || '-',
          spec: c.especialistaPAEFI?.nome || '-',
          origem: c.origem
      })
    })

    // [CORREÇÃO] Usamos Buffer.from() para converter explicitamente
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}