// frontend/src/types/rma.ts

/**
 * Distribuição por faixa etária e sexo.
 * As propriedades são opcionais (?) pois diferentes linhas do RMA exigem faixas diferentes.
 */
export interface AgeGenderBreakdown {
  masculino: {
    a0_6?: number;    // Primeira infância (Bloco C)
    a7_12?: number;   // Crianças (Bloco C)
    a0_12?: number;   // Crianças (Geral)
    a13_15?: number;  // Adolescentes (Trabalho Infantil)
    a13_17?: number;  // Adolescentes (Geral)
    a18_59?: number;  // Adultos
    a60_mais?: number; // Idosos
  };
  feminino: {
    a0_6?: number;
    a7_12?: number;
    a0_12?: number;
    a13_15?: number;
    a13_17?: number;
    a18_59?: number;
    a60_mais?: number;
  };
  total: number;
}

/**
 * Bloco 1: Famílias em Acompanhamento pelo PAEFI
 */
export interface RmaBlock1 {
  // A - Volume de Atendimentos
  a1_familias_paefi: number;
  a2_novos_casos: number;
  
  // B - Perfil das Famílias (Novos Casos)
  b1_bolsa_familia: number;
  b2_bpc: number; // Benefício de Prestação Continuada
  b3_trabalho_infantil: number;
  b4_acolhimento: number;
  b5_drogas: number;
  b6_vitimas_novos: AgeGenderBreakdown; 
  b7_mse: number; // Medidas Socioeducativas
  
  // C - Violações contra Crianças e Adolescentes (Novos)
  c1_violencia_intrafamiliar: AgeGenderBreakdown;
  c2_abuso_sexual: AgeGenderBreakdown;
  c3_exploracao_sexual: AgeGenderBreakdown;
  c4_negligencia: AgeGenderBreakdown;
  c5_trabalho_infantil: AgeGenderBreakdown;
  
  // D - Violações contra Idosos
  d1_violencia_fisica_psico: number;
  d2_negligencia: number;
  
  // E - Violações contra Pessoa com Deficiência (PCD)
  e1_violencia_intrafamiliar: AgeGenderBreakdown;
  e2_negligencia: AgeGenderBreakdown;
  
  // F - Violações contra Mulheres
  f1_violencia_intrafamiliar: number;
  
  // G - Tráfico de Pessoas
  g1_trafico: AgeGenderBreakdown;
  
  // H - Discriminação (Orientação Sexual / Raça / Etnia)
  h1_discriminacao: number;
  
  // I - População em Situação de Rua
  i1_situacao_rua: AgeGenderBreakdown;
}

/**
 * Bloco 2: Atendimentos Individualizados e Coletivos
 */
export interface RmaBlock2 {
  m1_atendimentos_individualizados: number;
  m2_atendimentos_grupo: number;
  m3_encaminhamentos_cras: number;
  m4_visitas_domiciliares: number;
}

/**
 * Estrutura completa do relatório RMA (Registro Mensal de Atendimentos).
 */
export interface RmaFullData {
  periodoReference?: string; // Ex: "2023-10"
  bloco1: RmaBlock1;
  bloco2: RmaBlock2;
}