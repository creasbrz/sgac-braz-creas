// backend/src/services/RMAService.ts
import { differenceInYears } from 'date-fns'
import { Case } from '@prisma/client' // Importando tipagem do Prisma

// --- Interfaces de Dados do RMA (Espelho do Formulário Oficial) ---

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

export interface RMAResult {
  bloco1: {
    // Bloco A - Volume
    a1_total_acompanhamento: number;
    a2_novos_casos: number;
    
    // Bloco B - Perfil
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas: AgeBreakdown; // Tabela B.6 (Demografia Geral)
    b7_mse: number;

    // Bloco C - Crianças e Adolescentes (Detalhado)
    c1_infamiliar: ChildBreakdown;
    c2_abuso: ChildBreakdown;
    c3_exploracao: ChildBreakdown;
    c4_negligencia: ChildBreakdown;
    c5_trabalho_infantil: { // Específico C.5
      masculino: { a0_12: number; a13_15: number };
      feminino: { a0_12: number; a13_15: number };
      total: number;
    };

    // Bloco D - Idosos
    d1_violencia: number;
    d2_negligencia: number;

    // Bloco E - PCD
    e1_violencia: AgeBreakdown;
    e2_negligencia: AgeBreakdown;

    // Bloco F - Mulheres
    f1_mulheres: number;

    // Bloco G - Tráfico
    g1_trafico: AgeBreakdown;

    // Bloco H - Discriminação
    h1_discriminacao: number;

    // Bloco I - Pop Rua
    i1_rua: AgeBreakdown;
  };
  // Bloco II (Produção) é preenchido na rota com queries de outras tabelas
}

// --- Helpers de Inicialização ---
const initAgeBreakdown = (): AgeBreakdown => ({
  masculino: { a0_12: 0, a13_17: 0, a18_59: 0, a60_mais: 0 },
  feminino: { a0_12: 0, a13_17: 0, a18_59: 0, a60_mais: 0 },
  total: 0
})

const initChildBreakdown = (): ChildBreakdown => ({
  masculino: { a0_6: 0, a7_12: 0, a13_17: 0 },
  feminino: { a0_6: 0, a7_12: 0, a13_17: 0 },
  total: 0
})

export class RMAService {
  
