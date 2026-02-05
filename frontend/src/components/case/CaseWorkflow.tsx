// frontend/src/components/case/CaseWorkflow.tsx
import { clsx } from "clsx"
import { CheckCircle2, Circle } from "lucide-react"
// [1] Importamos as constantes de definição
import { CASE_STATUS } from "@/constants/cases/definitions"

interface CaseWorkflowProps {
  status: string
}

export function CaseWorkflow({ status }: CaseWorkflowProps) {
  // [2] Usamos as constantes para garantir que os IDs sejam idênticos ao resto do sistema
  const steps = [
    { id: CASE_STATUS.AGUARDANDO_ACOLHIDA, label: 'Triagem' },
    { id: CASE_STATUS.EM_ACOLHIDA, label: 'Acolhida' },
    { id: CASE_STATUS.AGUARDANDO_DISTRIBUICAO, label: 'Distribuição' },
    { id: CASE_STATUS.EM_ACOLHIDA_ESPECIALIZADA, label: 'Acolhida Esp.' },
    { id: CASE_STATUS.EM_ACOMPANHAMENTO, label: 'Acompanhamento' },
    { id: CASE_STATUS.EM_MONITORAMENTO, label: 'Monitoramento' },
    { id: CASE_STATUS.DESLIGADO, label: 'Finalizado' }
  ]

  // A lógica permanece a mesma, mas agora é type-safe
  const currentIndex = steps.findIndex(s => s.id === status)
  
  // Se o status não for encontrado (ex: status novo não mapeado), assume o início ou trata erro
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className="w-full py-8 bg-background/80 border-b backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative">
          
          {/* --- LINHAS DE PROGRESSO (TRACKS) --- */}
          <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-10 rounded-full" />
          
          <div 
            className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-1000 ease-in-out -z-10 rounded-full" 
            style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
          />

          {/* --- PASSOS --- */}
          <nav className="flex justify-between items-start">
            {steps.map((step, index) => {
              const isCompleted = index < activeIndex
              const isCurrent = index === activeIndex
              const isPending = index > activeIndex

              return (
                <div key={step.id} className="flex flex-col items-center flex-1 group">
                  
                  {/* Ícone / Círculo */}
                  <div 
                    className={clsx(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-500 bg-background shrink-0 z-10",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      isCurrent && "border-primary ring-4 ring-primary/20 scale-110 shadow-sm",
                      isPending && "border-muted-foreground/30 text-muted-foreground/40"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCurrent ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <Circle className="w-4 h-4 fill-current opacity-20" />
                    )}
                  </div>
                  
                  {/* Label (Texto) */}
                  <div className="mt-3 px-1 text-center min-h-5">
                    <span className={clsx(
                      "text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter sm:tracking-wider leading-tight block transition-all duration-300",
                      isCurrent ? "text-primary scale-105" : "text-muted-foreground/60",
                      !isCurrent && "hidden md:block" 
                    )}>
                      {step.label}
                    </span>
                    
                    {/* Indicador Mobile 'Atual' */}
                    {isCurrent && (
                       <span className="text-[8px] font-medium text-primary/60 md:hidden uppercase tracking-widest mt-0.5 block animate-in fade-in slide-in-from-top-1">
                         Fase Atual
                       </span>
                    )}
                  </div>
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}