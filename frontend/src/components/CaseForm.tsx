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
// 🔧 CONSTANTES E HELPERS
// ------------------------------------------------------------

const CPF_MASK = { mask: '000.000.000-00' }
const PHONE_MASK = { mask: '(00) 00000-0000' }
const SEI_MASK = { mask: '00000-00000000/0000-00' }

const LISTS = {
  sexo: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],

  urgencia: [
    'Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte',
    'Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente',
    'PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante',
    'Sem risco imediato', 'Visita periódica'
  ],

  violacao: [
    'Abandono', 'Negligência', 'Afastamento do convívio familiar',
    'Cumprimento de medidas socioeducativas',
    'Descumprimento de condicionalidade do PBF',
    'Discriminação', 'Situação de rua', 'Trabalho infantil',
    'Violência física e/ou psicológica', 'Violência sexual', 'Outros'
  ],

  categoria: [
    'Mulher', 'POP RUA', 'LGBTQIA+', 'Migrante', 'Idoso',
    'Criança/adolescente', 'PCD', 'Álcool/drogas'
  ],

  beneficios: [
    { id: 'BPC', label: 'BPC' },
    { id: 'Bolsa Família', label: 'Bolsa Família' },
    { id: 'Prato Cheio', label: 'Prato Cheio' },
    { id: 'Vulnerabilidade', label: 'Vulnerabilidade' },
    { id: 'Excepcional', label: 'Excepcional' },
    { id: 'Calamidade', label: 'Calamidade' },
  ]
}


// 🔧 Função que retorna SOMENTE a data local (sem UTC bug)
const getLocalDateOnly = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0]


// Valores iniciais
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


// ------------------------------------------------------------
// 🔧 COMPONENTE PRINCIPAL
// ------------------------------------------------------------

interface CaseFormProps {
  onCaseCreated?: () => void
}

export function CaseForm({ onCaseCreated }: CaseFormProps) {
  const queryClient = useQueryClient()
  const { data: agents, isLoading: isLoadingAgents, isError: isErrorAgents } = useAgents()

  const form = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseFormSchema),
    defaultValues: {
      ...defaultValues,
      dataEntrada: getLocalDateOnly(),
    },
  })

  const { mutateAsync: createCase, isPending } = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const payload = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ''),
        telefone: data.telefone.replace(/\D/g, ''),
        nascimento: data.nascimento,     // já é data local YYYY-MM-DD
        dataEntrada: getLocalDateOnly(), // sempre salvo a data atual corretamente
      }

      return await api.post('/cases', payload)
    },

    onSuccess: () => {
      toast.success('Caso cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })

      form.reset({
        ...defaultValues,
        dataEntrada: getLocalDateOnly(),
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


  // ------------------------------------------------------------
  // 🔧 RENDERIZAÇÃO
  // ------------------------------------------------------------

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={clsx("space-y-6", isPending && "opacity-50 pointer-events-none")}
      >

        {/* ------------------------------------------------------------ */}
        {/* 1. IDENTIFICAÇÃO PESSOAL */}
        {/* ------------------------------------------------------------ */}
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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


        {/* ------------------------------------------------------------ */}
        {/* 2. BENEFÍCIOS */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Benefícios Recebidos</h3>

          <div className="p-4 border rounded-lg bg-card">
            <FormField
              control={form.control}
              name="beneficios"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

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

                        <FormLabel className="cursor-pointer">
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


        {/* ------------------------------------------------------------ */}
        {/* 3. DETALHES DO CASO */}
        {/* ------------------------------------------------------------ */}
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
                    <Input type="date" {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <FormDescription>Data atual do sistema.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Urgência */}
            <FormField
              control={form.control}
              name="urgencia"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Nível de Urgência</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LISTS.urgencia.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Violação */}
            <FormField
              control={form.control}
              name="violacao"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Violação de Direito</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
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

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
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


        {/* ------------------------------------------------------------ */}
        {/* 4. ATRIBUIÇÃO E ORIGEM */}
        {/* ------------------------------------------------------------ */}
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
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Número SEI */}
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  <FormLabel>Link do SEI</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} placeholder="https://..." />
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
                  <FormLabel>Agente Social Responsável</FormLabel>

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
                              ? "Carregando..."
                              : "Selecione um agente"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {isErrorAgents && (
                        <div className="p-2 text-destructive text-sm flex justify-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Falha ao carregar
                        </div>
                      )}

                      {agents?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum agente disponível
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


        {/* OBSERVAÇÕES */}
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (Opcional)</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-[100px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        {/* BOTÃO */}
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending} className="w-44">
            {isPending && <Loader2 className="animate-spin mr-2" />}
            {isPending ? 'A salvar…' : 'Cadastrar Caso'}
          </Button>
        </div>

      </form>
    </Form>
  )
}
