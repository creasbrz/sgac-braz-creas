// frontend/src/components/modals/ImportCasesModal.tsx
import { useState, useRef, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle, 
  XCircle, Loader2, Download, FileUp 
} from "lucide-react"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ImportResponse {
  processed: number
  created: number
  errors: number 
  logs: string[] 
}

interface ImportCasesModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportCasesModal({ isOpen, onOpenChange }: ImportCasesModalProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // --- MUTATION IMPORTAÇÃO ---
  const { mutate: importFile, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await api.post('/import/cases', formData, {
        headers: {
          'Content-Type': undefined // Força o browser a gerar o boundary
        }
      })
      return res.data
    },
    onSuccess: (data: ImportResponse) => {
      setResult(data)
      if (data.created > 0) {
        toast.success(`Importação finalizada!`, {
            description: `${data.created} novos casos criados.`
        })
        queryClient.invalidateQueries({ queryKey: ['cases'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      } else {
        toast.warning("Nenhum caso criado. Verifique os logs.")
      }
    },
    onError: (error: any) => {
      console.error(error)
      const msg = error.response?.data?.logs?.[0] || "Erro ao enviar o arquivo."
      toast.error(msg)
    }
  })

  // --- HANDLERS ---
  const handleClose = () => {
    setResult(null)
    setIsDragOver(false)
    onOpenChange(false)
  }

  const processFile = (file: File) => {
    const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        "application/vnd.ms-excel", 
        "text/csv", 
        "application/csv"
    ]
    
    const isValidType = validTypes.includes(file.type) || 
                        file.name.endsWith('.xlsx') || 
                        file.name.endsWith('.xls') || 
                        file.name.endsWith('.csv')

    if (!isValidType) {
      toast.error("Formato inválido. Envie arquivos Excel (.xlsx) ou CSV.")
      return
    }

    setResult(null)
    importFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0])
      e.target.value = '' 
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
  }, [])

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true)
      const response = await api.get('/cases/import/template', {
        responseType: 'blob', 
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Modelo_Importacao_Casos.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success("Modelo baixado com sucesso!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao baixar o modelo.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
               <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            Importação em Massa
          </DialogTitle>
          <DialogDescription>
            Envie sua planilha para criar múltiplos casos de uma vez.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6 py-2">
            
            {/* Upload Area */}
            <div 
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer gap-4 group",
                isDragOver 
                  ? "border-primary bg-primary/5 scale-[1.01] shadow-inner" 
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
                isPending && "pointer-events-none opacity-60"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isPending ? (
                <div className="flex flex-col items-center animate-pulse py-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm font-medium">Processando planilha...</p>
                  <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
                </div>
              ) : (
                <>
                  <div className={cn(
                    "p-4 rounded-full bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary",
                    isDragOver && "bg-primary/20 text-primary"
                  )}>
                    {isDragOver ? <FileUp className="h-8 w-8" /> : <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary" />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isDragOver ? "Solte a planilha aqui" : "Clique ou arraste o arquivo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suporta .XLSX e .CSV (Max 10MB)
                    </p>
                  </div>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                onChange={handleFileSelect}
                disabled={isPending}
              />
            </div>

            {/* Template Download Section */}
            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-4 space-y-3 border border-amber-100 dark:border-amber-800/50">
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Requisitos Importantes:</p>
                  <ul className="list-disc pl-4 space-y-1 text-amber-700/80 dark:text-amber-300/80">
                    <li>Utilize o <strong>modelo oficial</strong> para garantir a formatação.</li>
                    <li>O <strong>CPF</strong> é obrigatório para a criação do caso.</li>
                    <li>Para menores de idade, preencha o Responsável Legal.</li>
                  </ul>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate} 
                disabled={isDownloading}
                className="w-full h-9 border-dashed border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-900 dark:hover:text-amber-100"
              >
                {isDownloading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
                Baixar Modelo Oficial (.xlsx)
              </Button>
            </div>
          </div>
        ) : (
          /* Result Screen */
          <div className="space-y-5 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-3xl mb-1">
                  <CheckCircle className="h-6 w-6" /> {result.created}
                </div>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Sucessos</p>
              </div>
              
              <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800 text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-3xl mb-1">
                  <XCircle className="h-6 w-6" /> {result.errors}
                </div>
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider">Falhas</p>
              </div>
            </div>

            {/* Logs List */}
            {result.logs.length > 0 && (
              <Alert variant={result.errors > 0 ? "destructive" : "default"} className={cn(
                "shadow-sm",
                result.errors > 0 
                  ? "border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800"
                  : "border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800"
              )}>
                <AlertTitle className="flex items-center gap-2 font-semibold">
                   {result.errors > 0 ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle className="h-4 w-4"/>}
                   Log de Processamento
                </AlertTitle>
                <AlertDescription className="mt-3">
                  <ScrollArea className="h-40 w-full rounded-md border border-black/5 dark:border-white/10 bg-background/50 p-3">
                    <ul className="space-y-1.5 text-xs font-mono">
                      {result.logs.map((log, i) => (
                        <li key={i} className="border-b border-border/40 last:border-0 pb-1.5 last:pb-0 wrap-break-word leading-relaxed">
                          {log}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <Button className="w-full font-semibold" onClick={handleClose}>
              Concluir Importação
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}