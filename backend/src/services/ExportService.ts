// backend/src/services/ExportService.ts
import { prisma } from '../lib/prisma'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Buffer } from 'node:buffer'

// --- CONSTANTES (Fontes da Verdade) ---
const LISTAS = {
  SEXO: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  
  // Lista atualizada conforme pedido
  CATEGORIA: [
    'Mulher', 
    'POP RUA', 
    'LGBTQIA+', 
    'Migrante', 
    'Idoso', 
    'Criança/adolescente', 
    'PCD', 
    'Álcool/drogas', 
    'Família em vulnerabilidade'
  ],

  URGENCIA: [
    'Sem risco imediato (Peso 1)',
    'Risco Social (Peso 2)',
    'Violação de Direitos (Peso 3)',
    'Risco Grave / Morte (Peso 4)'
  ],

  // Lista atualizada conforme pedido
  VIOLACOES: [
    'Abandono', 
    'Negligência', 
    'Afastamento do convívio familiar', 
    'Violência física', 
    'Violência psicológica', 
    'Abuso sexual', 
    'Exploração sexual',
    'Tráfico de seres humanos', 
    'Abuso financeiro/patrimonial', 
    'Trabalho infantil', 
    'Discriminação', 
    'Situação de rua', 
    'Outros'
  ],

  STATUS: [
    'AGUARDANDO_ACOLHIDA',
    'AGUARDANDO_DISTRIBUICAO',
    'EM_ACOLHIDA', // Adicionado para compatibilidade
    'EM_ACOLHIDA_ESPECIALIZADA',
    'EM_ACOMPANHAMENTO',
    'EM_MONITORAMENTO',
    'DESLIGADO'
  ],

  ORIGEM: [
    'ESPONTANEA',
    'DOCUMENTAL',
    'REFERENCIADA',
    'BUSCA_ATIVA'
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

  private static addDataValidation(worksheet: ExcelJS.Worksheet, colLetter: string, optionsList: string[]) {
    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`${colLetter}${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${optionsList.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Entrada Inválida',
        error: 'Selecione um item da lista.'
      }
    }
  }

  private static addReferenceValidation(
    workbook: ExcelJS.Workbook, 
    mainSheet: ExcelJS.Worksheet, 
    colLetter: string, 
    data: string[], 
    refCol: string
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
        errorStyle: 'stop',
        error: 'Selecione um valor válido.'
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
      
      { header: 'Status', key: 'status', width: 25 },     // W
      { header: 'Agente Acolhida', key: 'agente', width: 25 },
      { header: 'Especialista Ref.', key: 'spec', width: 25 },
      
      { header: 'Origem do Cadastro', key: 'origem', width: 20 }, // Z
    ]
  }

  /**
   * Gera o Buffer do Modelo de Importação (Template Rico)
   */
  static async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Modelo de Importação')

    worksheet.columns = this.getColumns()

    // Estilo
    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    // --- Validadores (Dropdowns) ---
    this.addDataValidation(worksheet, 'F', LISTAS.SEXO)
    this.addDataValidation(worksheet, 'Z', LISTAS.ORIGEM)
    
    // Listas Grandes via Aba Oculta
    this.addReferenceValidation(workbook, worksheet, 'G', LISTAS.CATEGORIA, 'A') // Coluna A oculta
    this.addReferenceValidation(workbook, worksheet, 'O', LISTAS.RAS, 'B')       // Coluna B oculta
    this.addReferenceValidation(workbook, worksheet, 'Q', LISTAS.URGENCIA, 'C')  // Coluna C oculta
    this.addReferenceValidation(workbook, worksheet, 'W', LISTAS.STATUS, 'D')    // Coluna D oculta
    
    // --- Salvar Violações na Aba Oculta para Referência ---
    // (Não aplicamos validação estrita na coluna S pois é multi-select, 
    // mas colocamos a lista na aba oculta caso o usuário queira consultar)
    let dataSheet = workbook.getWorksheet('DadosOcultos')
    if (dataSheet) {
        // Cabeçalho na aba oculta (opcional, só para organização)
        dataSheet.getCell('E1').value = "LISTA DE VIOLAÇÕES (Para Consulta)"
        LISTAS.VIOLACOES.forEach((v, i) => dataSheet!.getCell(`E${i+2}`).value = v)
    }

    // --- Notas de Instrução (Comentários nas Células) ---
    worksheet.getCell('D1').note = 'Obrigatório. Apenas números (11 dígitos).'
    
    // Nota Especial para Violações
    worksheet.getCell('S1').note = {
      texts: [
        {'font': {'bold': true}, 'text': 'Campo de Múltipla Escolha:\n'},
        {'text': 'Separe os itens com ponto e vírgula (;).\n\nExemplo: Negligência; Abuso sexual\n\n'},
        {'text': 'Opções Válidas: ' + LISTAS.VIOLACOES.join(', ')}
      ]
    }

    worksheet.getCell('J1').note = 'Preencher se for menor de idade.'
    worksheet.getCell('R1').note = 'Calculado automaticamente se deixado em branco.'

    // --- LINHA DE EXEMPLO (Preenchida) ---
    worksheet.addRow({
      nome: 'EXEMPLO DE PREENCHIMENTO (Pode apagar esta linha)',
      cpf: '000.000.000-00',
      nasc: '10/05/2015',
      sexo: 'Masculino',
      cat: 'Criança/adolescente',
      ocupacao: 'Estudante',
      renda: '0,00',
      
      // Exemplo de Responsável
      resp: 'Maria da Silva (Mãe)',
      parent: 'Mãe',
      
      telefone: '61999999999',
      endereco: 'QNN 10 Conjunto A Casa 5',
      cep: '72000000',
      ra: 'Ceilândia',
      entrada: '01/01/2024',
      
      urgencia: 'Violação de Direitos (Peso 3)',
      peso: '3',
      
      // Exemplo de Múltiplas Violações
      violacoes: 'Negligência; Violência física',
      beneficios: 'Bolsa Família',
      
      orgao: 'Conselho Tutelar',
      sei: '00000-000000/2024',
      status: 'AGUARDANDO_DISTRIBUICAO',
      origem: 'DOCUMENTAL',
      agente: 'Nome do Técnico',
      spec: 'Nome do Especialista'
    })

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