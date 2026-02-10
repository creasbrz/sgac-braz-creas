// frontend/src/types/case.ts

// Estruturas auxiliares para quebra por idade/sexo
export interface AgeBreakdown {
  masculino: {
    a0_12: number; a13_17: number; a18_59: number; a60_mais: number
  };
  feminino: {
    a0_12: number; a13_17: number; a18_59: number; a60_mais: number
  };
  total: number;
}

export interface ChildBreakdown {
  masculino: { a0_6: number; a7_12: number; a13_17: number };
  feminino: { a0_6: number; a7_12: number; a13_17: number };
  total: number;
}

export interface ChildLaborBreakdown {
  masculino: { a0_12: number; a13_15: number };
  feminino: { a0_12: number; a13_15: number };
  total: number;
}

// O Objeto Principal que o PDF espera
export interface RmaReportData {
  periodo: string;
  generatedAt: string;
  bloco1: {
    // A - Volume
    a1_total_acompanhamento: number;
    a2_novos_casos: number;
    // B - Perfil
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas: AgeBreakdown;
    b7_mse: number;
    // C - Crianças
    c1_infamiliar: ChildBreakdown;
    c2_abuso: ChildBreakdown;
    c3_exploracao: ChildBreakdown;
    c4_negligencia: ChildBreakdown;
    c5_trabalho_infantil: ChildLaborBreakdown;
    // D - Idosos
    d1_violencia: number;
    d2_negligencia: number;
    // E - PCD
    e1_violencia: AgeBreakdown;
    e2_negligencia: AgeBreakdown;
    // F - Mulheres
    f1_mulheres: number;
    // G - Tráfico
    g1_trafico: AgeBreakdown;
    // H - Discriminação
    h1_discriminacao: number;
    // I - Pop Rua
    i1_rua: AgeBreakdown;
  };
  bloco2: {
    m1_individual: number;
    m2_grupo: number;
    m3_cras: number;
    m4_visitas: number;
  };
}