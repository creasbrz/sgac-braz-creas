// backend/src/services/RMAService.ts
import { differenceInYears } from 'date-fns'

// --- Interfaces Internas (Espelho do Frontend) ---
export interface AgeBreakdown {
  masculino: { a0_12: number; a13_17: number; a18_59: number; a60_mais: number };
  feminino: { a0_12: number; a13_17: number; a18_59: number; a60_mais: number };
  total: number;
}

export interface ChildBreakdown {
  masculino: { a0_6: number; a7_12: number; a13_17: number };
  feminino: { a0_6: number; a7_12: number; a13_17: number };
  total: number;
}

export interface RMAResultBlock1 {
    a1_total_acompanhamento: number;
    a2_novos_casos: number;
    b1_bolsa_familia: number;
    b2_bpc: number;
    b3_trabalho_infantil: number;
    b4_acolhimento: number;
    b5_drogas: number;
    b6_vitimas: AgeBreakdown;
    b7_mse: number;
    c1_infamiliar: ChildBreakdown;
    c2_abuso: ChildBreakdown;
    c3_exploracao: ChildBreakdown;
    c4_negligencia: ChildBreakdown;
    c5_trabalho_infantil: { 
      masculino: { a0_12: number; a13_15: number }; 
      feminino: { a0_12: number; a13_15: number }; 
      total: number; 
    };
    d1_violencia: number;
    d2_negligencia: number;
    e1_violencia: AgeBreakdown;
    e2_negligencia: AgeBreakdown;
    f1_mulheres: number;
    g1_trafico: AgeBreakdown;
    h1_discriminacao: number;
    i1_rua: AgeBreakdown;
}

// Helpers de Inicialização
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
  static calculate(
    activeCasesCount: number,
    newCases: any[], 
    refDate: Date = new Date()
  ): RMAResultBlock1 {
    
    const stats: RMAResultBlock1 = {
        a1_total_acompanhamento: activeCasesCount,
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

    // Processa APENAS os NOVOS casos para o perfil (Regra do RMA)
    for (const c of newCases) {
      // Normalização de Dados
      // Se c.nascimento for null, assumimos uma data safe ou ignoramos
      if (!c.nascimento) continue; 

      const age = differenceInYears(refDate, new Date(c.nascimento))
      const sex = (c.sexo && c.sexo.toLowerCase().startsWith('f')) ? 'feminino' : 'masculino'
      
      const violacoes = Array.isArray(c.violacao) ? c.violacao : (c.violacao ? [String(c.violacao)] : [])
      const violacoesStr = violacoes.join(' ').toLowerCase()
      
      const beneficios = Array.isArray(c.beneficios) ? c.beneficios : (c.beneficios ? [String(c.beneficios)] : [])
      const beneficiosStr = beneficios.join(' ').toLowerCase()

      const urgenciaStr = c.urgencia ? c.urgencia.toLowerCase() : ''
      const categoriaStr = c.categoria ? c.categoria.toLowerCase() : ''

      // Flags
      const isChild = age < 18
      const isElderly = age >= 60
      const isWoman = sex === 'feminino' && age >= 18 && age <= 59
      const isPCD = categoriaStr.includes('pcd') || categoriaStr.includes('deficiência')
      
      // Helpers de Incremento
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

      // --- LÓGICA DE CLASSIFICAÇÃO ---
      
      // B. Perfil
      if (beneficiosStr.includes('bolsa família') || beneficiosStr.includes('pbf')) stats.b1_bolsa_familia++
      if (beneficiosStr.includes('bpc')) stats.b2_bpc++
      if (violacoesStr.includes('trabalho infantil')) stats.b3_trabalho_infantil++
      if (isChild && (urgenciaStr.includes('acolhimento') || violacoesStr.includes('acolhimento'))) stats.b4_acolhimento++
      if (isChild && (categoriaStr.includes('drogas') || violacoesStr.includes('drogas'))) stats.b5_drogas++
      if (violacoesStr.includes('mse') || violacoesStr.includes('medidas socio')) stats.b7_mse++

      // B.6 Vitimas
      incStandard(stats.b6_vitimas)

      // C. Crianças
      if (isChild) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica')) incChild(stats.c1_infamiliar)
        if (violacoesStr.includes('abuso sexual') || violacoesStr.includes('violência sexual')) incChild(stats.c2_abuso)
        if (violacoesStr.includes('exploração sexual')) incChild(stats.c3_exploracao)
        if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) incChild(stats.c4_negligencia)
        
        if (violacoesStr.includes('trabalho infantil') && age <= 15) {
          stats.c5_trabalho_infantil.total++
          if (age <= 12) stats.c5_trabalho_infantil[sex].a0_12++
          else stats.c5_trabalho_infantil[sex].a13_15++
        }
      }

      // D. Idosos
      if (isElderly) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual') || violacoesStr.includes('patrimonial')) stats.d1_violencia++
        if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) stats.d2_negligencia++
      }

      // E. PCD
      if (isPCD) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual')) incStandard(stats.e1_violencia)
        if (violacoesStr.includes('negligência') || violacoesStr.includes('abandono')) incStandard(stats.e2_negligencia)
      }

      // F. Mulheres
      if (isWoman) {
        if (violacoesStr.includes('física') || violacoesStr.includes('psicológica') || violacoesStr.includes('sexual') || urgenciaStr.includes('agressor')) stats.f1_mulheres++
      }

      // G/H/I
      if (violacoesStr.includes('tráfico')) incStandard(stats.g1_trafico)
      if (violacoesStr.includes('discriminação') || categoriaStr.includes('lgbt')) stats.h1_discriminacao++
      if (categoriaStr.includes('rua') || violacoesStr.includes('rua')) incStandard(stats.i1_rua)
    }

    return stats
  }
}