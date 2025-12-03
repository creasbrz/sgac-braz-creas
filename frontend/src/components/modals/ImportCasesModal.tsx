// frontend/src/components/modals/ImportCasesModal.tsx
import { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2, Download } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ImportResponse {
  success: number
  failed: number
  errors: string[]
}

interface ImportCasesModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportCasesModal({ isOpen, onOpenChange }: ImportCasesModalProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResponse | null>(null)

  const { mutate: importCsv, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/import/cases', formData)
      return res.data
    },
    onSuccess: (data: ImportResponse) => {
      setResult(data)
      if (data.success > 0) {
        toast.success(`${data.success} casos importados com sucesso!`)
        queryClient.invalidateQueries({ queryKey: ['cases'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      } else {
        toast.warning("Nenhum caso foi importado. Verifique os erros.")
      }
    },
    onError: () => {
      toast.error("Erro ao processar o ficheiro CSV.")
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setResult(null)
      importCsv(e.target.files[0])
      e.target.value = ''
    }
  }

  const handleDownloadTemplate = () => {
    // Cabeçalho com TODOS os campos
    const headers = "Nome,CPF,Nascimento,Sexo,Telefone,Endereco,Urgencia,Violacao,Categoria,Orgao,NumeroSEI,LinkSEI,Beneficios,Observacoes"
    
    // Linha de Exemplo
    const example = "Maria Silva,12345678900,1990-01-01,Feminino,61999999999,Rua das Flores 10,Risco de morte,Violência física,Mulher,CRAS,00000.123/2024-00,https://sei.df.gov.br,Bolsa Família;BPC,Caso encaminhado pelo Conselho Tutelar"
    
    const csvContent = `${headers}\n${example}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "modelo_completo_sgac.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importação em Massa
          </DialogTitle>
          <DialogDescription>
            Carregue uma planilha CSV para cadastrar vários casos.
            <br/>
            <span className="text-xs text-muted-foreground">
              Dica: Separe múltiplos benefícios com ponto e vírgula (ex: BPC;DF Social).
            </span>
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => !isPending && fileInputRef.current?.click()}
            >
              {isPending ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Processando planilha...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar o CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Máximo 5MB</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={handleFileSelect}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-center">
              <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="text-xs text-muted-foreground">
                <Download className="mr-1 h-3 w-3" />
                Baixar modelo completo (.csv)
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 animate-in fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-md border border-green-100 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 font-bold text-xl">
                  <CheckCircle className="h-5 w-5" /> {result.success}
                </div>
                <p className="text-xs text-green-600">Importados</p>
              </div>
              <div className="bg-red-50 p-3 rounded-md border border-red-100 text-center">
                <div className="flex items-center justify-center gap-2 text-red-700 font-bold text-xl">
                  <X className="h-5 w-5" /> {result.failed}
                </div>
                <p className="text-xs text-red-600">Falhas</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-700 ml-2">Erros Encontrados</AlertTitle>
                <AlertDescription className="text-red-600 mt-2">
                  <ScrollArea className="h-32 w-full rounded border border-red-200 bg-white p-2 text-xs">
                    <ul className="list-disc pl-4 space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <Button className="w-full" onClick={() => { setResult(null); onOpenChange(false); }}>
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}