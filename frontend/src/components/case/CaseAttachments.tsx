// frontend/src/components/case/CaseAttachments.tsx
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { FileText, Image as ImageIcon, Trash2, Upload, Loader2, Download, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatDateSafe } from '@/utils/formatters'
import { useAuth } from '@/hooks/useAuth'

interface Attachment {
  id: string
  nome: string
  tipo: string
  url: string
  createdAt: string
  autor: { nome: string }
}

export function CaseAttachments({ caseId }: { caseId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 1. Buscar Anexos
  const { data: attachments, isLoading } = useQuery<Attachment[]>({
    queryKey: ['attachments', caseId],
    queryFn: async () => {
      try {
        const res = await api.get(`/cases/${caseId}/attachments`)
        return res.data
      } catch (error) {
        return []
      }
    },
    retry: 1
  })

  // 2. Upload de Arquivo
  const { mutate: uploadFile } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      
      // [CORREÇÃO CRÍTICA] Removemos o header 'Content-Type'.
      // O Axios/Navegador definirá automaticamente o boundary correto.
      await api.post(`/cases/${caseId}/attachments`, formData)
    },
    onMutate: () => setIsUploading(true),
    onSuccess: () => {
      toast.success('Ficheiro anexado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['attachments', caseId] })
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (error: any) => {
      console.error("Erro upload:", error)
      const msg = error.response?.data?.message || 'Erro ao enviar ficheiro.'
      toast.error(msg)
    },
    onSettled: () => setIsUploading(false)
  })

  // 3. Excluir Arquivo
  const { mutate: deleteFile } = useMutation({
    mutationFn: async (fileId: string) => {
      await api.delete(`/attachments/${fileId}`)
    },
    onSuccess: () => {
      toast.success('Anexo removido.')
      queryClient.invalidateQueries({ queryKey: ['attachments', caseId] })
    },
    onError: () => toast.error('Erro ao remover ficheiro.')
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validação de Tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('O ficheiro deve ter no máximo 5MB.')
        return
      }
      
      uploadFile(file)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-primary" />
          Documentos e Anexos
        </CardTitle>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Upload className="h-4 w-4 mr-2"/>}
            Anexar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground"/></div>
        ) : !attachments || attachments.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-md bg-muted/10">
            Nenhum documento anexado.
          </div>
        ) : (
          <ul className="space-y-2">
            {attachments.map(file => (
              <li key={file.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-background rounded border shrink-0">
                    {file.tipo.includes('pdf') ? <FileText className="h-5 w-5 text-red-500"/> : <ImageIcon className="h-5 w-5 text-blue-500"/>}
                  </div>
                  <div className="min-w-0">
                    <a 
                      href={`${api.defaults.baseURL}${file.url}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm font-medium hover:underline truncate block text-foreground"
                    >
                      {file.nome}
                    </a>
                    <p className="text-xs text-muted-foreground truncate">
                      Enviado por {file.autor.nome} em {formatDateSafe(file.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <a 
                    href={`${api.defaults.baseURL}${file.url}`} 
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-background rounded-full text-muted-foreground transition-colors"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  
                  {(user?.cargo === 'Gerente' || user?.nome === file.autor.nome) && (
                    <button 
                      onClick={() => deleteFile(file.id)}
                      className="p-2 hover:bg-red-100 hover:text-red-600 rounded-full text-muted-foreground transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}