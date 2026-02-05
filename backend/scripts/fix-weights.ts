// backend/scripts/fix-weights.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const calculateWeight = (urgencia: string): number => {
    if (!urgencia) return 1
    const term = urgencia.trim().toLowerCase()

    // 🔴 VERMELHO (4)
    if (
        term.includes('convive com agressor') ||
        term.includes('idoso 80+') ||
        term.includes('primeira infância') ||
        term.includes('risco de morte') ||
        term.includes('risco de reincidência') ||
        term.includes('sofre ameaça')
    ) return 4;

    // 🟠 LARANJA (3)
    if (
        term.includes('risco de desabrigo') ||
        term.includes('criança/adolescente') ||
        term.includes('pcd') ||
        term.includes('idoso') // Captura Idoso < 80
    ) return 3;

    // 🟡 AMARELO (2)
    if (
        term.includes('internação') ||
        term.includes('acolhimento') ||
        term.includes('gestante/lactante')
    ) return 2;

    // 🟢 VERDE (1)
    return 1;
}

async function main() {
    console.log('🔄 Iniciando reclassificação rigorosa (Regra V2)...')
    
    const cases = await prisma.case.findMany({
        select: { id: true, urgencia: true, pesoUrgencia: true }
    })

    let updatedCount = 0

    for (const c of cases) {
        const correctWeight = calculateWeight(c.urgencia)
        
        if (c.pesoUrgencia !== correctWeight) {
            await prisma.case.update({
                where: { id: c.id },
                data: { pesoUrgencia: correctWeight }
            })
            console.log(`✅ Caso ${c.id}: "${c.urgencia}" corrigido de ${c.pesoUrgencia} -> ${correctWeight}`)
            updatedCount++
        }
    }

    console.log(`\n🎉 Concluído! ${updatedCount} casos foram corrigidos para a nova regra.`)
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect())