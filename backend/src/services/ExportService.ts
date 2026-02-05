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
    'Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte', 'Risco de reincidência', 'Sofre ameaça',
    'Risco de desabrigo', 'Criança/Adolescente', 'PCD', 'Idoso', 
    'Internação', 'Acolhimento', 'Gestante/Lactante',
    'Sem risco imediato', 'Visita periódica'
  ],

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
    'Tráficos de seres humanos',
    'Trabalho infantil', 
    'Discriminação', 
    'Situação de rua', 
    'Outros'
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

  // Validação simples (Dropdown direto na célula)
  private static addDataValidation(worksheet: ExcelJS.Worksheet, colLetter: string, optionsList: string[], allowType: boolean = false) {
    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`${colLetter}${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${optionsList.join(',')}"`],
        showErrorMessage: true,
        errorStyle: allowType ? 'warning' : 'stop',
        errorTitle: allowType ? 'Atenção' : 'Valor Inválido',
        error: allowType 
          ? 'Este valor não está na lista. Certifique-se que a grafia está correta.' 
          : 'Selecione um item da lista.'
      }
    }
  }

  // Validação via Aba Oculta (Para listas grandes)
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

    // Preenche a coluna na aba oculta
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
          ? 'Você digitou um valor fora da lista padrão.' 
          : 'Selecione um valor válido.'
      }
    }
  }

  private static getColumns() {
    return [
      { header: 'ID (Sistema)', key: 'id', width: 15 }, // A
      { header: 'Nome Completo', key: 'nome', width: 35 }, // B
      { header: 'Nome Social', key: 'nome_social', width: 25 }, // C
      { header: 'CPF', key: 'cpf', width: 18 }, // D
      { header: 'Data Nascimento', key: 'nasc', width: 15 }, // E
      
      { header: 'Sexo', key: 'sexo', width: 15 },        // F
      { header: 'Categoria', key: 'cat', width: 25 },     // G
      
      { header: 'Ocupação', key: 'ocupacao', width: 25 }, // H
      { header: 'Renda', key: 'renda', width: 15 }, // I
      { header: 'Responsável Legal', key: 'resp', width: 30 }, // J
      { header: 'Parentesco', key: 'parent', width: 15 }, // K
      { header: 'Telefone', key: 'telefone', width: 18 }, // L
      
      // --- ENDEREÇO DETALHADO (NOVAS COLUNAS) ---
      { header: 'CEP', key: 'cep', width: 12 },                 // M
      { header: 'Região Adm. (RA)', key: 'ra', width: 20 },     // N
      { header: 'Logradouro', key: 'logradouro', width: 35 },   // O
      { header: 'Complemento', key: 'complemento', width: 20 }, // P
      { header: 'Bairro', key: 'bairro', width: 20 },           // Q
      
      { header: 'Data Entrada', key: 'entrada', width: 15 }, // R
      { header: 'Data Início PAEFI', key: 'inicio_paefi', width: 20 }, // S
      
      { header: 'Urgência', key: 'urgencia', width: 25 }, // T
      { header: 'Peso', key: 'peso', width: 8 }, // U
      { header: 'Violações', key: 'violacoes', width: 35 }, // V
      { header: 'Benefícios', key: 'beneficios', width: 25 }, // W
      
      { header: 'Orgão Demandante', key: 'orgao', width: 20 }, // X
      { header: 'Nº SEI', key: 'sei', width: 20 }, // Y
      { header: 'Link SEI', key: 'link_sei', width: 30 }, // Z
      
      { header: 'Status', key: 'status', width: 25 },     // AA
      { header: 'Agente Acolhida', key: 'agente', width: 25 }, // AB
      { header: 'Especialista Ref.', key: 'spec', width: 25 }, // AC
      
      { header: 'Origem do Cadastro', key: 'origem', width: 20 }, // AD
    ]
  }

  static async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Modelo de Importação')

    worksheet.columns = this.getColumns()

    // Estilo do Cabeçalho
    worksheet.getRow(1).font = { bold: true, size: 12 }
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    // --- LINHA DE EXEMPLO ---
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
      
      // Endereço Separado
      cep: '72700000',
      ra: 'Brazlândia',
      logradouro: 'Quadra 10 Conjunto A Casa 5',
      complemento: 'Fundos',
      bairro: 'Vila São José',
      
      entrada: '01/01/2024',
      inicio_paefi: '05/01/2024',
      urgencia: 'Risco de morte',
      peso: '4',
      violacoes: 'Negligência; Violência física',
      beneficios: 'Bolsa Família',
      orgao: 'Conselho Tutelar',
      sei: '00000-000000/2024',
      link_sei: 'https://sei.df.gov.br/...',
      status: 'EM_ACOMPANHAMENTO',
      origem: 'DOCUMENTAL',
      agente: 'Nome do Técnico',
      spec: 'Nome do Especialista'
    })

    // --- Validadores (Dropdowns) ---
    // Coluna F = Sexo
    this.addDataValidation(worksheet, 'F', LISTAS.SEXO)
    // Coluna AD = Origem (última coluna)
    this.addDataValidation(worksheet, 'AD', LISTAS.ORIGEM)
    
    // Listas Grandes via Aba Oculta
    // Coluna G = Categoria
    this.addReferenceValidation(workbook, worksheet, 'G', LISTAS.CATEGORIA, 'A') 
    // Coluna N = RA
    this.addReferenceValidation(workbook, worksheet, 'N', LISTAS.RAS, 'B')       
    // Coluna T = Urgencia
    this.addReferenceValidation(workbook, worksheet, 'T', LISTAS.URGENCIA, 'C')  
    // Coluna AA = Status
    this.addReferenceValidation(workbook, worksheet, 'AA', LISTAS.STATUS, 'D')
    // Coluna V = Violacoes
    this.addReferenceValidation(workbook, worksheet, 'V', LISTAS.VIOLACOES, 'E', true)

    // --- Notas de Instrução ---
    worksheet.getCell('D1').note = 'Obrigatório. Apenas números (11 dígitos).'
    worksheet.getCell('M1').note = 'CEP: Apenas números.'
    worksheet.getCell('N1').note = 'Selecione a RA na lista.'
    worksheet.getCell('R1').note = 'Data de chegada/triagem.'
    worksheet.getCell('S1').note = 'Data de início do acompanhamento (PAEFI).'
    worksheet.getCell('V1').note = {
      texts: [
        {'font': {'bold': true}, 'text': 'Múltipla Escolha:\n'},
        {'text': 'Separe os itens com ponto e vírgula (;).\n\nExemplo: Negligência; Abuso sexual'}
      ]
    }
    worksheet.getCell('Z1').note = 'Cole o link completo do processo SEI.'

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
          
          // Mapeamento dos campos de endereço individuais
          cep: c.endereco_cep || '-',
          ra: c.endereco_ra || '-',
          logradouro: c.endereco_logradouro || '-',
          complemento: c.endereco_complemento || '',
          bairro: c.endereco_bairro || '-',
          
          entrada: this.formatDate(c.dataEntrada),
          inicio_paefi: this.formatDate(c.dataInicioPAEFI),
          
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