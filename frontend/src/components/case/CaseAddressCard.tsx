// frontend/src/components/case/CaseAddressCard.tsx
import { MapPin, Navigation } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AddressData {
  logradouro?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  ra?: string
  latitude?: number
  longitude?: number
}

interface CaseAddressCardProps {
  endereco?: string | AddressData | null
  className?: string
}

export function CaseAddressCard({ endereco, className }: CaseAddressCardProps) {
  
  const hasAddress = !!endereco && (
    typeof endereco === 'string' 
      ? endereco.trim().length > 0 
      : (endereco.logradouro || endereco.ra)
  )

  const openMap = () => {
    let url = '#'

    if (!endereco) return

    if (typeof endereco !== 'string' && endereco.latitude && endereco.longitude) {
      url = `http://googleusercontent.com/maps.google.com/search/${endereco.latitude},${endereco.longitude}`
    } else {
        const query = typeof endereco === 'string' 
        ? endereco 
        : `${endereco.logradouro || ''}, ${endereco.ra || ''}, ${endereco.cidade || 'Brasília'} - DF`
        
        url = `http://googleusercontent.com/maps.google.com/search/${encodeURIComponent(query)}`
    }

    const newWindow = window.open(url, '_blank', 'noopener,noreferrer')
    if (newWindow) newWindow.opener = null
  }

  return (
    <Card className={cn("h-full shadow-sm bg-card", className)}>
      <CardHeader className="pb-2 border-b bg-muted/10">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
          <MapPin className="h-4 w-4 text-primary" />
          Localização
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {!hasAddress ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/50 border-2 border-dashed rounded-lg bg-muted/5">
            <MapPin className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">Endereço não informado</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {typeof endereco === 'string' ? (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {endereco}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {endereco.logradouro && (
                    <p className="text-sm font-medium text-foreground">
                      {endereco.logradouro}
                      {endereco.complemento && <span className="font-normal text-muted-foreground">, {endereco.complemento}</span>}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {[endereco.bairro, endereco.ra].filter(Boolean).join(' • ')}
                  </p>
                  
                  <div className="flex gap-3 pt-1">
                    {endereco.cidade && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                        {endereco.cidade}/{endereco.uf || 'DF'}
                      </span>
                    )}
                    {endereco.cep && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                        CEP: {endereco.cep}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 text-xs h-8 border-dashed"
              onClick={openMap}
            >
              <Navigation className="h-3.5 w-3.5 text-blue-500" />
              Abrir no Mapa
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}