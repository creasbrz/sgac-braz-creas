// frontend/src/components/modals/ImportCasesModal.tsx
import { useState, useRef, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle, 
  X, Loader2, Download, FileUp 
} from "lucide-react"

import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Interface alinhada com o retorno do backend
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
      
      const res = await api.post('/import/cases', formData)
      return res.data
    },
    onSuccess: (data: ImportResponse) => {
      setResult(data)
      if (data.created > 0) {
        toast.success(`Importação finalizada!`, {
            description: `${data.created} novos casos criados com sucesso.`
        })
        queryClient.invalidateQueries({ queryKey: ['cases'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      } else {
        toast.warning("Nenhum caso foi criado. Verifique os erros.")
      }
    },
    onError: () => {
      toast.error("Erro ao enviar o arquivo. Verifique se é uma planilha válida.")
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
    
    // Validação de extensão também, pois mimetype pode falhar em alguns SOs
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

  // [CORREÇÃO] Download do Template via API (Excel Real)
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true)
      const response = await api.get('/cases/import/template', {
        responseType: 'blob', // Importante para arquivos binários
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Modelo_Importacao_Casos.xlsx`) // Nome fixo para facilitar
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
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Importação em Massa
          </DialogTitle>
          <DialogDescription>
            Use o modelo padronizado (Excel) para garantir que todos os campos (incluindo Ocupação e Renda) sejam importados corretamente.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6 py-2">
            {/* Área de Upload */}
            <div 
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer gap-3 group",
                isDragOver 
                  ? "border-primary bg-primary/5 scale-[1.01]" 
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
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
                    "p-4 rounded-full bg-muted transition-colors group-hover:bg-primary/10",
                    isDragOver && "bg-primary/20"
                  )}>
                    {isDragOver ? <FileUp className="h-8 w-8 text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary" />}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {isDragOver ? "Solte a planilha aqui" : "Clique ou arraste o arquivo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Suporta .XLSX, .XLS e .CSV (Max 5MB)
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

            {/* Dicas e Download */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/50">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p><strong>Dicas de preenchimento:</strong></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Use o <strong>modelo oficial</strong> abaixo para evitar erros.</li>
                    <li>Separe múltiplas <strong>violações</strong> com ponto e vírgula (<code>;</code>).</li>
                    <li>O <strong>CPF</strong> deve conter 11 dígitos.</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadTemplate} 
                disabled={isDownloading}
                className="w-full text-xs h-9 border-dashed bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {isDownloading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
                Baixar Modelo Oficial (.xlsx)
              </Button>
            </div>
          </div>
        ) : (
          /* TELA DE RESULTADO */
          <div className="space-y-5 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-2xl">
                  <CheckCircle className="h-6 w-6" /> {result.created}
                </div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 uppercase tracking-wide mt-1">Sucessos</p>
              </div>
              
              <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg border border-rose-100 dark:border-rose-800 text-center">
                <div className="flex items-center justify-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-2xl">
                  <X className="h-6 w-6" /> {result.errors}
                </div>
                <p className="text-xs font-medium text-rose-600 dark:text-rose-500 uppercase tracking-wide mt-1">Falhas</p>
              </div>
            </div>

            {/* Lista de Logs */}
            {result.logs.length > 0 && (
              <Alert variant={result.errors > 0 ? "destructive" : "default"} className={cn(
                result.errors > 0 
                  ? "border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800"
                  : "border-blue-200 bg-blue-50 dark:bg-blue-900/10"
              )}>
                <AlertTitle className="flex items-center gap-2">
                   {result.errors > 0 ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle className="h-4 w-4"/>}
                   Log de Processamento
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <ScrollArea className="h-32 w-full rounded border bg-background/50 p-2 text-xs font-mono">
                    <ul className="space-y-1">
                      {result.logs.map((log, i) => (
                        <li key={i} className="border-b border-border/50 last:border-0 pb-1 last:pb-0">
                          {log}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <Button className="w-full" onClick={handleClose}>
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}