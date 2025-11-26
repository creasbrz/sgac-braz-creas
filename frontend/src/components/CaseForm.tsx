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
import { Checkbox } from '@/components/ui/checkbox'
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
// 🔧 CONSTANTES DE LISTAS (Sincronizadas com o Banco/Seed)
// ------------------------------------------------------------

const LISTS = {
  sexo: [
    'Masculino',
    'Feminino',
    'Outro',
    'Não Informado'
  ],

  // Lista detalhada de urgências (Strings)
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

  // Lista detalhada de violações (Strings)
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

  // Lista detalhada de categorias (Strings)
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

  // Lista de Benefícios (IDs fixos)
  beneficios: [
    { id: 'BPC', label: 'BPC (Benefício de Prestação Continuada)' },
    { id: 'Bolsa Família', label: 'Bolsa Família' },
    { id: 'Prato Cheio', label: 'Prato Cheio' },
    { id: 'Vulnerabilidade', label: 'Auxílio Vulnerabilidade' },
    { id: 'Excepcional', label: 'Auxílio Excepcional' },
    { id: 'Calamidade', label: 'Auxílio Calamidade' },
    { id: 'DF Social', label: 'DF Social' }
  ]
}

// Máscaras
const CPF_MASK = { mask: '000.000.000-00' }
const PHONE_MASK = { mask: '(00) 00000-0000' }
// [CORREÇÃO] Máscara SEI ajustada conforme solicitado: 00000-00000000/0000-00
const SEI_MASK = { mask: '00000-00000000/0000-00' }

// 🔧 Função que retorna SOMENTE a data local (sem UTC bug)
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
  beneficios: [],
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
  
  // Se tiver caseId, estamos a editar
  const isEditing = !!caseId

  const form = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseFormSchema),
    defaultValues: initialData 
      ? { 
          ...initialData, 
          // Se vier do banco, a data pode vir com hora, cortamos para YYYY-MM-DD
          dataEntrada: initialData.dataEntrada?.split('T')[0],
          nascimento: initialData.nascimento?.split('T')[0],
          // Garante string vazia se vier null do banco para não quebrar o input
          numeroSei: initialData.numeroSei ?? '',
          linkSei: initialData.linkSei ?? '',
          observacoes: initialData.observacoes ?? '',
        } 
      : { 
          ...defaultValues, 
          dataEntrada: getLocalDateOnly(),
        },
  })

  // Efeito para atualizar o formulário se os dados iniciais mudarem (ex: reabrir modal com outro caso)
  useEffect(() => {
    if (initialData) {
      form.reset({ 
        ...initialData, 
        dataEntrada: initialData.dataEntrada?.split('T')[0],
        nascimento: initialData.nascimento?.split('T')[0],
        numeroSei: initialData.numeroSei ?? '',
        linkSei: initialData.linkSei ?? '',
        observacoes: initialData.observacoes ?? '',
      })
    }
  }, [initialData, form])

  const { mutateAsync: submitCase, isPending } = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const payload = {
        ...data,
        // Remove formatação de máscaras antes de enviar para o backend
        cpf: data.cpf.replace(/\D/g, ''),
        telefone: data.telefone.replace(/\D/g, ''),
        nascimento: data.nascimento,     
        dataEntrada: data.dataEntrada,
        // Envia null se a string for vazia para limpar no banco
        numeroSei: data.numeroSei || null,
        linkSei: data.linkSei || null,
        observacoes: data.observacoes || null
      }

      if (isEditing && caseId) {
        // PUT: Atualizar
        return await api.put(`/cases/${caseId}`, payload)
      } else {
        // POST: Criar
        return await api.post('/cases', payload)
      }
    },

    onSuccess: () => {
      toast.success(isEditing ? 'Dados atualizados com sucesso!' : 'Caso cadastrado com sucesso!')
      
      // Invalida queries para atualizar listas e gráficos
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      
      if (isEditing) {
        // Se for edição, atualiza também a query de detalhes específica
        queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      } else {
        // Se for criação, limpa o formulário
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
            
            {/* Nome */}
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

            {/* CPF */}
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

            {/* Data de Nascimento */}
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

            {/* Sexo */}
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

            {/* Telefone */}
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

            {/* Endereço */}
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

        {/* 2. BENEFÍCIOS */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Benefícios Recebidos</h3>
          <div className="p-4 border rounded-lg bg-card">
            <FormField
              control={form.control}
              name="beneficios"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {LISTS.beneficios.map(item => (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...(field.value || []), item.id])
                              } else {
                                field.onChange(field.value?.filter(v => v !== item.id))
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-normal leading-none">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 3. DETALHES DO CASO */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Detalhes do Caso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
            
            {/* Data Entrada */}
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

            {/* Urgência (Lista Detalhada) */}
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

            {/* Violação (Lista Detalhada) */}
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

            {/* Categoria (Lista Detalhada) */}
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

        {/* 4. ATRIBUIÇÃO E ORIGEM */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Atribuição e Origem</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
            
            {/* Órgão Demandante */}
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

            {/* Número SEI (Máscara Corrigida) */}
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

            {/* Link SEI */}
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

            {/* Agente Responsável */}
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

        {/* 5. OBSERVAÇÕES */}
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
              : (isEditing ? 'Atualizar Dados' : 'Cadastrar Novo Caso')
            }
          </Button>
        </div>

      </form>
    </Form>
  )
}