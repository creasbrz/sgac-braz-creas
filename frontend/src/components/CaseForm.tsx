// frontend/src/components/CaseForm.tsx
import { useForm, type SubmitHandler, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { IMaskInput } from 'react-imask'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/utils/error'
import { createCaseFormSchema } from '@/schemas/caseSchemas'

type CreateCaseFormData = z.infer<typeof createCaseFormSchema>

interface Agent {
  id: string
  nome: string
}

const defaultFormValues: CreateCaseFormData = {
  nomeCompleto: '',
  cpf: '',
  nascimento: '',
  sexo: '',
  telefone: '',
  endereco: '',
  dataEntrada: new Date().toISOString().split('T')[0],
  urgencia: '',
  violacao: '',
  categoria: '',
  orgaoDemandante: '',
  agenteAcolhidaId: '',
  linkSei: '',
  observacoes: '',
  numeroSei: '',
}

interface CaseFormProps {
  onCaseCreated?: () => void
}

export function CaseForm({ onCaseCreated }: CaseFormProps) {
  const queryClient = useQueryClient()

  const { data: agents, isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await api.get('/users/agents')
      return response.data
    },
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseFormSchema),
    defaultValues: defaultFormValues,
  })

  const { mutateAsync: createCase, isPending } = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const dataToSend = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ''),
        telefone: data.telefone.replace(/\D/g, ''),
        nascimento: new Date(data.nascimento).toISOString(),
        dataEntrada: new Date(data.dataEntrada).toISOString(),
      }
      return await api.post('/cases', dataToSend)
    },
    onSuccess: () => {
      toast.success('Caso cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      reset({
        ...defaultFormValues,
        dataEntrada: new Date().toISOString().split('T')[0],
      })
      onCaseCreated?.()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Falha ao cadastrar o caso.'))
    },
  })

  const onSubmit: SubmitHandler<CreateCaseFormData> = async (data) => {
    await createCase(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset
        disabled={isPending}
        className={clsx('space-y-6', isPending && 'opacity-50')}
      >
        <div className="space-y-2">
          <Label className="font-semibold">Identificação Pessoal</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="nomeCompleto">Nome Completo</Label>
              <Controller
                name="nomeCompleto"
                control={control}
                render={({ field }) => <Input id="nomeCompleto" {...field} />}
              />
              {errors.nomeCompleto && (
                <p className="text-sm text-destructive">
                  {errors.nomeCompleto.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Controller
                name="cpf"
                control={control}
                render={({ field }) => (
                  <IMaskInput
                    mask="000.000.000-00"
                    id="cpf"
                    value={field.value || ''}
                    onAccept={field.onChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                )}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nascimento">Data de Nascimento</Label>
              <Controller
                name="nascimento"
                control={control}
                render={({ field }) => (
                  <Input type="date" id="nascimento" {...field} />
                )}
              />
              {errors.nascimento && (
                <p className="text-sm text-destructive">
                  {errors.nascimento.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sexo">Sexo</Label>
              <Controller
                name="sexo"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.sexo && (
                <p className="text-sm text-destructive">{errors.sexo.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Controller
                name="telefone"
                control={control}
                render={({ field }) => (
                  <IMaskInput
                    mask="(00) 00000-0000"
                    id="telefone"
                    value={field.value || ''}
                    onAccept={field.onChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                )}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">
                  {errors.telefone.message}
                </p>
              )}
            </div>
            <div className="lg:col-span-3 space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Controller
                name="endereco"
                control={control}
                render={({ field }) => <Input id="endereco" {...field} />}
              />
              {errors.endereco && (
                <p className="text-sm text-destructive">
                  {errors.endereco.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Detalhes do Caso</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="dataEntrada">Data da Entrada</Label>
              <Controller
                name="dataEntrada"
                control={control}
                render={({ field }) => (
                  <Input type="date" id="dataEntrada" {...field} readOnly />
                )}
              />
            </div>
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="urgencia">Nível de Urgência</Label>
              <Controller
                name="urgencia"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Convive com agressor">Convive com agressor</SelectItem>
                      <SelectItem value="Idoso 80+">Idoso 80+</SelectItem>
                      <SelectItem value="Primeira infância">Primeira infância</SelectItem>
                      <SelectItem value="Risco de morte">Risco de morte</SelectItem>
                      <SelectItem value="Risco de reincidência">Risco de reincidência</SelectItem>
                      <SelectItem value="Sofre ameaça">Sofre ameaça</SelectItem>
                      <SelectItem value="Risco de desabrigo">Risco de desabrigo</SelectItem>
                      <SelectItem value="Criança/Adolescente">Criança/Adolescente</SelectItem>
                      <SelectItem value="PCD">PCD</SelectItem>
                      <SelectItem value="Idoso">Idoso</SelectItem>
                      <SelectItem value="Internação">Internação</SelectItem>
                      <SelectItem value="Acolhimento">Acolhimento</SelectItem>
                      <SelectItem value="Gestante/Lactante">Gestante/Lactante</SelectItem>
                      <SelectItem value="Sem risco imediato">Sem risco imediato</SelectItem>
                      <SelectItem value="Visita periódica">Visita periódica</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.urgencia && <p className="text-sm text-destructive">{errors.urgencia.message}</p>}
            </div>
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="violacao">Violação de Direito</Label>
              <Controller
                name="violacao"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Abandono">Abandono</SelectItem>
                      <SelectItem value="Negligência">Negligência</SelectItem>
                      <SelectItem value="Afastamento do convívio familiar">Afastamento do convívio familiar</SelectItem>
                      <SelectItem value="Cumprimento de medidas socioeducativas">Cumprimento de medidas socioeducativas</SelectItem>
                      <SelectItem value="Descumprimento de condicionalidade do PBF">Descumprimento de condicionalidade do PBF</SelectItem>
                      <SelectItem value="Discriminação">Discriminação</SelectItem>
                      <SelectItem value="Situação de rua">Situação de rua</SelectItem>
                      <SelectItem value="Trabalho infantil">Trabalho infantil</SelectItem>
                      <SelectItem value="Violência física e/ou psicológica">Violência física e/ou psicológica</SelectItem>
                      <SelectItem value="Violência sexual">Violência sexual</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.violacao && <p className="text-sm text-destructive">{errors.violacao.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria do Público</Label>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mulher">Mulher</SelectItem>
                      <SelectItem value="POP RUA">POP RUA</SelectItem>
                      <SelectItem value="LGBTQIA+">LGBTQIA+</SelectItem>
                      <SelectItem value="Migrante">Migrante</SelectItem>
                      <SelectItem value="Idoso">Idoso</SelectItem>
                      <SelectItem value="Criança/adolescente">Criança/adolescente</SelectItem>
                      <SelectItem value="PCD">PCD</SelectItem>
                      <SelectItem value="Álcool/drogas">Álcool/drogas</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoria && <p className="text-sm text-destructive">{errors.categoria.message}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">Atribuição e Origem</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="orgaoDemandante">Órgão Demandante</Label>
              <Controller
                name="orgaoDemandante"
                control={control}
                render={({ field }) => <Input id="orgaoDemandante" {...field} />}
              />
              {errors.orgaoDemandante && <p className="text-sm text-destructive">{errors.orgaoDemandante.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroSei">Número do SEI (Opcional)</Label>
              <Controller
                name="numeroSei"
                control={control}
                render={({ field }) => <Input id="numeroSei" {...field} />}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkSei">Link do SEI (Opcional)</Label>
              <Controller
                name="linkSei"
                control={control}
                render={({ field }) => <Input type="url" id="linkSei" {...field} />}
              />
              {errors.linkSei && <p className="text-sm text-destructive">{errors.linkSei.message}</p>}
            </div>
            <div className="lg:col-span-3 space-y-2">
              <Label htmlFor="agenteAcolhidaId">Agente Social Responsável</Label>
              <Controller
                name="agenteAcolhidaId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAgents}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAgents ? "A carregar..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {agents?.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>{agent.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.agenteAcolhidaId && <p className="text-sm text-destructive">{errors.agenteAcolhidaId.message}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações (Opcional)</Label>
          <Controller
            name="observacoes"
            control={control}
            render={({ field }) => <Textarea id="observacoes" {...field} />}
          />
        </div>
      </fieldset>

      <div className="flex justify-end pt-6">
        <Button type="submit" disabled={isPending} className="w-40">
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            'Cadastrar Caso'
          )}
        </Button>
      </div>
    </form>
  )
}

