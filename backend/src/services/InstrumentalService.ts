// backend/src/services/InstrumentalService.ts
import { prisma } from '../lib/prisma'
import { LogAction } from '@prisma/client'
import { UpsertPafInput, CreateDocumentInput } from '../schemas/instrumentalSchema'

export class InstrumentalService {
  
  /**
   * Cria ou Atualiza o PAF (Gera versão anterior automaticamente)
   * e processa as entregas vinculadas.
   */
  static async upsertPaf(userId: string, data: UpsertPafInput) {
    // 1. Verifica se já existe PAF (Usando casoId conforme schema)
    const existingPaf = await prisma.paf.findUnique({
      where: { casoId: data.caseId } // [CORREÇÃO] casoId
    })

    // 2. Se existir, salva backup na tabela PafVersion
    if (existingPaf) {
      await prisma.pafVersion.create({
        data: {
          pafId: existingPaf.id,
          diagnostico: existingPaf.diagnostico,
          objetivos: existingPaf.objetivos,
          estrategias: existingPaf.estrategias,
          deadline: existingPaf.deadline,
          autorId: existingPaf.autorId,
          savedAt: new Date(),
          versaoNumero: existingPaf.versaoAtual
        }
      })
    }

    // 3. Atualiza ou Cria o PAF Atual
    const paf = await prisma.paf.upsert({
      where: { casoId: data.caseId }, // [CORREÇÃO] casoId
      update: {
        diagnostico: data.diagnostico,
        objetivos: data.objetivos,
        estrategias: data.estrategias,
        deadline: data.deadline,
        autorId: userId,
        versaoAtual: { increment: 1 }
      },
      create: {
        casoId: data.caseId, // [CORREÇÃO] casoId
        diagnostico: data.diagnostico,
        objetivos: data.objetivos,
        estrategias: data.estrategias,
        deadline: data.deadline,
        autorId: userId,
        versaoAtual: 1
      }
    })

    // 4. Processa Entregas/Benefícios vinculados ao PAF
    if (data.entregas && data.entregas.length > 0) {
      for (const item of data.entregas) {
        await prisma.serviceDeliverable.create({
          data: {
            casoId: data.caseId,
            responsavelId: userId,
            tipo: item,
            status: 'CONCEDIDO',
            dataSolicitacao: new Date(),
            observacoes: `Concessão registrada via PAF (v${paf.versaoAtual})`
          }
        })
      }
    }

    // 5. Log
    await prisma.caseLog.create({
      data: {
        casoId: data.caseId,
        autorId: userId,
        acao: existingPaf ? LogAction.PAF_ATUALIZADO : LogAction.PAF_CRIADO,
        descricao: existingPaf 
          ? `Repactuação do PAF (v${paf.versaoAtual}).` 
          : `Elaboração do Plano de Acompanhamento Inicial.`
      }
    })

    return paf
  }

  /**
   * Cria um Documento Técnico (Relatório/Ofício)
   */
  static async createDocument(userId: string, data: CreateDocumentInput) {
    const doc = await prisma.technicalDocument.create({
      data: {
        tipo: data.tipo,
        conteudo: data.conteudo, // JSON
        casoId: data.caseId, // [CORREÇÃO] casoId
        autorId: userId
      }
    })

    const nomesDoc: Record<string, string> = {
      'RELATORIO_SOCIO': 'Relatório Socioassistencial',
      'RELATORIO_INFORMATIVO': 'Relatório Informativo',
      'SOLICITACAO_ACOLHIMENTO': 'Solicitação de Acolhimento'
    }

    await prisma.caseLog.create({
      data: {
        casoId: data.caseId,
        autorId: userId,
        acao: LogAction.OUTRO,
        descricao: `Emissão de ${nomesDoc[data.tipo] || 'Documento Técnico'}.`
      }
    })

    return doc
  }

  /**
   * Lista histórico de documentos de um caso
   */
  static async listDocuments(caseId: string) {
    return prisma.technicalDocument.findMany({
      where: { casoId: caseId }, // [CORREÇÃO] casoId
      orderBy: { createdAt: 'desc' },
      include: {
        autor: { select: { nome: true, cargo: true } }
      }
    })
  }

  /**
   * Busca histórico de versões do PAF
   */
  static async getPafHistory(caseId: string) {
    // Busca PAF com includes e tipagem inferida
    const paf = await prisma.paf.findUnique({
        where: { casoId: caseId }, // [CORREÇÃO] casoId
        include: { 
            versoes: { orderBy: { savedAt: 'desc' }, include: { autor: { select: { nome: true } } } },
            autor: { select: { nome: true } }
        }
    })

    if (!paf) return []

    // Formata para retornar uma lista unificada
    // O TypeScript agora deve reconhecer 'versoes' e 'autor' porque usamos 'include'
    const history = [
        {
            id: paf.id,
            diagnostico: paf.diagnostico,
            objetivos: paf.objetivos,
            estrategias: paf.estrategias,
            deadline: paf.deadline,
            savedAt: paf.updatedAt,
            autor: paf.autor,
            versaoNumero: paf.versaoAtual,
            isCurrent: true
        },
        // [CORREÇÃO] Tipagem explícita no map para evitar erro 7006
        ...paf.versoes.map((v: any) => ({ ...v, isCurrent: false }))
    ]

    return history
  }
}