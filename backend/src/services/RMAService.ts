// backend/src/services/RMAService.ts
import { differenceInYears } from 'date-fns'

// Interface que espelha o Formulário Oficial
export interface RMAResult {
  bloco1: {
    A1_total_acompanhamento: number;
    A2_novos_casos: number;
    B1_bolsa_familia: number;
    B2_bpc: number;
    B3_trabalho_infantil: number;
    B4_acolhimento: number;
    B5_drogas: number;
    B7_mse: number;
  };
  violacoes_identificadas: {
    crianca_adolescente: {
      fisica_psico: number; // C.1
      exploracao_sexual: number; // C.2
      abuso_sexual: number; // C.3
      negligencia_abandono: number; // C.4
      trabalho_infantil: number; // C.5
    };
    idoso: {
      fisica_psico_patrimonial: number; // D.1
      negligencia_abandono: number; // D.2
    };
    pcd: {
      total: number; // E.1
    };
    mulher: {
      violencia_domestica: number; // F.1
    };
  }
}

export class RMAService {
  /**
   * Processa uma lista de casos e gera a matriz do RMA
   * @param cases Lista de casos (prisma.case.findMany)
   * @param refDate Data de referência para cálculo de idade
   */
  static calculate(cases: any[], refDate: Date = new Date()): RMAResult {
    const result: RMAResult = {
      bloco1: { A1_total_acompanhamento: 0, A2_novos_casos: 0, B1_bolsa_familia: 0, B2_bpc: 0, B3_trabalho_infantil: 0, B4_acolhimento: 0, B5_drogas: 0, B7_mse: 0 },
      violacoes_identificadas: {
        crianca_adolescente: { fisica_psico: 0, exploracao_sexual: 0, abuso_sexual: 0, negligencia_abandono: 0, trabalho_infantil: 0 },
        idoso: { fisica_psico_patrimonial: 0, negligencia_abandono: 0 },
        pcd: { total: 0 },
        mulher: { violencia_domestica: 0 }
      }
    };

    cases.forEach(c => {
      // 1. Dados Demográficos
      const age = differenceInYears(refDate, new Date(c.nascimento));
      const isChild = age < 18;
      const isElderly = age >= 60;
      const isWoman = c.sexo === 'Feminino';
      const isPCD = c.categoria === 'PCD' || c.pcd === true; // Ajuste conforme seu schema

      // 2. Normalização das Violações (Garante Array)
      const violations: string[] = Array.isArray(c.violacao) 
        ? c.violacao 
        : (c.violacao ? [c.violacao] : []);

      // --- BLOCO I (Volumes e Perfil de Novos) ---
      // Assumindo que a lista 'cases' já foi filtrada por data no Controller
      
      // Contagem de Novos Casos (A.2) - Lógica deve ser feita no controller ou aqui checando dataEntrada
      // Aqui assumimos que estamos processando o "retrato" do mês
      
      // Perfil (B.1 a B.7) - Baseado em Benefícios e Violações
      const benefits = c.beneficios || [];
      if (benefits.includes('PROGRAMA BOLSA FAMÍLIA (PBF)')) result.bloco1.B1_bolsa_familia++;
      if (benefits.includes('BENEFÍCIO DE PRESTAÇÃO CONTINUADA (BPC)')) result.bloco1.B2_bpc++;
      
      // B.3 - Trabalho Infantil (Independente da idade, conta a FAMÍLIA)
      if (violations.some(v => v.includes('Trabalho infantil'))) result.bloco1.B3_trabalho_infantil++;
      
      // B.5 - Drogas
      if (c.categoria === 'Álcool/drogas' || violations.some(v => v.includes('drogas'))) result.bloco1.B5_drogas++;

      // --- MAPEAMENTO DE VIOLAÇÕES (C a F) ---
      // Uma pessoa pode somar em múltiplas linhas aqui
      
      violations.forEach(v => {
        const violation = v.toLowerCase();

        // CRIANÇA/ADOLESCENTE (Bloco C)
        if (isChild) {
          if (violation.includes('física') || violation.includes('psicológica')) result.violacoes_identificadas.crianca_adolescente.fisica_psico++;
          if (violation.includes('exploração sexual')) result.violacoes_identificadas.crianca_adolescente.exploracao_sexual++;
          if (violation.includes('abuso sexual') || violation.includes('violência sexual')) result.violacoes_identificadas.crianca_adolescente.abuso_sexual++;
          if (violation.includes('negligência') || violation.includes('abandono')) result.violacoes_identificadas.crianca_adolescente.negligencia_abandono++;
          if (violation.includes('trabalho infantil')) result.violacoes_identificadas.crianca_adolescente.trabalho_infantil++;
        }

        // IDOSO (Bloco D)
        if (isElderly) {
          if (violation.includes('física') || violation.includes('psicológica') || violation.includes('patrimonial')) 
            result.violacoes_identificadas.idoso.fisica_psico_patrimonial++;
          if (violation.includes('negligência') || violation.includes('abandono')) 
            result.violacoes_identificadas.idoso.negligencia_abandono++;
        }

        // PCD (Bloco E)
        if (isPCD) {
           // O RMA pede violações contra PCD em geral
           result.violacoes_identificadas.pcd.total++;
        }

        // MULHER (Bloco F)
        if (isWoman && !isChild) { // Geralmente adultas, mas depende da interpretação do município
           // Mapear se a violação tem característica doméstica ou se convive com agressor
           if (violation.includes('física') || violation.includes('psicológica') || c.urgencia.includes('Convive com agressor')) {
             result.violacoes_identificadas.mulher.violencia_domestica++;
           }
        }
      });
    });

    // Totais calculados
    result.bloco1.A1_total_acompanhamento = cases.length; 
    
    return result;
  }
}