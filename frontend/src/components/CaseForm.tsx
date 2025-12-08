// frontend/src/components/CaseForm.tsx
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IMaskInput } from 'react-imask'
import { Loader2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form'

import { getErrorMessage } from '@/utils/error'
import { createCaseFormSchema, type CreateCaseFormData } from '@/schemas/caseSchemas'
import { useAgents } from '@/hooks/api/useCaseQueries'

// ------------------------------------------------------------
// 🔧 CONSTANTES DE LISTAS
// ------------------------------------------------------------

const LISTS = {
  sexo: [
    'Masculino',
    'Feminino',
    'Outro',
    'Não Informado'
  ],

  urgencia: [
    'Convive com agressor',
    'Idoso 80+',
    'Primeira infância',
    'Risco de morte',
    'Risco de reincidência',
    'Sofre ameaça',
    'Risco de desabrigo',
    'Criança/Adolescente',
    'PCD',
    'Idoso',
    'Internação',
    'Acolhimento',
    'Gestante/Lactante',
    'Sem risco imediato',
    'Visita periódica'
  ],

  violacao: [
    'Abandono',
    'Negligência',
    'Afastamento do convívio familiar',
    'Cumprimento de medidas socioeducativas',
    'Descumprimento de condicionalidade do PBF',
    'Discriminação',
    'Situação de rua',
    'Trabalho infantil',
    'Violência física e/ou psicológica',
    'Violência sexual',
    'Outros'
  ],

  categoria: [
    'Mulher',
    'POP RUA',
    'LGBTQIA+',
    'Migrante',
    'Idoso',
    'Criança/adolescente',
    'PCD',
    'Álcool/drogas',
    'Família em vulnerabilidade'
  ],

  // [NOVO] Lista de Origem da Demanda
  origem: [
    { id: 'ESPONTANEA', label: 'Demanda Espontânea (Balcão)' },
    { id: 'DOCUMENTAL', label: 'Demanda Documental (SEI/Ofício)' },
    { id: 'REFERENCIADA', label: 'Encaminhamento de Rede' },
    { id: 'BUSCA_ATIVA', label: 'Busca Ativa' }
  ]
}

// Máscaras
const CPF_MASK = { mask: '000.000.000-00' }
const PHONE_MASK = { mask: '(00) 00000-0000' }
const SEI_MASK = { mask: '00000-00000000/0000-00' }

const getLocalDateOnly = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0]

const defaultValues: Partial<CreateCaseFormData> = {
  nomeCompleto: '',
  cpf: '',
  nascimento: '',
  sexo: '',
  telefone: '',
  endereco: '',
  urgencia: '',
  violacao: '',
  categoria: '',
  orgaoDemandante: '',
  agenteAcolhidaId: '',
  linkSei: '',
  observacoes: '',
  numeroSei: '',
  origem: 'ESPONTANEA', // Default
  dataEntrada: '', 
}

interface CaseFormProps {
  onCaseCreated?: () => void
  initialData?: any // Dados para edição (opcional)
  caseId?: string   // ID se for edição (opcional)
}

