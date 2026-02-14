// frontend/src/components/case/tabs/OverviewTab.tsx
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { 
  FileText, AlertTriangle, 
  Calendar, Tag, Shield, CheckCircle2, Clock, 
  Wallet, Briefcase, Mail, MapPin, Phone, MessageCircle 
} from 'lucide-react'
import { formatDateSafe, formatPhone } from '@/utils/formatters'
import type { CaseDetailData } from '@/types/case'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { SeiManager } from '@/components/case/SeiManager'

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

function InfoField({ icon: Icon, label, value, className }: { icon: any, label: string, value: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 opacity-80">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <div className="font-medium text-sm text-foreground wrap-break-word bg-muted/40 p-2.5 rounded-lg border border-border/40 min-h-10.5 flex items-center shadow-sm">
        {value || <span className="text-muted-foreground/60 italic font-normal text-xs">Não informado</span>}
      </div>
    </div>
  )
}

function TeamMemberRow({ 
  role, 
  member, 
  colorClass 
}: { 
  role: string, 
  member?: { nome: string } | null, 
  colorClass: string 
}) {
  const initial = member?.nome ? member.nome.charAt(0).toUpperCase() : "?"
  const statusColor = member ? colorClass : "bg-muted text-muted-foreground border-border"
  
  return (
    <div className="flex items-center justify-between py-1.5 group">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">{role}</span>
        <span className={cn("text-sm font-medium transition-colors", !member && "text-muted-foreground italic font-normal")}>
           {member?.nome || "Pendente"}
        </span>
      </div>
      <div className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 shadow-sm transition-transform group-hover:scale-105", 
        statusColor
      )}>
        {member ? initial : <Clock className="h-4 w-4" />}
      </div>
    </div>
  )
}

