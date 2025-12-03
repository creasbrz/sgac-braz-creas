// frontend/src/constants/options.ts

export const OPTIONS = {
  sexo: [
    'Masculino',
    'Feminino',
    'Outro',
    'Não Informado'
  ],

  urgencia: [
    'Convive com agressor',
    'Idoso 80+',
    'Primeira infância',
    'Risco de morte',
    'Risco de reincidência',
    'Sofre ameaça',
    'Risco de desabrigo',
    'Criança/Adolescente',
    'PCD',
    'Idoso',
    'Internação',
    'Acolhimento',
    'Gestante/Lactante',
    'Sem risco imediato',
    'Visita periódica'
  ],

  violacao: [
    'Abandono',
    'Negligência',
    'Afastamento do convívio familiar',
    'Cumprimento de medidas socioeducativas',
    'Descumprimento de condicionalidade do PBF',
    'Discriminação',
    'Situação de rua',
    'Trabalho infantil',
    'Violência física e/ou psicológica',
    'Violência sexual',
    'Outros'
  ],

  categoria: [
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

  status: [
    { value: 'AGUARDANDO_ACOLHIDA', label: 'Aguardando Acolhida' },
    { value: 'EM_ACOLHIDA', label: 'Em Acolhida' },
    { value: 'AGUARDANDO_DISTRIBUICAO_PAEFI', label: 'Aguardando Distribuição' },
    { value: 'EM_ACOMPANHAMENTO_PAEFI', label: 'Em Acompanhamento' },
    { value: 'DESLIGADO', label: 'Desligado' },
  ]
}