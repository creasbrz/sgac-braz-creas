// backend/prisma/migration-scripts/backfill-paefi-dates.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('A iniciar o script de correção de dados...')

  // 1. Encontra todos os casos que estão em acompanhamento mas não têm a data de início do PAEFI.
  const casesToUpdate = await prisma.case.findMany({
    where: {
      status: 'EM_ACOMPANHAMENTO_PAEFI',
      dataInicioPAEFI: null,
    },
  })

  if (casesToUpdate.length === 0) {
    console.log('Nenhum caso a necessitar de correção. Base de dados já está atualizada.')
    return
  }

  console.log(`Encontrados ${casesToUpdate.length} casos para atualizar.`)

  // 2. Para cada caso, atualiza a `dataInicioPAEFI` usando a data da última atualização (`updatedAt`).
  // Esta é a melhor aproximação que temos para quando o status mudou para "Em Acompanhamento".
  for (const caseItem of casesToUpdate) {
    await prisma.case.update({
      where: { id: caseItem.id },
      data: {
        dataInicioPAEFI: caseItem.updatedAt,
      },
    })
    console.log(`- Caso ${caseItem.nomeCompleto} (ID: ${caseItem.id}) foi atualizado.`)
  }

  console.log('Script de correção concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro durante a execução do script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

