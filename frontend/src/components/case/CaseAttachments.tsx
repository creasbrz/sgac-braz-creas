import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  FileText, 
  Trash2, 
  Download, 
  Loader2, 
  UploadCloud, 
  FileImage,
  Paperclip
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getErrorMessage } from '@/utils/error'

// Interface do Anexo
interface Attachment {
  id: string
  nome: string
  tipo: 'pdf' | 'image'
  url: string
  tamanho: number
  createdAt: string
  autor: {
    nome: string
  }
}

// [CORREÇÃO] Interface para as props do componente
interface CaseAttachmentsProps {
  caseId: string
  onError?: (error: unknown) => void
}

export function CaseAttachments({ caseId, onError }: CaseAttachmentsProps) {
  // [CORREÇÃO] Removemos useParams, pois o ID vem via prop agora
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 1. Busca Lista de Anexos
  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ['case-attachments', caseId],
    queryFn: async () => {
      const response = await api.get(`/cases/${caseId}/attachments`)
      return response.data
    },
    enabled: !!caseId
  })

  // 2. Upload de Arquivo
  const { mutate: uploadFile, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      await api.post(`/attachments?casoId=${caseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      toast.success('Arquivo enviado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['case-attachments', caseId] })
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (error) => {
      const msg = getErrorMessage(error, 'Erro ao enviar arquivo.')
      toast.error(msg)
      if (onError) onError(error)
    }
  })

  // 3. Excluir Arquivo
  const { mutate: deleteFile, isPending: isDeleting } = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/attachments/${attachmentId}`)
    },
    onSuccess: () => {
      toast.success('Anexo removido.')
      queryClient.invalidateQueries({ queryKey: ['case-attachments', caseId] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao excluir anexo.'))
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('Arquivo muito grande. Máximo 5MB.')
        return
      }
      uploadFile(file)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" /> Documentos e Anexos
            </CardTitle>
            <CardDescription>
              Relatórios, ofícios digitalizados e documentos pessoais.
            </CardDescription>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileChange}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {isUploading ? 'Enviando...' : 'Novo Anexo'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Nenhum arquivo anexado a este caso.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attachments.map((file) => (
              <div 
                key={file.id} 
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group relative"
              >
                <div className="p-2 bg-primary/10 rounded-md">
                  {file.tipo === 'pdf' ? (
                    <FileText className="h-6 w-6 text-primary" />
                  ) : (
                    <FileImage className="h-6 w-6 text-blue-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={file.nome}>
                    {file.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.tamanho)} • {format(new Date(file.createdAt), "dd/MM/yy", { locale: ptBR })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Por: {file.autor.nome}
                  </p>
                </div>

                <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    asChild
                  >
                    <a href={file.url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if(confirm('Tem certeza que deseja excluir este anexo?')) deleteFile(file.id)
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}