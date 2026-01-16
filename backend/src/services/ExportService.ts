// backend/src/services/ExportService.ts
import { prisma } from '../lib/prisma'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export class ExportService {
  
  private static formatDate(date: Date | null | undefined): string {
    return date && !isNaN(date.getTime()) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : '-'
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
   * Gera o Buffer do Excel completo
   */
  static async generateCasesExcel() {
    const casos = await prisma.case.findMany({ 
      orderBy: { createdAt: 'desc' }, 
      include: { criadoPor: true, agenteAcolhida: true, especialistaPAEFI: true } 
    })

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Base Completa')

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Nome Completo', key: 'nome', width: 35 },
      { header: 'Nome Social', key: 'nome_social', width: 25 },
      { header: 'CPF', key: 'cpf', width: 15 },
      { header: 'Data Nascimento', key: 'nasc', width: 15 },
      { header: 'Sexo', key: 'sexo', width: 12 },
      { header: 'Categoria', key: 'cat', width: 20 },
      { header: 'Contatos', key: 'contatos', width: 30 },
      { header: 'Endereço', key: 'endereco', width: 40 },
      { header: 'CEP', key: 'cep', width: 10 },
      { header: 'RA', key: 'ra', width: 15 },
      { header: 'Lat', key: 'lat', width: 12 },
      { header: 'Long', key: 'lng', width: 12 },
      { header: 'Data Entrada', key: 'entrada', width: 15 },
      { header: 'Urgência', key: 'urgencia', width: 20 },
      { header: 'Peso', key: 'peso', width: 8 },
      { header: 'Violações', key: 'violacoes', width: 35 },
      { header: 'Benefícios', key: 'beneficios', width: 25 },
      { header: 'Orgão Demandante', key: 'orgao', width: 20 },
      { header: 'Nº SEI', key: 'sei', width: 20 },
      { header: 'Link SEI', key: 'link_sei', width: 30 },
      { header: 'Responsável Legal', key: 'resp', width: 30 },
      { header: 'Parentesco', key: 'parent', width: 15 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Agente Acolhida', key: 'agente', width: 25 },
      { header: 'Especialista Ref.', key: 'spec', width: 25 },
      { header: 'Origem do Cadastro', key: 'origem', width: 15 },
    ]

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
          contatos: Array.isArray(c.contatos) ? (c.contatos as any[]).map(ct => `${ct.numero} (${ct.tipo})`).join('; ') : '-',
          endereco: this.formatAddress(c),
          cep: c.endereco_cep || '-',
          ra: c.endereco_ra,
          lat: c.latitude,
          lng: c.longitude,
          entrada: this.formatDate(c.dataEntrada),
          urgencia: c.urgencia,
          peso: c.pesoUrgencia,
          violacoes: Array.isArray(c.violacao) ? c.violacao.join('; ') : (c.violacao || ''),
          beneficios: Array.isArray(c.beneficios) ? c.beneficios.join('; ') : '',
          orgao: c.orgaoDemandante,
          sei: c.numeroSei || '-',
          link_sei: c.linkSei || '-',
          resp: c.responsavelLegal || '-',
          parent: c.parentescoResponsavel || '-',
          status: c.status.replace(/_/g, ' '),
          agente: c.agenteAcolhida?.nome || '-',
          spec: c.especialistaPAEFI?.nome || '-',
          origem: c.origem
      })
    })

    return await workbook.xlsx.writeBuffer()
  }
}