// frontend/src/constants/caseStatus.ts

// Mapeamento de status para estilos de badge do Tailwind CSS
// Centralizar isto garante consistência em toda a aplicação.
export const statusStyles: { [key: string]: string } = {
  'Aguardando Acolhida': 'bg-cyan-100 text-cyan-800',
  'Em Acolhida': 'bg-yellow-100 text-yellow-800',
  'Aguardando Distribuição PAEFI': 'bg-purple-100 text-purple-800',
  'Em Acompanhamento PAEFI': 'bg-blue-100 text-blue-800',
  Desligado: 'bg-gray-100 text-gray-800',
}