export function OverviewTab({ caseData }: { caseData: CaseDetailData }) {
  
  const renderViolations = () => {
    const violations = Array.isArray(caseData.violacao) 
      ? caseData.violacao 
      : (caseData.violacao ? [caseData.violacao] : []);

    if (violations.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {violations.map((v) => (
          <Badge 
            key={v} 
            variant="outline" 
            className="bg-status-error-bg/10 text-status-error-fg border-status-error-border/30 px-2.5 py-1 text-xs font-medium hover:bg-status-error-bg/20 transition-colors shadow-sm"
          >
            <AlertTriangle className="w-3 h-3 mr-1.5" />
            {v}
          </Badge>
        ))}
      </div>
    );
  }

  const addr = (caseData.endereco as any) || caseData; 
  
  const fullAddress = [
      addr.logradouro || addr.endereco_logradouro,
      (addr.complemento || addr.endereco_complemento) ? `(${addr.complemento || addr.endereco_complemento})` : null
  ].filter(Boolean).join(' ');

  const ra = addr.ra || addr.endereco_ra;
  const cep = addr.cep || addr.endereco_cep;

  // Lógica para Consolidar Contatos Telefônicos
  const allContacts = useMemo(() => {
    const list: Array<{numero: string, tipo: string, nome?: string}> = [];
    if (caseData.contatos && Array.isArray(caseData.contatos)) {
      list.push(...caseData.contatos);
    }
    // Fallback se tiver telefone legado e não estiver na lista
    if (caseData.telefone && !list.some(c => c.numero === caseData.telefone)) {
      list.push({ numero: caseData.telefone, tipo: 'Principal', nome: '' });
    }
    return list;
  }, [caseData]);

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const message = encodeURIComponent("Olá! Aqui é da equipe técnica do CREAS Brazlândia. ");
      window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-6">
      
      {/* --- COLUNA ESQUERDA (2/3) --- */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-sm border-l-4 border-l-primary h-full overflow-hidden bg-card">
          <CardHeader className="pb-4 border-b border-border/40 bg-muted/5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20">
                  <FileText className="h-4 w-4 text-primary" /> 
              </div>
              Ficha Técnica do Prontuário
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-8">
            
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 pl-1">
                <AlertTriangle className="h-3 w-3 text-status-warning-fg" /> Violações de Direitos Detectadas
              </span>
              <div className={cn(
                "p-4 rounded-xl border min-h-15 transition-colors",
                caseData.violacao?.length ? "bg-status-error-bg/5 border-status-error-border/20" : "bg-muted/20 border-border/40 border-dashed"
              )}>
                {renderViolations() || (
                   <div className="flex items-center justify-center h-full gap-2 text-muted-foreground/60 italic text-sm">
                      <Shield className="h-4 w-4 opacity-50" /> Nenhuma violação selecionada
                   </div>
                )}
              </div>
            </div>

            <div className="py-2">
              <SeiManager 
                caseId={caseData.id}
                numeroSei={caseData.numeroSei}
                linkSei={caseData.linkSei}
                seiRespondido={!!caseData.seiRespondido}
                dataRespostaSei={caseData.dataRespostaSei}
              />
            </div>

            <Separator className="bg-border/60" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField 
                icon={Tag} 
                label="Categoria do Público" 
                value={caseData.categoria} 
              />
              <InfoField 
                icon={Calendar} 
                label="Data de Entrada" 
                value={formatDateSafe(caseData.dataEntrada)} 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoField 
                icon={Briefcase} 
                label="Ocupação Atual" 
                value={caseData.ocupacao} 
              />
              <InfoField 
                icon={Wallet} 
                label="Renda Individual" 
                value={caseData.renda ? Number(caseData.renda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null} 
                className="text-status-success-fg"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                <InfoField 
                    icon={Mail} 
                    label="E-mail de Contato" 
                    value={caseData.email} 
                    className="w-full"
                />
            </div>

            <Separator className="bg-border/60" />

            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                     <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5 pl-1">
                        <MapPin className="h-3 w-3 text-primary" /> Localização de Referência
                     </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <InfoField 
                        icon={MapPin}
                        label="Endereço / Logradouro"
                        value={fullAddress}
                        className="sm:col-span-2"
                     />
                     <InfoField 
                        icon={MapPin}
                        label="Região Administrativa (RA)"
                        value={ra}
                     />
                     <InfoField 
                        icon={MapPin}
                        label="CEP"
                        value={cep}
                     />
                </div>
            </div>

            {caseData.observacoes && (
              <div className="pt-2">
                <div className="bg-status-warning-bg/10 border border-status-warning-border/30 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-status-warning-fg" />
                  <h4 className="text-xs font-bold text-status-warning-fg uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Notas Técnicas de Atenção
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap pl-1">
                    {caseData.observacoes}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- COLUNA DIREITA (1/3) --- */}
      <div className="space-y-6">
        
        <Card className="shadow-sm overflow-hidden border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded text-primary"><Shield className="h-3.5 w-3.5" /></div>
              Equipe de Referência
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
             <TeamMemberRow 
                role="Agente de Acolhida" 
                member={caseData.agenteAcolhida} 
                colorClass="bg-status-success-bg text-status-success-fg border-status-success-border" 
             />
             <Separator className="bg-border/40" />
             <TeamMemberRow 
                role="Técnico PAEFI" 
                member={caseData.especialistaPAEFI} 
                colorClass="bg-status-info-bg text-status-info-fg border-status-info-border" 
             />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/5">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-status-success-bg rounded text-status-success-fg"><CheckCircle2 className="h-3.5 w-3.5" /></div>
                Benefícios Ativos
              </div>
              <Badge variant="outline" className="text-[10px] h-5 bg-background shadow-sm">{caseData.beneficios?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-2">
              {caseData.beneficios && caseData.beneficios.length > 0 ? (
                caseData.beneficios.map(b => (
                  <Badge 
                    key={b} 
                    variant="secondary" 
                    className="bg-status-success-bg/10 text-status-success-fg hover:bg-status-success-bg/20 border-status-success-border/30 text-[10px] py-1 px-2.5 shadow-sm"
                  >
                    {b}
                  </Badge>
                ))
              ) : (
                <div className="text-center w-full py-8 text-muted-foreground text-xs italic bg-muted/20 rounded-xl border border-dashed border-border/60">
                  Nenhum benefício vinculado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* [NOVO] CARD DE CONTATOS TELEFÔNICOS COM WHATSAPP */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/40 bg-emerald-50/50 dark:bg-emerald-950/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded text-emerald-600 dark:text-emerald-400"><Phone className="h-3.5 w-3.5" /></div>
              Contatos Telefônicos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            {allContacts.length > 0 ? (
              <div className="flex flex-col divide-y divide-border/40">
                {allContacts.map((contato, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{formatPhone(contato.numero)}</span>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wide px-1.5 py-0 bg-background text-muted-foreground">
                          {contato.tipo || 'Outro'}
                        </Badge>
                      </div>
                      {contato.nome && (
                        <p className="text-xs text-muted-foreground truncate" title={contato.nome}>
                          Falar com: {contato.nome}
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="shrink-0 h-8 w-8 p-0 rounded-full border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 bg-background shadow-sm"
                      onClick={() => handleWhatsApp(contato.numero)}
                      title="Enviar mensagem via WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center w-full text-muted-foreground text-xs italic">
                Nenhum telefone cadastrado.
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}