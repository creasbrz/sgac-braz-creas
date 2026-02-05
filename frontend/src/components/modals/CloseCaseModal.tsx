// frontend/src/components/modals/CloseCaseModal.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2, AlertTriangle, FileX, MapPin, PenTool, Archive } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { api } from '@/lib/api'
import { getErrorMessage } from '@/utils/error'
import { closeCaseFormSchema } from '@/schemas/caseSchemas'
import { LISTA_MOTIVOS_DESLIGAMENTO, LISTA_DESTINOS } from '@/constants/cases/definitions'
import { ROUTES } from '@/constants/app-routes'
import { formatProcessoSei } from "@/utils/formatters"

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type CloseCaseFormData = z.infer<typeof closeCaseFormSchema>

interface CloseCaseModalProps {
  caseId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  seiRespondido?: boolean
  numeroSei?: string | null
}

export function CloseCaseModal({ 
  caseId, 
  isOpen, 
  onOpenChange,
  seiRespondido = false,
  numeroSei = null
}: CloseCaseModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm<CloseCaseFormData>({
    resolver: zodResolver(closeCaseFormSchema),
    defaultValues: {
      motivoDesligamento: '',
      destinoDesligamento: '',
      parecerFinal: '',
    },
  })

  const { mutate: closeCase, isPending } = useMutation({
    mutationFn: async (data: CloseCaseFormData) => {
      return await api.patch(`/cases/${caseId}/close`, data)
    },
    onSuccess: () => {
      toast.success('Caso desligado e arquivado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      handleClose()
      navigate(ROUTES.CASE_DETAIL(caseId))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao desligar o caso.'))
    },
  })

  const onSubmit = (data: CloseCaseFormData) => closeCase(data)

  const handleClose = () => {
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Archive className="h-5 w-5" />
            Desligamento de Caso
          </DialogTitle>
          <DialogDescription>
            Essa ação encerra o acompanhamento técnico (PAEFI). O prontuário ficará disponível apenas para consulta no Casos Desligados.
          </DialogDescription>
        </DialogHeader>

        {/* ALERTA SEI PENDENTE */}
        {numeroSei && !seiRespondido && (
          <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/50 my-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="ml-2">
              <AlertTitle className="font-bold">Resposta ao SEI Pendente</AlertTitle>
              <AlertDescription className="text-xs mt-1 opacity-90">
                O processo <strong className="font-mono">{formatProcessoSei(numeroSei)}</strong> consta como não respondido. 
                <br/>Lembre-se de enviar o ofício de resposta ao órgão demandante informando o desligamento.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* ALERTA GERAL - CORRIGIDO AQUI */}
        {/* Usamos cores explícitas (red-900 sobre red-50) para garantir leitura */}
        {(!numeroSei || seiRespondido) && (
          <Alert className="my-2 bg-red-50 text-red-900 border-red-200 dark:bg-red-900/10 dark:text-red-200 dark:border-red-900/30">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div className="ml-2">
              <AlertTitle className="font-semibold">Atenção</AlertTitle>
              <AlertDescription className="text-xs opacity-90 font-medium">
                Certifique-se de que todas as evoluções e documentos pendentes foram registrados antes de prosseguir.
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="motivoDesligamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-muted-foreground">
                      <FileX className="h-3.5 w-3.5" />
                      Motivo do Desligamento
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {LISTA_MOTIVOS_DESLIGAMENTO.map((motivo) => (
                          <SelectItem key={motivo} value={motivo} className="text-sm">
                            {motivo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinoDesligamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      Destino / Encaminhamento
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {LISTA_DESTINOS.map((destino) => (
                          <SelectItem key={destino} value={destino}>
                            {destino}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parecerFinal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-muted-foreground">
                    <PenTool className="h-3.5 w-3.5" />
                    Parecer Técnico Final
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      className="resize-none bg-background leading-relaxed"
                      placeholder="Faça uma síntese das intervenções realizadas, resultados alcançados e justificativa técnica para o encerramento..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0 sm:justify-end">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                variant="destructive" 
                disabled={isPending}
                className="bg-destructive hover:bg-destructive/90 min-w-45"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" /> Confirmar Desligamento
                  </>
                )} 
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}