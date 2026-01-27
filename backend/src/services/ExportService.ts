// backend/src/services/ExportService.ts
import { prisma } from '../lib/prisma'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Buffer } from 'node:buffer'

// --- CONSTANTES (Fontes da Verdade) ---
const LISTAS = {
  SEXO: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  
  CATEGORIA: [
    'Mulher', 'POP RUA', 'LGBTQIA+', 'Migrante', 'Idoso', 
    'Criança/adolescente', 'PCD', 'Álcool/drogas', 'Família em vulnerabilidade'
  ],

  URGENCIA: [
    'Sem risco imediato (Peso 1)',
    'Risco Social (Peso 2)',
    'Violação de Direitos (Peso 3)',
    'Risco Grave / Morte (Peso 4)'
  ],

  VIOLACOES: [
    'Abandono', 'Negligência', 'Afastamento do convívio familiar', 
    'Violência física', 'Violência psicológica', 'Abuso sexual', 'Exploração sexual',
    'Tráfico de seres humanos', 'Abuso financeiro/patrimonial', 
    'Trabalho infantil', 'Discriminação', 'Situação de rua', 'Outros'
  ],

  STATUS: [
    'AGUARDANDO_ACOLHIDA',
    'AGUARDANDO_DISTRIBUICAO',
    'EM_ACOLHIDA',
    'EM_ACOLHIDA_ESPECIALIZADA',
    'EM_ACOMPANHAMENTO',
    'EM_MONITORAMENTO',
    'DESLIGADO'
  ],

  ORIGEM: [
    'ESPONTANEA', 'DOCUMENTAL', 'REFERENCIADA', 'BUSCA_ATIVA'
  ],
  
  RAS: [
    'Brazlândia', 'Ceilândia', 'Sol Nascente/Pôr do Sol', 'Taguatinga', 
    'Samambaia', 'Plano Piloto', 'Águas Claras', 'Gama', 'Santa Maria',
    'Recanto das Emas', 'Riacho Fundo I', 'Riacho Fundo II', 'Vicente Pires',
    'Não Informada', 'Outra UF'
  ]
}

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

  private static addDataValidation(worksheet: ExcelJS.Worksheet, colLetter: string, optionsList: string[], allowType: boolean = false) {
    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`${colLetter}${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${optionsList.join(',')}"`],
        showErrorMessage: true,
        errorStyle: allowType ? 'warning' : 'stop', // Se allowType=true, deixa digitar fora da lista
        errorTitle: allowType ? 'Atenção' : 'Valor Inválido',
        error: allowType 
          ? 'Este valor não está na lista. Certifique-se que a grafia está correta ou separe múltiplos itens com ponto e vírgula.' 
          : 'Selecione um item da lista.'
      }
    }
  }

  private static addReferenceValidation(
    workbook: ExcelJS.Workbook, 
    mainSheet: ExcelJS.Worksheet, 
    colLetter: string, 
    data: string[], 
    refCol: string,
    allowType: boolean = false
  ) {
    let dataSheet = workbook.getWorksheet('DadosOcultos')
    if (!dataSheet) {
      dataSheet = workbook.addWorksheet('DadosOcultos')
      dataSheet.state = 'hidden'
    }

    data.forEach((val, index) => {
      dataSheet!.getCell(`${refCol}${index + 1}`).value = val
    })

    const refRange = `'DadosOcultos'!$${refCol}$1:$${refCol}$${data.length}`

    for (let i = 2; i <= 1000; i++) {
      mainSheet.getCell(`${colLetter}${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [refRange],
        showErrorMessage: true,
        errorStyle: allowType ? 'warning' : 'stop',
        errorTitle: allowType ? 'Atenção' : 'Valor Inválido',
        error: allowType 
          ? 'Você digitou um valor fora da lista padrão. Se for múltipla escolha, use ponto e vírgula (;).' 
          : 'Selecione um valor válido.'
      }
    }
  }

  private static getColumns() {
    return [
      { header: 'ID (Sistema)', key: 'id', width: 15 },
      { header: 'Nome Completo', key: 'nome', width: 35 },
      { header: 'Nome Social', key: 'nome_social', width: 25 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Data Nascimento', key: 'nasc', width: 15 },
      
      { header: 'Sexo', key: 'sexo', width: 15 },        // F
      { header: 'Categoria', key: 'cat', width: 25 },     // G
      
      { header: 'Ocupação', key: 'ocupacao', width: 25 },
      { header: 'Renda', key: 'renda', width: 15 },
      { header: 'Responsável Legal', key: 'resp', width: 30 },
      { header: 'Parentesco', key: 'parent', width: 15 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'Endereço', key: 'endereco', width: 40 },
      { header: 'CEP', key: 'cep', width: 12 },
      
      { header: 'RA', key: 'ra', width: 20 },             // O
      
      { header: 'Data Entrada', key: 'entrada', width: 15 },
      
      { header: 'Urgência', key: 'urgencia', width: 25 }, // Q
      { header: 'Peso', key: 'peso', width: 8 },
      { header: 'Violações', key: 'violacoes', width: 35 }, // S
      { header: 'Benefícios', key: 'beneficios', width: 25 },
      
      { header: 'Orgão Demandante', key: 'orgao', width: 20 },
      { header: 'Nº SEI', key: 'sei', width: 20 },
      { header: 'Link SEI', key: 'link_sei', width: 30 },
      
      { header: 'Status', key: 'status', width: 25 },     // X
      { header: 'Agente Acolhida', key: 'agente', width: 25 },
      { header: 'Especialista Ref.', key: 'spec', width: 25 },
      
      { header: 'Origem do Cadastro', key: 'origem', width: 20 }, // AA
    ]
  }

  /**
   * Gera o Buffer do Modelo de Importação (Template Rico)
   */
  static async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Modelo de Importação')

    worksheet.columns = this.getColumns()

    // 1. Adicionar Cabeçalho e Estilo
    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    // 2. [CORREÇÃO] Adicionar Linha de Exemplo ANTES de aplicar validações em massa
    // Isso garante que ela fique na linha 2 e não na 1001.
    worksheet.addRow({
      nome: 'MARIA EXEMPLO DA SILVA',
      cpf: '000.000.000-00',
      nasc: '10/05/2015',
      sexo: 'Feminino',
      cat: 'Criança/adolescente',
      ocupacao: 'Estudante',
      renda: '0,00',
      resp: 'JOANA DA SILVA (MÃE)',
      parent: 'Mãe',
      telefone: '61999999999',
      endereco: 'QNN 10 Conjunto A Casa 5',
      cep: '72000000',
      ra: 'Ceilândia',
      entrada: '01/01/2024',
      urgencia: 'Violação de Direitos (Peso 3)',
      peso: '3',
      violacoes: 'Negligência; Violência física', // Exemplo com múltipla escolha
      beneficios: 'Bolsa Família',
      orgao: 'Conselho Tutelar',
      sei: '00000-000000/2024',
      link_sei: 'https://sei.df.gov.br/...',
      status: 'AGUARDANDO_DISTRIBUICAO',
      origem: 'DOCUMENTAL',
      agente: 'Nome do Técnico',
      spec: 'Nome do Especialista'
    })

    // 3. Aplicar Validadores (Dropdowns)
    this.addDataValidation(worksheet, 'F', LISTAS.SEXO)
    this.addDataValidation(worksheet, 'AA', LISTAS.ORIGEM)
    
    // Listas Grandes via Aba Oculta
    this.addReferenceValidation(workbook, worksheet, 'G', LISTAS.CATEGORIA, 'A') 
    this.addReferenceValidation(workbook, worksheet, 'O', LISTAS.RAS, 'B')       
    this.addReferenceValidation(workbook, worksheet, 'Q', LISTAS.URGENCIA, 'C')  
    this.addReferenceValidation(workbook, worksheet, 'X', LISTAS.STATUS, 'D')
    
    // [NOVO] Dropdown de Violações (AllowType=true para permitir "Violência; Negligência")
    this.addReferenceValidation(workbook, worksheet, 'S', LISTAS.VIOLACOES, 'E', true)

    // 4. Notas de Instrução
    worksheet.getCell('D1').note = 'Obrigatório. Apenas números (11 dígitos).'
    worksheet.getCell('S1').note = {
      texts: [
        {'font': {'bold': true}, 'text': 'Múltipla Escolha:\n'},
        {'text': 'Selecione um item da lista OU digite manualmente separando por ponto e vírgula (;).\n\nEx: Negligência; Abuso sexual'}
      ]
    }
    worksheet.getCell('J1').note = 'Preencher se for menor de idade.'
    worksheet.getCell('R1').note = 'Calculado automaticamente se deixado em branco.'
    worksheet.getCell('W1').note = 'Cole o link completo do processo SEI.'

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

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
          resp: c.responsavelLegal || '-',
          parent: c.parentescoResponsavel || '-',
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
          link_sei: c.linkSei || '-',
          status: c.status.replace(/_/g, ' '),
          agente: c.agenteAcolhida?.nome || '-',
          spec: c.especialistaPAEFI?.nome || '-',
          origem: c.origem
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}