export function CaseForm({ onCaseCreated, initialData, caseId }: CaseFormProps) {
  const queryClient = useQueryClient()
  const { data: agents, isLoading: isLoadingAgents, isError: isErrorAgents } = useAgents()
  
  const isEditing = !!caseId

  const form = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseFormSchema),
    defaultValues: initialData 
      ? { 
          ...initialData, 
          dataEntrada: initialData.dataEntrada?.split('T')[0],
          nascimento: initialData.nascimento?.split('T')[0],
          numeroSei: initialData.numeroSei ?? '',
          linkSei: initialData.linkSei ?? '',
          observacoes: initialData.observacoes ?? '',
          origem: initialData.origem ?? 'ESPONTANEA'
        } 
      : { 
          ...defaultValues, 
          dataEntrada: getLocalDateOnly(),
        },
  })

  // Efeito para atualizar form se dados iniciais mudarem
  useEffect(() => {
    if (initialData) {
      form.reset({ 
        ...initialData, 
        dataEntrada: initialData.dataEntrada?.split('T')[0],
        nascimento: initialData.nascimento?.split('T')[0],
        numeroSei: initialData.numeroSei ?? '',
        linkSei: initialData.linkSei ?? '',
        observacoes: initialData.observacoes ?? '',
        origem: initialData.origem ?? 'ESPONTANEA'
      })
    }
  }, [initialData, form])

  const { mutateAsync: submitCase, isPending } = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const payload = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ''),
        telefone: data.telefone.replace(/\D/g, ''),
        nascimento: data.nascimento,     
        dataEntrada: data.dataEntrada,
        numeroSei: data.numeroSei || null,
        linkSei: data.linkSei || null,
        observacoes: data.observacoes || null
      }

      if (isEditing && caseId) {
        return await api.put(`/cases/${caseId}`, payload)
      } else {
        return await api.post('/cases', payload)
      }
    },

    onSuccess: () => {
      toast.success(isEditing ? 'Dados atualizados com sucesso!' : 'Caso cadastrado com sucesso!')
      
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      } else {
        form.reset({
          ...defaultValues,
          dataEntrada: getLocalDateOnly(),
        })
      }

      onCaseCreated?.()
    },

    onError: (error) => {
      console.error(error)
      toast.error(getErrorMessage(error, isEditing ? 'Falha ao atualizar o caso.' : 'Falha ao cadastrar o caso.'))
    },
  })

  const onSubmit: SubmitHandler<CreateCaseFormData> = async (data) => {
    await submitCase(data)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={clsx("space-y-6", isPending && "opacity-50 pointer-events-none")}
      >

        {/* 1. IDENTIFICAÇÃO PESSOAL */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Identificação Pessoal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
            
            <FormField
              control={form.control}
              name="nomeCompleto"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <IMaskInput
                      {...CPF_MASK}
                      value={field.value || ''}
                      onAccept={(v: string) => field.onChange(v)}
                      onBlur={field.onBlur}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nascimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sexo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LISTS.sexo.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <IMaskInput
                      {...PHONE_MASK}
                      value={field.value || ''}
                      onAccept={(v: string) => field.onChange(v)}
                      onBlur={field.onBlur}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem className="lg:col-span-3">
                  <FormLabel>Endereço</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 2. DETALHES DA DEMANDA E ORIGEM */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Dados da Demanda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
            
            {/* [NOVO] Campo Origem */}
            <FormField
              control={form.control}
              name="origem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem da Demanda</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LISTS.origem.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dataEntrada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Entrada</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      readOnly={!isEditing} 
                      className={!isEditing ? "bg-muted opacity-70" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditing ? "Cuidado ao alterar a data de entrada." : "Data atual do sistema."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgencia"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Classificação de Urgência/Risco</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione a situação principal" /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-[200px]">
                      {LISTS.urgencia.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="violacao"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Violação de Direito Identificada</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo de violação" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LISTS.violacao.map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria do Público</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LISTS.categoria.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 3. ATRIBUIÇÃO E PROTOCOLO */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Atribuição e Protocolo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
            
            <FormField
              control={form.control}
              name="orgaoDemandante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Órgão Demandante</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: CRAS, Conselho Tutelar, MP..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numeroSei"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do SEI</FormLabel>
                  <FormControl>
                    <IMaskInput
                      {...SEI_MASK}
                      value={field.value || ''}
                      onAccept={(v: string) => field.onChange(v)}
                      onBlur={field.onBlur}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="00000-00000000/0000-00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkSei"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link do Processo SEI</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} value={field.value ?? ''} placeholder="https://sei.df.gov.br/..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agenteAcolhidaId"
              render={({ field }) => (
                <FormItem className="lg:col-span-3">
                  <FormLabel>Agente Social Responsável (Acolhida/Triagem)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoadingAgents}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingAgents
                              ? "Carregando lista..."
                              : "Selecione um agente social"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {isErrorAgents && (
                        <div className="p-2 text-destructive text-sm flex justify-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Falha ao carregar agentes
                        </div>
                      )}

                      {!isLoadingAgents && agents?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum agente cadastrado
                        </div>
                      )}

                      {agents?.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 4. OBSERVAÇÕES */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações Gerais (Opcional)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} className="min-h-[100px]" placeholder="Informações adicionais..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* BOTÃO */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isPending} size="lg" className="w-full sm:w-auto min-w-[200px]">
            {isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {isPending 
              ? 'Salvando Dados...' 
              : (isEditing ? 'Atualizar Dados' : 'Cadastrar Caso')
            }
          </Button>
        </div>

      </form>
    </Form>
  )
}