  /**
   * Processa a lista de casos e calcula a matriz completa do RMA.
   * A lógica foi centralizada aqui para limpar o controller/rota.
   */
  static calculate(
    activeCases: (Case & { violacao?: string[] | null, beneficios?: string[] | null, categoria?: string | null })[], 
    newCases: Case[], 
    refDate: Date = new Date()
  ): RMAResult {
    
    // Inicializa estrutura zerada
    const stats: RMAResult = {
      bloco1: {
        a1_total_acompanhamento: activeCases.length,
        a2_novos_casos: newCases.length,
        b1_bolsa_familia: 0, b2_bpc: 0, b3_trabalho_infantil: 0, b4_acolhimento: 0, b5_drogas: 0, b7_mse: 0,
        b6_vitimas: initAgeBreakdown(),
        c1_infamiliar: initChildBreakdown(),
        c2_abuso: initChildBreakdown(),
        c3_exploracao: initChildBreakdown(),
        c4_negligencia: initChildBreakdown(),
        c5_trabalho_infantil: { masculino: { a0_12: 0, a13_15: 0 }, feminino: { a0_12: 0, a13_15: 0 }, total: 0 },
        d1_violencia: 0, d2_negligencia: 0,
        e1_violencia: initAgeBreakdown(), e2_negligencia: initAgeBreakdown(),
        f1_mulheres: 0,
        g1_trafico: initAgeBreakdown(),
        h1_discriminacao: 0,
        i1_rua: initAgeBreakdown()
      }
    }

    // Processa APENAS os NOVOS casos para o perfil (Regra do RMA: Perfil refere-se às entradas do mês)
    // Nota: Dependendo da interpretação municipal, pode-se usar activeCases aqui. 
    // O padrão SUAS geralmente pede perfil dos "Casos inseridos no PAEFI no mês de referência" para o Bloco B em diante.
    // SE for necessário perfil do estoque inteiro, troque `newCases` por `activeCases` abaixo.
    const casesToAnalyze = newCases; 

    for (const c of casesToAnalyze) {
      // 1. Dados Básicos Normalizados
      const age = differenceInYears(refDate, new Date(c.nascimento))
      const sex = (c.sexo && c.sexo.toLowerCase().startsWith('f')) ? 'feminino' : 'masculino'
      
      const violacoes = Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [c.violacao] : [])
      const violacoesStr = violacoes.join(' ').toLowerCase()
      
      const beneficios = Array.isArray(c.beneficios) ? c.beneficios : (c.beneficios ? [c.beneficios] : [])
      const beneficiosStr = beneficios.join(' ').toLowerCase()

      // Flags de Grupo
      const isChild = age < 18
      const isElderly = age >= 60
      const isWoman = sex === 'feminino' && age >= 18 && age <= 59
      const isPCD = c.categoria === 'PCD' || (c.categoria && c.categoria.toLowerCase().includes('deficiência'))
      
      // --- Helpers de Incremento ---
      const incStandard = (target: AgeBreakdown) => {
        target.total++
        if (age <= 12) target[sex].a0_12++
        else if (age <= 17) target[sex].a13_17++
        else if (age <= 59) target[sex].a18_59++
        else target[sex].a60_mais++
      }

      const incChild = (target: ChildBreakdown) => {
        target.total++
        if (age <= 6) target[sex].a0_6++
        else if (age <= 12) target[sex].a7_12++
        else if (age <= 17) target[sex].a13_17++
      }

      // --- BLOCO B: Perfil Geral ---
      if (beneficiosStr.includes('bolsa família') || beneficiosStr.includes('pbf')) stats.bloco1.b1_bolsa_familia++
      if (beneficiosStr.includes('bpc')) stats.bloco1.b2_bpc++
      if (violacoesStr.includes('trabalho infantil')) stats.bloco1.b3_trabalho_infantil++
      if (isChild && c.urgencia.toLowerCase().includes('acolhimento')) stats.bloco1.b4_acolhimento++
      if (isChild && (c.categoria?.toLowerCase().includes('drogas') || violacoesStr.includes('drogas'))) stats.bloco1.b5_drogas++
      if (violacoesStr.includes('medidas socioeducativas') || violacoesStr.includes('mse')) stats.bloco1.b7_mse++

      // B.6 - Demografia das Vítimas (Todos os novos casos contam aqui)
      incStandard(stats.bloco1.b6_vitimas)

      // --- BLOCO C: Crianças e Adolescentes ---
      if (isChild) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica')) incChild(stats.bloco1.c1_infamiliar)
        if (violacoesStr.includes('abuso sexual') || violacoesStr.includes('violência sexual')) incChild(stats.bloco1.c2_abuso)
        if (violacoesStr.includes('exploração sexual')) incChild(stats.bloco1.c3_exploracao)
        if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) incChild(stats.bloco1.c4_negligencia)
        
        // C.5 Trabalho Infantil (Regra Específica de idade: até 15 anos vs 16-17 não conta aqui para algumas tabelas, mas vamos seguir o padrão do formulário)
        if (violacoesStr.includes('trabalho infantil') && age <= 15) {
          stats.bloco1.c5_trabalho_infantil.total++
          if (age <= 12) stats.bloco1.c5_trabalho_infantil[sex].a0_12++
          else stats.bloco1.c5_trabalho_infantil[sex].a13_15++
        }
      }

      // --- BLOCO D: Idosos ---
      if (isElderly) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual') || violacoesStr.includes('patrimonial')) {
          stats.bloco1.d1_violencia++
        }
        if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) {
          stats.bloco1.d2_negligencia++
        }
      }

      // --- BLOCO E: PCD ---
      if (isPCD) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) incStandard(stats.bloco1.e1_violencia)
        if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) incStandard(stats.bloco1.e2_negligencia)
      }

      // --- BLOCO F: Mulheres ---
      if (isWoman) {
        // Violência doméstica ou convívio com agressor
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual') || c.urgencia.toLowerCase().includes('agressor')) {
          stats.bloco1.f1_mulheres++
        }
      }

      // --- BLOCO G: Tráfico ---
      if (violacoesStr.includes('tráfico')) incStandard(stats.bloco1.g1_trafico)

      // --- BLOCO H: Discriminação ---
      if (violacoesStr.includes('discriminação') || c.categoria === 'LGBTQIA+') stats.bloco1.h1_discriminacao++

      // --- BLOCO I: População em Situação de Rua ---
      if (c.categoria === 'POP RUA' || c.categoria?.toLowerCase().includes('rua') || violacoesStr.includes('rua')) {
        incStandard(stats.bloco1.i1_rua)
      }
    }

    return stats
  }
}