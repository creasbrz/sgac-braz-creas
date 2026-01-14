// frontend/src/components/case/tabs/AttachmentsTab.tsx
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  FileText, Trash2, Download, Loader2, UploadCloud, 
  Paperclip, MoreVertical, Eye, File
} from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getErrorMessage } from '@/utils/error'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

interface Attachment {
  id: string
  nome: string
  tipo: 'pdf' | 'image' | 'other'
  url: string
  tamanho: number
  createdAt: string
  autor: { nome: string }
}

interface AttachmentsTabProps {
  caseId: string
  onError?: (error: unknown) => void
}

export function AttachmentsTab({ caseId, onError }: AttachmentsTabProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados para UX
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ['case-attachments', caseId],
    queryFn: async () => (await api.get(`/cases/${caseId}/attachments`)).data,
    enabled: !!caseId
  })

  const { mutate: uploadFile, isPending: isUploading } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/attachments?caseId=${caseId}`, formData, {
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

  const { mutate: deleteFile, isPending: isDeleting } = useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/attachments/${attachmentId}`)
    },
    onSuccess: () => {
      toast.success('Anexo removido.')
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['case-attachments', caseId] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao excluir anexo.'))
    }
  })

  // Handlers de Upload
  const validateAndUpload = (file: File) => {
    // Limite de 10MB
    if (file.size > 10 * 1024 * 1024) { 
      toast.error('Arquivo muito grande. Máximo 10MB.')
      return
    }
    uploadFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndUpload(file)
  }

  // Utilitários Visuais
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string, url: string) => {
    if (type === 'image') {
      return <img src={url} alt="Preview" className="h-full w-full object-cover opacity-90 transition-opacity hover:opacity-100" />
    }
    if (type === 'pdf') return <FileText className="h-6 w-6 text-red-500" />
    return <File className="h-6 w-6 text-blue-500" />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Dropzone de Upload */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative overflow-hidden",
          isDragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
          isUploading && "opacity-60 pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,image/*,.doc,.docx"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-background rounded-full shadow-sm border">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary"/>
            ) : (
              <UploadCloud className="h-6 w-6 text-muted-foreground"/>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isUploading ? "Enviando arquivo..." : "Clique para upload ou arraste e solte"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Imagens ou Documentos (Max. 10MB)
            </p>
          </div>
        </div>
      </div>

      {/* 2. Cabeçalho da Lista */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <Paperclip className="h-4 w-4 text-primary" /> 
        <h3 className="text-sm font-semibold">Arquivos Anexados ({attachments.length})</h3>
      </div>

      {/* 3. Grid de Arquivos */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
             {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm italic bg-muted/5 rounded-lg">
            Nenhum documento arquivado ainda.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {attachments.map((file) => (
              <Card key={file.id} className="group overflow-hidden hover:shadow-md transition-all border-muted hover:border-primary/30">
                <CardContent className="p-3 flex items-start gap-3 relative">
                  
                  {/* Thumbnail / Ícone */}
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                    {getFileIcon(file.tipo, file.url)}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="font-medium text-sm truncate text-foreground" title={file.nome}>
                      {file.nome}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                      <span className="font-mono">{formatSize(file.tamanho)}</span>
                      <span>•</span>
                      <span>{format(new Date(file.createdAt), "dd/MM/yy", { locale: ptBR })}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                      Por: {file.autor?.nome.split(' ')[0]}
                    </p>
                  </div>

                  {/* Menu de Ações (Dropdown) */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center">
                            <Eye className="mr-2 h-4 w-4 text-blue-500" /> Visualizar
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={file.url} download className="cursor-pointer flex items-center">
                            <Download className="mr-2 h-4 w-4 text-emerald-500" /> Baixar
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive cursor-pointer flex items-center"
                          onClick={() => setDeleteId(file.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 4. Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido do servidor e do histórico do caso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteFile(deleteId)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}