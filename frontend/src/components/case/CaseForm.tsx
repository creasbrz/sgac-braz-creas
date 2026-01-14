import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, MapPin, Phone, User, AlertCircle, Briefcase } from 'lucide-react'
import { clsx } from 'clsx'
import { differenceInYears } from 'date-fns'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MaskedInput } from '@/components/ui/masked-input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label' 
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { getErrorMessage } from '@/utils/error'
import { createCaseFormSchema, type CreateCaseFormData } from '@/schemas/caseSchemas'
import { useAgents } from '@/hooks/api/useCaseQueries'
import { REGIOES_ADMINISTRATIVAS } from '@/constants/locations'

// --- CONSTANTES DE OPÇÕES ---
const LISTS = {
  sexo: ['Masculino', 'Feminino', 'Outro', 'Não Informado'],
  tipoContato: ['Pessoal', 'Residencial', 'Trabalho', 'Vizinho', 'Parente', 'Outro'],
  urgencia: [
    'Convive com agressor', 'Idoso 80+', 'Primeira infância', 'Risco de morte',
    'Risco de reincidência', 'Sofre ameaça', 'Risco de desabrigo', 'Criança/Adolescente',
    'PCD', 'Idoso', 'Internação', 'Acolhimento', 'Gestante/Lactante',
    'Sem risco imediato', 'Visita periódica'
  ],
  violacao: [
    'Abandono', 'Negligência', 'Afastamento do convívio familiar',
    'Cumprimento de medidas socioeducativas', 'Descumprimento de condicionalidade do PBF',
    'Discriminação', 'Situação de rua', 'Trabalho infantil',
    'Violência física e/ou psicológica', 'Violência sexual', 'Outros'
  ],
  categoria: [
    'Mulher', 'POP RUA', 'LGBTQIA+', 'Migrante', 'Idoso', 'Criança/adolescente', 'PCD', 'Álcool/drogas', 'Família em vulnerabilidade'
  ],
  origem: [
    { id: 'ESPONTANEA', label: 'Demanda Espontânea (Balcão)' },
    { id: 'DOCUMENTAL', label: 'Demanda Documental (SEI/Ofício)' },
    { id: 'REFERENCIADA', label: 'Encaminhamento de Rede' },
    { id: 'BUSCA_ATIVA', label: 'Busca Ativa' }
  ],
  transferenciaRenda: [
    'PROGRAMA BOLSA FAMÍLIA (PBF)', 
    'PROGRAMA DF SOCIAL', 
    'PROGRAMA CARTÃO GÁS', 
    'BENEFÍCIO DE PRESTAÇÃO CONTINUADA (BPC)'
  ]
}

const MASKS = {
  CPF: '000.000.000-00',
  PHONE: '(00) 00000-0000',
  CEP: '00000-000',
  SEI: '00000-00000000/0000-00'
}

const getLocalDateOnly = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]

const defaultValues: CreateCaseFormData = {
  nomeCompleto: '', nomeSocial: '', cpf: '', nascimento: '', sexo: '', 
  contatos: [{ numero: '', tipo: 'Pessoal', nome: '' }],
  endereco: { ra: '', logradouro: '', complemento: '', bairro: '', cidade: 'Brasília', uf: 'DF', cep: '' },
  responsavelLegal: '', parentescoResponsavel: '',
  urgencia: '', violacao: [], categoria: '', orgaoDemandante: '', agenteAcolhidaId: '', 
  linkSei: '', observacoes: '', numeroSei: '', beneficios: [], origem: 'ESPONTANEA', 
  dataEntrada: getLocalDateOnly(), 
}

// --- SUB-COMPONENTES MODULARES ---

