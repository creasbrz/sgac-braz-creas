// frontend/src/components/case/CaseForm.tsx

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useForm, useFieldArray, useFormContext } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Loader2, Plus, Trash2, MapPin, Phone, User, 
  AlertCircle, Briefcase, Save, Mail
} from 'lucide-react'
import { clsx } from 'clsx'
import { differenceInYears, isValid, parseISO } from 'date-fns'

// Libs & Components
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, InputProps } from '@/components/ui/input'
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

// Utils & Schemas
import { getErrorMessage } from '@/utils/error'
import { createCaseFormSchema, type CreateCaseFormData } from '@/schemas/caseSchemas'
import { useAgents } from '@/hooks/api/useCaseQueries'
import { REGIOES_ADMINISTRATIVAS } from '@/constants/locations'
import { OPTIONS } from '@/constants/options'

// --- CONSTANTES ---

const MASKS = {
  CPF: '000.000.000-00',
  PHONE: '(00) 00000-0000',
  CEP: '00000-000',
}

const getLocalDateOnly = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0]

const defaultValues: CreateCaseFormData = {
  nomeCompleto: '', nomeSocial: '', cpf: '', nascimento: '', sexo: '', email: '',
  ocupacao: '', renda: 0, 
  contatos: [{ numero: '', tipo: 'Pessoal', nome: '' }],
  endereco: { ra: '', logradouro: '', complemento: '', bairro: '', cidade: 'Brasília', uf: 'DF', cep: '' },
  responsavelLegal: '', parentescoResponsavel: '',
  urgencia: '', violacao: [], categoria: '', orgaoDemandante: '', agenteAcolhidaId: '', 
  linkSei: '', observacoes: '', numeroSei: '', beneficios: [], origem: 'ESPONTANEA', 
  dataEntrada: getLocalDateOnly(), 
}

// --- COMPONENTES UTILITÁRIOS ---

function SeiInput({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const rawValue = value?.replace(/\D/g, '') || ''
  const mask = rawValue.length > 19 
    ? '00.00.0000.0000000/0000-00'
    : '00000-00000000/0000-00'

  return (
    <MaskedInput 
      mask={mask} 
      placeholder="Digite o número do processo..." 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono bg-background"
    />
  )
}

interface MoneyInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
}

function MoneyInput({ value, onChange, className, ...props }: MoneyInputProps) {
  const safeValue = isNaN(value) ? 0 : value

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(val)
  }

  const [displayValue, setDisplayValue] = useState(formatCurrency(safeValue))

  useEffect(() => {
    setDisplayValue(formatCurrency(safeValue))
  }, [safeValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    const numberValue = Number(rawValue) / 100
    
    setDisplayValue(formatCurrency(numberValue))
    onChange(numberValue)
  }

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      className={clsx("font-mono text-right bg-background", className)}
      placeholder="R$ 0,00"
    />
  )
}

// --- SEÇÕES DO FORMULÁRIO ---

