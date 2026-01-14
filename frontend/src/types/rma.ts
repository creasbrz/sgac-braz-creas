// frontend/src/types/rma.ts

// Estrutura genérica que suporta todas as faixas etárias do formulário
export interface AgeBreakdown {
  masculino: {
    a0_6?: number;   // Específico Bloco C
    a7_12?: number;  // Específico Bloco C
    a0_12?: number;  // Geral
    a13_15?: number; // Específico Trabalho Infantil
    a13_17?: number; // Geral Adolescente
    a18_59?: number; // Adulto
    a60_mais?: number; // Idoso
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

export interface RmaFullData {
  bloco1: {
    // A - Volume
    a1_familias_paefi: number;
    a2_novos_casos: number;
    
    // B - Perfil Novos
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas_novos: AgeBreakdown; // Tabela B.6
    b7_mse: number;
    
    // C - Crianças/Adolescentes (Novos)
    c1_violencia_intrafamiliar: AgeBreakdown;
    c2_abuso_sexual: AgeBreakdown;
    c3_exploracao_sexual: AgeBreakdown;
    c4_negligencia: AgeBreakdown;
    c5_trabalho_infantil: AgeBreakdown;
    
    // D - Idosos
    d1_violencia_fisica_psico: number;
    d2_negligencia: number;
    
    // E - PCD
    e1_violencia_intrafamiliar: AgeBreakdown;
    e2_negligencia: AgeBreakdown;
    
    // F - Mulheres
    f1_violencia_intrafamiliar: number;
    
    // G - Tráfico
    g1_trafico: AgeBreakdown;
    
    // H - Discriminação
    h1_discriminacao: number;
    
    // I - Pop Rua
    i1_situacao_rua: AgeBreakdown;
  };
  
  bloco2: {
    m1_atendimentos_individualizados: number;
    m2_atendimentos_grupo: number;
    m3_encaminhamentos_cras: number;
    m4_visitas_domiciliares: number;
  };
}