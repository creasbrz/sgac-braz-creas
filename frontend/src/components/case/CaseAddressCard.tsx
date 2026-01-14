// frontend/src/components/case/CaseAddressCard.tsx
import { MapPin, ExternalLink, Map as MapIcon, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface CaseAddressCardProps {
  caseData: any
}

export function CaseAddressCard({ caseData }: CaseAddressCardProps) {
  // Lógica de Normalização de Dados (Compatibilidade V1/V2)
  const isV2 = !!caseData.endereco_logradouro
  
  const address = {
    ra: (isV2 ? caseData.endereco_ra : null) || 'Não Informada',
    logradouro: (isV2 ? caseData.endereco_logradouro : caseData.endereco) || '',
    complemento: caseData.endereco_complemento || '',
    bairro: caseData.endereco_bairro || '',
    cep: caseData.endereco_cep || '',
    cidade: caseData.endereco_cidade || 'Brasília',
    uf: caseData.endereco_uf || 'DF'
  }

  const hasAddress = !!address.logradouro

  // Monta a query string para o Google Maps
  const fullAddressQuery = [
    address.logradouro,
    address.bairro,
    address.ra !== 'Não Informada' ? address.ra : '',
    address.cidade,
    address.uf
  ].filter(Boolean).join(', ')

  const openGoogleMaps = () => {
    if (!hasAddress) return
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressQuery)}`
    window.open(url, '_blank')
  }

  return (
    <Card className="h-full shadow-sm hover:border-primary/20 transition-colors">
      <CardHeader className="pb-3 border-b bg-muted/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <MapIcon className="h-4 w-4 text-primary" /> Localização & Território
          </CardTitle>
          {hasAddress && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" 
              onClick={openGoogleMaps} 
              title="Abrir no Google Maps"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="space-y-4">
          
          {/* Badge da RA (Destaque Territorial) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Região Administrativa</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 border-blue-200 font-medium text-sm rounded-md">
                {address.ra}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Detalhes do Endereço */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 block">Endereço Residencial</span>
            
            {hasAddress ? (
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 space-y-1 group relative">
                <div className="flex items-start gap-2">
                   <Home className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                   <div>
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {address.logradouro}
                      </p>
                      
                      {(address.bairro || address.complemento) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[address.bairro, address.complemento].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      
                      <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono">
                        {[address.cep, address.cidade, address.uf].filter(Boolean).join(' - ')}
                      </p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-100 text-xs">
                <MapPin className="h-4 w-4" />
                Endereço não cadastrado ou incompleto.
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  )
}