function PersonalDataSection() {
  const { control, watch, setValue } = useFormContext<CreateCaseFormData>()
  const nascimento = watch('nascimento')
  
  const isMenorDeIdade = useMemo(() => {
    if (!nascimento) return false;
    const date = parseISO(nascimento);
    if (!isValid(date)) return false;
    const years = differenceInYears(new Date(), date);
    return years >= 0 && years < 18;
  }, [nascimento])

  useEffect(() => {
    if (!isMenorDeIdade) {
      setValue('responsavelLegal', '')
      setValue('parentescoResponsavel', '')
    }
  }, [isMenorDeIdade, setValue])

  return (
    <Card className="shadow-sm border-l-4 border-l-primary/50 bg-card">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/5">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20 text-primary">
             <User className="h-4 w-4" /> 
          </div>
          Identificação Pessoal
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <FormField control={control} name="nomeCompleto" render={({ field }) => (
            <FormItem>
               <FormLabel>Nome Civil Completo <span className="text-status-error-fg">*</span></FormLabel>
               <FormControl><Input {...field} className="bg-background" /></FormControl>
               <FormMessage />
            </FormItem>
          )}/>
        </div>
        
        <div className="md:col-span-6">
          <FormField control={control} name="nomeSocial" render={({ field }) => (
            <FormItem>
               <FormLabel className="text-muted-foreground">Nome Social (Opcional)</FormLabel>
               <FormControl><Input {...field} placeholder="Como prefere ser chamado" className="bg-background" value={field.value || ''} /></FormControl>
               <FormMessage />
            </FormItem>
          )}/>
        </div>

        {/* Linha Otimizada: CPF | Data Nasc | Sexo */}
        <div className="md:col-span-4">
           <FormField control={control} name="cpf" render={({ field }) => (
            <FormItem>
               <FormLabel>CPF <span className="text-status-error-fg">*</span></FormLabel>
               <FormControl>
                 <MaskedInput 
                   mask={MASKS.CPF} 
                   placeholder="000.000.000-00" 
                   value={field.value} 
                   onChange={field.onChange} 
                   className="bg-background" 
                 />
               </FormControl>
               <FormMessage />
            </FormItem>
          )}/>
        </div>
        <div className="md:col-span-4">
          <FormField control={control} name="nascimento" render={({ field }) => (
            <FormItem>
               <FormLabel>Data de Nascimento <span className="text-status-error-fg">*</span></FormLabel>
               <FormControl><Input type="date" {...field} className="bg-background" /></FormControl>
               <FormMessage />
            </FormItem>
          )}/>
        </div>
        <div className="md:col-span-4">
          <FormField control={control} name="sexo" render={({ field }) => (
            <FormItem>
              <FormLabel>Sexo <span className="text-status-error-fg">*</span></FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent>{OPTIONS.sexo.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div className="md:col-span-6">
          <FormField control={control} name="ocupacao" render={({ field }) => (
            <FormItem>
              <FormLabel>Ocupação Atual</FormLabel>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Selecione a ocupação" /></SelectTrigger></FormControl>
                <SelectContent>
                  {OPTIONS.ocupacao.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        <div className="md:col-span-6">
          <FormField control={control} name="renda" render={({ field }) => (
            <FormItem>
              <FormLabel>Renda Individual</FormLabel>
              <FormControl>
                <MoneyInput 
                  value={Number(field.value) || 0} 
                  onChange={field.onChange} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        {isMenorDeIdade && (
          <div className="md:col-span-12 mt-2 bg-status-warning-bg/10 border border-status-warning-border/50 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3 text-status-warning-fg font-bold text-sm">
              <AlertCircle className="h-4 w-4" /> Usuário menor de idade. Identifique o responsável.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={control} name="responsavelLegal" render={({ field }) => (
                <FormItem>
                   <FormLabel>Nome do Responsável Legal <span className="text-status-error-fg">*</span></FormLabel>
                   <FormControl><Input {...field} className="bg-background" value={field.value || ''} /></FormControl>
                   <FormMessage />
                </FormItem>
              )}/>
              <FormField control={control} name="parentescoResponsavel" render={({ field }) => (
                <FormItem>
                   <FormLabel>Parentesco <span className="text-status-error-fg">*</span></FormLabel>
                   <FormControl><Input {...field} placeholder="Ex: Mãe, Avó, Tio" className="bg-background" value={field.value || ''} /></FormControl>
                   <FormMessage />
                </FormItem>
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
    <Card className="shadow-sm border-l-4 border-l-status-success-fg/50 bg-card">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/5">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <div className="p-1.5 bg-status-success-bg/20 rounded-md border border-status-success-border/30 text-status-success-fg">
             <Phone className="h-4 w-4" /> 
          </div>
          Canais de Contato
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Campo E-mail (Movido para cá) */}
        <div className="bg-muted/10 p-3 rounded-lg border border-border/50">
           <FormField control={control} name="email" render={({ field }) => (
            <FormItem>
               <FormLabel className="flex items-center gap-2 text-foreground font-medium">
                 <Mail className="h-3.5 w-3.5 text-muted-foreground" /> E-mail de Contato
                 <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-primary/20">Novo</span>
               </FormLabel>
               <FormControl>
                 <Input {...field} type="email" placeholder="exemplo@email.com" value={field.value || ''} className="bg-background" />
               </FormControl>
               <FormMessage />
               <p className="text-[11px] text-muted-foreground pt-1">
                 O sistema enviará notificações automáticas de agenda para este endereço.
               </p>
            </FormItem>
          )}/>
        </div>

        <Separator className="bg-border/60" />

        {/* Lista Dinâmica de Telefones */}
        <div className="space-y-4">
          <Label className="text-sm font-semibold text-foreground/90">Telefones</Label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-end animate-in fade-in group">
              <div className="grid grid-cols-12 gap-3 flex-1">
                <div className="col-span-4 md:col-span-3">
                  <FormField control={control} name={`contatos.${index}.numero`} render={({ field }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Número <span className="text-status-error-fg">*</span></FormLabel>}
                      <FormControl>
                          <MaskedInput 
                              mask={MASKS.PHONE} 
                              placeholder="(61) 90000-0000" 
                              value={field.value} 
                              onChange={field.onChange} 
                              className="bg-background" 
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <FormField control={control} name={`contatos.${index}.tipo`} render={({ field }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Tipo</FormLabel>}
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{OPTIONS.tipoContato.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )}/>
                </div>
                <div className="col-span-4 md:col-span-6">
                  <FormField control={control} name={`contatos.${index}.nome`} render={({ field }) => (
                    <FormItem>
                      {index === 0 && <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Nome (Recado/Obs)</FormLabel>}
                      <FormControl><Input {...field} placeholder="Ex: Vizinha Maria" className="bg-background" value={field.value || ''} /></FormControl>
                    </FormItem>
                  )}/>
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 mb-0.5" 
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
            className="mt-2 text-xs border-dashed border-border hover:bg-muted" 
            onClick={() => append({ numero: '', tipo: 'Pessoal', nome: '' })}
          >
            <Plus className="h-3 w-3 mr-2" /> Adicionar outro telefone
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AddressSection() {
  const { control, setValue } = useFormContext<CreateCaseFormData>()
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  const fetchAddressByCep = useCallback(async (cep: string) => {
    try {
      setIsLoadingCep(true)
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setValue('endereco.logradouro', data.logradouro)
        setValue('endereco.bairro', data.bairro)
        setValue('endereco.complemento', data.complemento)
        setValue('endereco.uf', data.uf)
        setValue('endereco.cidade', data.localidade)

        if (REGIOES_ADMINISTRATIVAS.includes(data.bairro)) {
            setValue('endereco.ra', data.bairro)
        }
        toast.success('Endereço encontrado!')
      } else {
        toast.error('CEP não encontrado.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao buscar CEP. Verifique sua conexão.')
    } finally {
      setIsLoadingCep(false)
    }
  }, [setValue])

  const handleCepBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const cepRaw = e.target.value.replace(/\D/g, '')
    if (cepRaw.length === 8) {
      fetchAddressByCep(cepRaw)
    }
  }

  return (
    <Card className="shadow-sm border-l-4 border-l-status-info-fg/50 bg-card">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/5">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <div className="p-1.5 bg-status-info-bg/20 rounded-md border border-status-info-border/30 text-status-info-fg">
             <MapPin className="h-4 w-4" /> 
          </div>
          Endereço e Localização
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
                    value={field.value} 
                    onChange={field.onChange} 
                    onBlur={(e) => {
                      field.onBlur()
                      handleCepBlur(e)
                    }}
                    className="bg-background pr-8"
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
            <FormItem>
              <FormLabel>Região Administrativa (RA) <span className="text-status-error-fg">*</span></FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder="Selecione a RA" /></SelectTrigger></FormControl>
                <SelectContent className="max-h-62.5">{REGIOES_ADMINISTRATIVAS.map(ra => <SelectItem key={ra} value={ra}>{ra}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>
        <div className="md:col-span-12 lg:col-span-6">
          <FormField control={control} name="endereco.logradouro" render={({ field }) => (
            <FormItem>
               <FormLabel>Logradouro Completo <span className="text-status-error-fg">*</span></FormLabel>
               <FormControl><Input {...field} placeholder="Rua, Avenida, Quadra..." className="bg-background" /></FormControl>
               <FormMessage />
            </FormItem>
          )}/>
        </div>
        <div className="md:col-span-6">
          <FormField control={control} name="endereco.complemento" render={({ field }) => (
            <FormItem>
               <FormLabel>Complemento</FormLabel>
               <FormControl><Input {...field} placeholder="Apto, Bloco, Casa..." className="bg-background" value={field.value || ''} /></FormControl>
            </FormItem>
          )}/>
        </div>
        <div className="md:col-span-6">
          <FormField control={control} name="endereco.bairro" render={({ field }) => (
            <FormItem>
               <FormLabel>Bairro / Setor</FormLabel>
               <FormControl><Input {...field} className="bg-background" value={field.value || ''} /></FormControl>
            </FormItem>
          )}/>
        </div>
      </CardContent>
    </Card>
  )
}

function TechnicalDataSection({ agents, isLoadingAgents, isEditing }: { agents: any[], isLoadingAgents: boolean, isEditing: boolean }) {
  const { control, watch, setValue } = useFormContext<CreateCaseFormData>()
  
  const origem = watch('origem')
  
  useEffect(() => {
    if (origem === 'ESPONTANEA') {
      setValue('orgaoDemandante', 'Demanda Espontânea')
    }
  }, [origem, setValue])
  
  return (
    <Card className="shadow-sm border-l-4 border-l-status-warning-fg/50 bg-card">
      <CardHeader className="pb-3 border-b mb-3 bg-muted/5">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <div className="p-1.5 bg-status-warning-bg/20 rounded-md border border-status-warning-border/30 text-status-warning-fg">
             <Briefcase className="h-4 w-4" /> 
          </div>
          Dados da Demanda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={control} name="dataEntrada" render={({ field }) => (
            <FormItem>
               <FormLabel>Data de Entrada</FormLabel>
               <FormControl><Input type="date" {...field} readOnly={!isEditing} className={!isEditing ? "bg-muted opacity-70 cursor-not-allowed" : "bg-background"} /></FormControl>
               <FormMessage />
            </FormItem>
          )}/>
          <FormField control={control} name="origem" render={({ field }) => (
            <FormItem>
              <FormLabel>Origem</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{OPTIONS.origem.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
          <FormField control={control} name="orgaoDemandante" render={({ field }) => (
            <FormItem>
               <FormLabel>Órgão Demandante</FormLabel>
               <FormControl><Input {...field} placeholder="Ex: CRAS, MPDFT..." className="bg-background" value={field.value || ''} /></FormControl>
            </FormItem>
          )}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-muted/10 rounded-xl border border-border/50">
          <FormField control={control} name="urgencia" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90 font-medium">Urgência/Risco</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="bg-background border-border shadow-sm"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent className="max-h-50">{OPTIONS.urgencia.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>

          <FormField control={control} name="categoria" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground/90 font-medium">Categoria (Público)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger className="bg-background border-border shadow-sm"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                <SelectContent className="max-h-50">{OPTIONS.categoria.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2 text-status-warning-fg">
            <AlertCircle className="h-4 w-4" /> Violações de Direitos Identificadas <span className="text-status-error-fg">*</span>
          </Label>
          <FormField control={control} name="violacao" render={({ field }) => (
            <FormItem>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border p-4 rounded-xl bg-background/50 shadow-sm border-border/60">
                {OPTIONS.violacao.map(v => (
                  <div key={v} className="flex flex-row items-start space-x-3 space-y-0 p-1 hover:bg-muted/30 rounded transition-colors">
                    <FormControl>
                      <Checkbox 
                        checked={field.value?.includes(v)}
                        onCheckedChange={(checked) => {
                          const current = field.value || []
                          field.onChange(checked ? [...current, v] : current.filter(item => item !== v))
                        }}
                        className="data-[state=checked]:bg-status-warning-fg data-[state=checked]:border-status-warning-fg"
                      />
                    </FormControl>
                    <Label className="font-normal cursor-pointer leading-tight text-xs pt-0.5">{v}</Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <div>
          <Label className="mb-3 block font-medium text-foreground/90">Transferência de Renda</Label>
          <FormField control={control} name="beneficios" render={({ field }) => (
            <FormItem>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded-xl bg-background/50 shadow-sm border-border/60">
                {OPTIONS.transferenciaRenda.map(item => (
                  <div key={item} className="flex flex-row items-start space-x-3 space-y-0 p-1 hover:bg-muted/30 rounded transition-colors">
                    <FormControl>
                      <Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                        const current = (field.value as string[]) || [];
                        field.onChange(checked ? [...current, item] : current.filter(v => v !== item))
                      }} />
                    </FormControl>
                    <Label className="font-normal cursor-pointer leading-tight text-sm pt-0.5">{item}</Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}/>
        </div>

        <Separator className="bg-border/60" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <FormField control={control} name="agenteAcolhidaId" render={({ field }) => (
              <FormItem>
                <FormLabel>Agente Social (Triagem)</FormLabel>
                <Select 
                  value={field.value || "unassigned"} 
                  onValueChange={(val) => field.onChange(val === "unassigned" ? "" : val)} 
                  disabled={isLoadingAgents}
                >
                  <FormControl><SelectTrigger className="bg-background"><SelectValue placeholder={isLoadingAgents ? "..." : "Selecione (Opcional)"} /></SelectTrigger></FormControl>
                  <SelectContent className="max-h-62.5">
                    <SelectItem value="unassigned">-- Pendente --</SelectItem>
                    {agents?.map(agent => <SelectItem key={agent.id} value={agent.id}>{agent.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )}/>
          </div>
          
          <div className="lg:col-span-3">
            <FormField control={control} name="numeroSei" render={({ field }) => (
              <FormItem>
                <FormLabel>Número SEI</FormLabel>
                <FormControl>
                  <SeiInput 
                    value={field.value || ''} 
                    onChange={field.onChange} 
                  />
                </FormControl>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Aceita formato padrão (19) ou longo (21)
                </p>
              </FormItem>
            )}/>
          </div>
          
          <div className="lg:col-span-5">
            <FormField control={control} name="linkSei" render={({ field }) => (
              <FormItem>
                  <FormLabel>Link Processo SEI</FormLabel>
                  <FormControl><Input type="url" {...field} placeholder="https://..." className="bg-background" value={field.value || ''} /></FormControl>
              </FormItem>
            )}/>
          </div>
        </div>

        <FormField control={control} name="observacoes" render={({ field }) => (
          <FormItem>
             <FormLabel>Observações Gerais</FormLabel>
             <FormControl><Textarea {...field} className="min-h-20 bg-background" value={field.value || ''} /></FormControl>
          </FormItem>
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
    
    return {
      ...defaultValues,
      ...initialData,
      dataEntrada: initialData.dataEntrada ? initialData.dataEntrada.split('T')[0] : getLocalDateOnly(),
      nascimento: initialData.nascimento ? initialData.nascimento.split('T')[0] : '',
      
      contatos: Array.isArray(initialData.contatos) && initialData.contatos.length > 0 
        ? initialData.contatos 
        : (initialData.telefone ? [{ numero: initialData.telefone, tipo: 'Pessoal', nome: '' }] : defaultValues.contatos),
      
      // Ajuste importante: Se o endereço vier formatado do backend, pode ser um objeto ou campos planos
      // A lógica abaixo garante que o formulário receba o objeto 'endereco' populado
      endereco: initialData.endereco && typeof initialData.endereco === 'object' 
        ? initialData.endereco 
        : {
            logradouro: initialData.endereco_logradouro || '',
            complemento: initialData.endereco_complemento || '',
            bairro: initialData.endereco_bairro || '',
            cidade: initialData.endereco_cidade || 'Brasília',
            uf: initialData.endereco_uf || 'DF',
            cep: initialData.endereco_cep || '',
            ra: initialData.endereco_ra || ''
          },
      
      violacao: Array.isArray(initialData.violacao) 
        ? initialData.violacao 
        : (initialData.violacao ? [initialData.violacao] : []),

      ocupacao: initialData.ocupacao || '',
      renda: initialData.renda ? Number(initialData.renda) : 0,
      beneficios: initialData.beneficios || [],
      numeroSei: initialData.numeroSei || '',
      linkSei: initialData.linkSei || '',
      observacoes: initialData.observacoes || '',
      agenteAcolhidaId: initialData.agenteAcolhidaId || '',
      email: initialData.email || '' 
    }
  }, [initialData])

  // Cast 'as any' para resolver conflito de tipagem do zodResolver
  const form = useForm<CreateCaseFormData>({
    resolver: zodResolver(createCaseFormSchema) as any,
    defaultValues: normalizedInitialData,
  })

  // Reset do form quando os dados iniciais mudam (ex: edição)
  useEffect(() => {
    if (initialData) form.reset(normalizedInitialData)
  }, [initialData, form, normalizedInitialData])

  const { mutateAsync: submitCase, isPending } = useMutation({
    mutationFn: async (data: CreateCaseFormData) => {
      const payload = {
        // Dados Pessoais
        nomeCompleto: data.nomeCompleto,
        nomeSocial: data.nomeSocial || null,
        cpf: data.cpf.replace(/\D/g, ''),
        nascimento: data.nascimento,
        sexo: data.sexo,
        email: data.email || null, 
        
        // Sócio-econômico
        ocupacao: data.ocupacao || null,
        renda: Number(data.renda),

        // Endereço e Contato
        endereco: data.endereco,
        contatos: data.contatos.map(c => ({ ...c, numero: c.numero.replace(/\D/g, '') })),

        // Responsável
        responsavelLegal: data.responsavelLegal || null,
        parentescoResponsavel: data.parentescoResponsavel || null,

        // Dados Técnicos
        urgencia: data.urgencia,
        violacao: data.violacao,
        categoria: data.categoria,
        orgaoDemandante: data.orgaoDemandante,
        origem: data.origem,
        dataEntrada: data.dataEntrada,
        
        // Administrativo
        agenteAcolhidaId: data.agenteAcolhidaId || null,
        numeroSei: data.numeroSei ? data.numeroSei.replace(/\D/g, '') : null,
        linkSei: data.linkSei || null,
        observacoes: data.observacoes || null,
        beneficios: data.beneficios
      }

      return isEditing && caseId
        ? await api.patch(`/cases/${caseId}`, payload) // CORREÇÃO: PUT -> PATCH
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
      toast.error(getErrorMessage(error, 'Erro ao salvar os dados. Verifique os campos.'))
    },
  })

  const handleError = (errors: any) => {
    console.error("Erros de validação:", errors)
    const errorFields = Object.keys(errors).map(key => {
      const names: Record<string, string> = {
        nomeCompleto: 'Nome Completo',
        cpf: 'CPF',
        nascimento: 'Data de Nascimento',
        violacao: 'Violações',
        contatos: 'Contatos (Número)',
        responsavelLegal: 'Responsável Legal',
        email: 'E-mail'
      }
      return names[key] || key
    })
    
    if (errorFields.length > 0) {
      toast.error(`Verifique os campos: ${errorFields.join(', ')}`)
    }
  }

  return (
    <Form {...form}>
      <form 
        // Cast duplo para evitar erro de tipo do hook form
        onSubmit={form.handleSubmit((data) => submitCase(data as unknown as CreateCaseFormData), handleError)} 
        className={clsx("space-y-8 pb-10", isPending && "opacity-50 pointer-events-none")}
      >
        <PersonalDataSection />
        <ContactSection />
        <AddressSection />
        <TechnicalDataSection agents={agents} isLoadingAgents={isLoadingAgents} isEditing={isEditing} />

        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-border sticky bottom-0 bg-background py-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button type="submit" disabled={isPending} size="lg" className="w-full sm:w-auto min-w-50 shadow-md font-semibold text-base h-11 transition-all active:scale-95">
            {isPending ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Processando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Caso'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}