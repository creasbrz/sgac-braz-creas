import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { 
  FileText, Trash2, Download, Loader2, UploadCloud, 
  Paperclip, MoreVertical, Eye, File as FileIcon, Image as ImageIcon
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

// --- HELPER: Ícone/Preview do Arquivo ---
const getIconByMime = (type: string) => {
  if (type === 'image') return <ImageIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
  if (type === 'pdf') return <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
  if (type === 'doc' || type === 'docx') return <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
  return <FileIcon className="h-6 w-6 text-muted-foreground" />
}

const FilePreview = ({ type, url }: { type: string, url: string }) => {
  if (type === 'image') {
    return (
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/50 relative group">
        <img 
          src={url} 
          alt="Preview" 
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
          loading="lazy"
        />
      </div>
    )
  }
  
  return (
    <div className={cn(
      "h-12 w-12 rounded-lg flex items-center justify-center shrink-0 border",
      type === 'pdf' ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50" : "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50"
    )}>
      {getIconByMime(type)}
    </div>
  )
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Dropzone de Upload Moderno */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer relative overflow-hidden group",
          isDragOver 
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg" 
            : "border-border/60 hover:border-primary/50 hover:bg-muted/30 bg-card/50",
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
        
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className={cn(
            "p-4 rounded-full shadow-sm border transition-all duration-300",
            isDragOver ? "bg-primary/10 text-primary border-primary/20" : "bg-background text-muted-foreground group-hover:text-primary group-hover:scale-110"
          )}>
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            ) : (
              <UploadCloud className="h-8 w-8"/>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {isUploading ? "Enviando arquivo..." : "Clique para upload ou arraste e solte"}
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, Imagens ou Documentos (Max. 10MB)
            </p>
          </div>
        </div>

        {/* Background Pattern Opcional (apenas decorativo) */}
        {!isUploading && (
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-size-[16px_16px]"></div>
        )}
      </div>

      {/* 2. Lista de Arquivos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <div className="p-1.5 bg-muted rounded-md">
             <Paperclip className="h-4 w-4 text-primary" /> 
          </div>
          <h3 className="text-sm font-semibold text-foreground">Documentos Anexados</h3>
          <span className="ml-auto text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
            {attachments.length} arquivos
          </span>
        </div>

        <div className="min-h-50">
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
               {[1,2,3].map(i => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/5 border border-dashed border-border/60 rounded-xl gap-3">
              <div className="p-3 bg-muted/50 rounded-full">
                 <FileIcon className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium">Nenhum documento arquivado ainda.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {attachments.map((file) => (
                <Card key={file.id} className="group overflow-hidden hover:shadow-md transition-all border-border hover:border-primary/40 bg-card">
                  <CardContent className="p-3 flex items-start gap-3 relative">
                    
                    {/* Componente de Preview */}
                    <FilePreview type={file.tipo} url={file.url} />

                    {/* Informações */}
                    <div className="flex-1 min-w-0 pr-6 space-y-1">
                      <p className="font-semibold text-sm truncate text-foreground leading-tight" title={file.nome}>
                        {file.nome}
                      </p>
                      
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono bg-muted/50 px-1 rounded">{formatSize(file.tamanho)}</span>
                        <span>•</span>
                        <span>{format(new Date(file.createdAt), "dd/MM/yy", { locale: ptBR })}</span>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground/70 truncate pt-0.5">
                        Por: <span className="font-medium text-foreground/80">{file.autor?.nome.split(' ')[0]}</span>
                      </p>
                    </div>

                    {/* Menu de Ações */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border border-border/50 hover:bg-accent text-muted-foreground">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center gap-2">
                              <Eye className="h-4 w-4 text-blue-500" /> Visualizar
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={file.url} download className="cursor-pointer flex items-center gap-2">
                              <Download className="h-4 w-4 text-emerald-500" /> Baixar
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
                            onClick={() => setDeleteId(file.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir
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
      </div>

      {/* 4. Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
               <Trash2 className="h-5 w-5"/> Excluir anexo permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido do servidor e do histórico do caso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteFile(deleteId)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}