function PersonalDataSection() {
  const { control, watch } = useFormContext<CreateCaseFormData>()
  const nascimento = watch('nascimento')
  
  const isMenorDeIdade = useMemo(() => {
    if (!nascimento) return false;
    const years = differenceInYears(new Date(), new Date(nascimento));
    return years >= 0 && years < 18;
  }, [nascimento])

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
          <User className="h-5 w-5" /> Identificação Pessoal
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <FormField control={control} name="nomeCompleto" render={({ field }) => (
            <FormItem><FormLabel>Nome Civil Completo *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <div className="md:col-span-6">
          <FormField control={control} name="nomeSocial" render={({ field }) => (
            <FormItem><FormLabel>Nome Social (Opcional)</FormLabel><FormControl><Input {...field} placeholder="Como prefere ser chamado" /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <div className="md:col-span-4">
          <FormField control={control} name="cpf" render={({ field }) => (
            <FormItem><FormLabel>CPF *</FormLabel><FormControl><MaskedInput mask={MASKS.CPF} placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <div className="md:col-span-4">
          <FormField control={control} name="nascimento" render={({ field }) => (
            <FormItem><FormLabel>Data de Nascimento *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        <div className="md:col-span-4">
          <FormField control={control} name="sexo" render={({ field }) => (
            <FormItem><FormLabel>Sexo *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>{LISTS.sexo.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        {isMenorDeIdade && (
          <div className="md:col-span-12 mt-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-md p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3 text-yellow-800 dark:text-yellow-500 font-medium text-sm">
              <AlertCircle className="h-4 w-4" /> Usuário menor de idade. Identifique o responsável.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={control} name="responsavelLegal" render={({ field }) => (
                <FormItem><FormLabel>Nome do Responsável Legal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={control} name="parentescoResponsavel" render={({ field }) => (
                <FormItem><FormLabel>Parentesco</FormLabel><FormControl><Input {...field} placeholder="Ex: Mãe, Avó, Tio" /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ContactSection() {
  const { control } = useFormContext<CreateCaseFormData>()
  const { fields, append, remove } = useFieldArray({ control, name: "contatos" })

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
          <Phone className="h-5 w-5" /> Contatos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-end animate-in fade-in">
            <div className="grid grid-cols-12 gap-3 flex-1">
              <div className="col-span-4 md:col-span-3">
                <FormField control={control} name={`contatos.${index}.numero`} render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel className="text-xs">Número *</FormLabel>}
                    <FormControl><MaskedInput mask={MASKS.PHONE} placeholder="(61) 90000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
              <div className="col-span-4 md:col-span-3">
                <FormField control={control} name={`contatos.${index}.tipo`} render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel className="text-xs">Tipo</FormLabel>}
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{LISTS.tipoContato.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )}/>
              </div>
              <div className="col-span-4 md:col-span-6">
                <FormField control={control} name={`contatos.${index}.nome`} render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel className="text-xs">Nome (Recado/Obs)</FormLabel>}
                    <FormControl><Input {...field} placeholder="Ex: Vizinha Maria" /></FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive mb-0.5" 
              onClick={() => remove(index)} 
              disabled={fields.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="mt-2 text-xs" 
          onClick={() => append({ numero: '', tipo: 'Pessoal', nome: '' })}
        >
          <Plus className="h-3 w-3 mr-2" /> Adicionar outro telefone
        </Button>
      </CardContent>
    </Card>
  )
}

function AddressSection() {
  const { control, setValue } = useFormContext<CreateCaseFormData>()
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cepRaw = e.target.value.replace(/\D/g, '')
    if (cepRaw.length !== 8) return

    setIsLoadingCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setValue('endereco.logradouro', data.logradouro)
        setValue('endereco.bairro', data.bairro)
        setValue('endereco.complemento', data.complemento)
        setValue('endereco.uf', data.uf)
        setValue('endereco.cidade', data.localidade)

        // Tenta preencher a RA se o bairro bater com a lista
        if (REGIOES_ADMINISTRATIVAS.includes(data.bairro)) {
            setValue('endereco.ra', data.bairro)
        }
        
        toast.success('Endereço encontrado!')
      } else {
        toast.error('CEP não encontrado.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao buscar CEP.')
    } finally {
      setIsLoadingCep(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
          <MapPin className="h-5 w-5" /> Endereço e Localização
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        <div className="md:col-span-3 lg:col-span-2 relative">
          <FormField control={control} name="endereco.cep" render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <div className="relative">
                  <MaskedInput 
                    mask={MASKS.CEP} 
                    placeholder="00000-000" 
                    {...field} 
                    onBlur={(e) => {
                      field.onBlur()
                      handleCepBlur(e)
                    }}
                  />
                  {isLoadingCep && (
                    <div className="absolute right-2 top-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div className="md:col-span-9 lg:col-span-4">
          <FormField control={control} name="endereco.ra" render={({ field }) => (
            <FormItem><FormLabel>Região Administrativa (RA) *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione a RA" /></SelectTrigger></FormControl>
                <SelectContent className="max-h-[250px]">{REGIOES_ADMINISTRATIVAS.map(ra => <SelectItem key={ra} value={ra}>{ra}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div className="md:col-span-12 lg:col-span-6">
          <FormField control={control} name="endereco.logradouro" render={({ field }) => (
            <FormItem><FormLabel>Logradouro Completo *</FormLabel><FormControl><Input {...field} placeholder="Rua, Avenida, Quadra..." /></FormControl><FormMessage /></FormItem>
          )}/>
        </div>
        
        <div className="md:col-span-6">
          <FormField control={control} name="endereco.complemento" render={({ field }) => (
            <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} placeholder="Apto, Bloco, Casa..." /></FormControl></FormItem>
          )}/>
        </div>
        
        <div className="md:col-span-6">
          <FormField control={control} name="endereco.bairro" render={({ field }) => (
            <FormItem><FormLabel>Bairro / Setor</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
          )}/>
        </div>
      </CardContent>
    </Card>
  )
}

function TechnicalDataSection({ agents, isLoadingAgents, isEditing }: { agents: any[], isLoadingAgents: boolean, isEditing: boolean }) {
  const { control, watch, setValue } = useFormContext<CreateCaseFormData>()
  
  // EFEITO PARA PREENCHER ÓRGÃO DEMANDANTE
  const origem = watch('origem')
  useEffect(() => {
    if (origem === 'ESPONTANEA') {
      setValue('orgaoDemandante', 'Demanda Espontânea')
    }
  }, [origem, setValue])
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
          <Briefcase className="h-5 w-5" /> Dados da Demanda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={control} name="dataEntrada" render={({ field }) => (
            <FormItem><FormLabel>Data de Entrada</FormLabel><FormControl><Input type="date" {...field} readOnly={!isEditing} className={!isEditing ? "bg-muted opacity-70" : ""} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={control} name="origem" render={({ field }) => (
            <FormItem><FormLabel>Origem</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{LISTS.origem.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={control} name="orgaoDemandante" render={({ field }) => (
            <FormItem><FormLabel>Órgão Demandante</FormLabel><FormControl><Input {...field} placeholder="Ex: CRAS, MPDFT..." /></FormControl></FormItem>
          )}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/20 rounded-lg border border-border/50">
          <FormField control={control} name="urgencia" render={({ field }) => (
            <FormItem><FormLabel>Urgência/Risco</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent className="max-h-[200px]">{LISTS.urgencia.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>

          <FormField control={control} name="categoria" render={({ field }) => (
            <FormItem><FormLabel>Categoria (Público)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>{LISTS.categoria.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        {/* --- CORREÇÃO: USAR LABEL (NÃO FormLabel) PARA TÍTULOS --- */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Violações de Direitos Identificadas *</Label>
          <p className="text-[11px] text-muted-foreground -mt-2 italic">Marque todas as situações identificadas no atendimento inicial.</p>
          <FormField control={control} name="violacao" render={({ field }) => (
            <FormItem>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border p-4 rounded-md bg-background shadow-inner">
                {LISTS.violacao.map(v => (
                  <div key={v} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value?.includes(v)}
                        onCheckedChange={(checked) => {
                          const current = field.value || []
                          field.onChange(checked ? [...current, v] : current.filter(item => item !== v))
                        }}
                      />
                    </FormControl>
                    <Label className="font-normal cursor-pointer leading-tight text-xs">{v}</Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div>
          <Label className="mb-3 block font-medium">Transferência de Renda</Label>
          <FormField control={control} name="beneficios" render={({ field }) => (
            <FormItem>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {LISTS.transferenciaRenda.map(item => (
                  <div key={item} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                        const current = (field.value as string[]) || [];
                        field.onChange(checked ? [...current, item] : current.filter(v => v !== item))
                      }} />
                    </FormControl>
                    <Label className="font-normal cursor-pointer leading-tight text-sm">{item}</Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <FormField control={control} name="agenteAcolhidaId" render={({ field }) => (
              <FormItem><FormLabel>Agente Social (Triagem)</FormLabel>
                <Select 
                  value={field.value || "unassigned"} 
                  onValueChange={(val) => field.onChange(val === "unassigned" ? "" : val)} 
                  disabled={isLoadingAgents}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder={isLoadingAgents ? "..." : "Selecione (Opcional)"} /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">-- Pendente --</SelectItem>
                    {agents?.map(agent => <SelectItem key={agent.id} value={agent.id}>{agent.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )}/>
          </div>
          <div className="lg:col-span-3">
            <FormField control={control} name="numeroSei" render={({ field }) => (
              <FormItem><FormLabel>Número SEI</FormLabel><FormControl><MaskedInput mask={MASKS.SEI} placeholder="00000..." {...field} /></FormControl></FormItem>
            )}/>
          </div>
          <div className="lg:col-span-5">
            <FormField control={control} name="linkSei" render={({ field }) => (
              <FormItem><FormLabel>Link Processo SEI</FormLabel><FormControl><Input type="url" {...field} placeholder="https://..." /></FormControl></FormItem>
            )}/>
          </div>
        </div>

        <FormField control={control} name="observacoes" render={({ field }) => (
          <FormItem><FormLabel>Observações Gerais</FormLabel><FormControl><Textarea {...field} className="min-h-[80px]" /></FormControl></FormItem>
        )}/>
      </CardContent>
    </Card>
  )
}

// --- COMPONENTE PRINCIPAL ---

interface CaseFormProps {
  onCaseCreated?: () => void
  initialData?: any
  caseId?: string
}

export function CaseForm({ onCaseCreated, initialData, caseId }: CaseFormProps) {
  const queryClient = useQueryClient()
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents()
  const isEditing = !!caseId

  const normalizedInitialData = useMemo(() => {
    if (!initialData) return defaultValues;
    
    const hasContactsArray = Array.isArray(initialData.contatos) && initialData.contatos.length > 0;
    
    return {
      ...defaultValues,
      ...initialData,
      dataEntrada: initialData.dataEntrada?.split('T')[0] || getLocalDateOnly(),
      nascimento: initialData.nascimento?.split('T')[0] || '',
      contatos: hasContactsArray 
        ? initialData.contatos 
        : (initialData.telefone ? [{ numero: initialData.telefone, tipo: 'Pessoal', nome: '' }] : defaultValues.contatos),
      
      endereco: typeof initialData.endereco === 'object' 
        ? initialData.endereco 
        : (typeof initialData.endereco === 'string' ? { ...defaultValues.endereco, logradouro: initialData.endereco } : defaultValues.endereco),
      
      // Sincronização de Violações (Garante que seja Array)
      violacao: Array.isArray(initialData.violacao) 
        ? initialData.violacao 
        : (initialData.violacao ? [initialData.violacao] : []),

      beneficios: initialData.beneficios || [],
      numeroSei: initialData.numeroSei || '',
      linkSei: initialData.linkSei || '',
      observacoes: initialData.observacoes || '',
      agenteAcolhidaId: initialData.agenteAcolhidaId || '',
    }
  }, [initialData])

  const form = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseFormSchema),
    defaultValues: normalizedInitialData,
  })

  useEffect(() => {
    if (initialData) form.reset(normalizedInitialData)
  }, [initialData, form, normalizedInitialData])

  const { mutateAsync: submitCase, isPending } = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const payload = {
        ...data,
        cpf: data.cpf.replace(/\D/g, ''),
        contatos: data.contatos.map(c => ({ ...c, numero: c.numero.replace(/\D/g, '') })),
        numeroSei: data.numeroSei || null,
        linkSei: data.linkSei || null,
        observacoes: data.observacoes || null
      }

      return isEditing && caseId
        ? await api.put(`/cases/${caseId}`, payload)
        : await api.post('/cases', payload)
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Dados atualizados com sucesso!' : 'Caso cadastrado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      
      if (isEditing) queryClient.invalidateQueries({ queryKey: ['case', caseId] })
      else form.reset(defaultValues)
      
      onCaseCreated?.()
    },
    onError: (error) => {
      console.error(error)
      toast.error(getErrorMessage(error, 'Erro ao salvar os dados.'))
    },
  })

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(data => submitCase(data))} 
        className={clsx("space-y-8 pb-10", isPending && "opacity-50 pointer-events-none")}
      >
        <PersonalDataSection />
        <ContactSection />
        <AddressSection />
        <TechnicalDataSection agents={agents} isLoadingAgents={isLoadingAgents} isEditing={isEditing} />

        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t">
          <Button type="submit" disabled={isPending} size="lg" className="w-full sm:w-auto min-w-[200px] shadow-md">
            {isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {isPending ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Caso')}
          </Button>
        </div>
      </form>
    </Form>
  )
}