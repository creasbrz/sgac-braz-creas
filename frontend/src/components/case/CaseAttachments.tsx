// frontend/src/components/case/CaseAttachments.tsx
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FileText, Download, Trash2, Upload, Loader2, Paperclip, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// [CORREÇÃO] Adicionada prop onError na interface
interface CaseAttachmentsProps {
  caseId: string
  onError?: (error: any) => void
}

export function CaseAttachments({ caseId, onError }: CaseAttachmentsProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data: attachments = [], isLoading, isError } = useQuery({
    queryKey: ['attachments', caseId],
    queryFn: async () => {
      try {
        const res = await api.get(`/cases/${caseId}/attachments`)
        return res.data
      } catch (err) {
        // [CORREÇÃO] Chama o callback de erro se existir
        if (onError) onError(err)
        throw err
      }
    },
    retry: 1
  })

  // ... (manter lógica de upload/delete igual, vou resumir para economizar espaço se vc já tem o arquivo) ...
  // SE VOCÊ JÁ TEM O ARQUIVO, APENAS ADICIONE O onError NA INTERFACE E NO CATCH DO USEQUERY ACIMA.
  // Se preferir o arquivo completo, me avise que mando o restante.
  
  // (Para garantir que o build passe, vou assumir que você vai editar o arquivo existente adicionando a prop onError)
  // Se quiser o arquivo COMPLETO deste componente para garantir, me peça.
  // Vou mandar o trecho da mutação abaixo para garantir que não haja erros de importação:

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      await api.post(`/cases/${caseId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Arquivo anexado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['attachments', caseId] })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      toast.error('Erro ao enviar arquivo.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (attachmentId: string) => {
    try {
      await api.delete(`/attachments/${attachmentId}`)
      toast.success('Anexo removido.')
      queryClient.invalidateQueries({ queryKey: ['attachments', caseId] })
    } catch (error) {
      toast.error('Erro ao remover anexo.')
    }
  }

  if (isLoading) return <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>
  
  // Tratamento visual de erro
  if (isError) {
    return (
      <div className="text-center py-8 text-destructive border border-destructive/20 rounded-md bg-destructive/5">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Não foi possível carregar os anexos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Documentos Anexados ({attachments.length})</h3>
        <div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
            Anexar Arquivo
          </Button>
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum arquivo anexado a este prontuário.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {attachments.map((file: any) => (
            <Card key={file.id} className="group overflow-hidden">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-primary/10 p-2 rounded">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium truncate" title={file.nome}>{file.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(file.createdAt), { locale: ptBR, addSuffix: true })} • por {file.autor?.nome}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`http://localhost:3333${file.url}`} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}