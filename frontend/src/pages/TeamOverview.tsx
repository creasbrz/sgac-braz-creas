// frontend/src/pages/TeamOverview.tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/api'
import { ROUTES } from '@/constants/routes'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge'

interface CaseInfo {
  id: string
  nomeCompleto: string
}

interface TechnicianOverview {
  nome: string
  cargo: string
  cases: CaseInfo[]
}

export function TeamOverview() {
  const { data: overview, isLoading, isError } = useQuery<TechnicianOverview[]>({
    queryKey: ['reports', 'team-overview'], // 🔥 correção importante
    queryFn: async () => {
      const response = await api.get('/reports/team-overview')
      return response.data
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Casos Ativos (Equipe)</h1>
        <p className="text-muted-foreground">
          Visualize todos os casos ativos distribuídos por cada técnico.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Casos por Técnico</CardTitle>
          <CardDescription>
            Clique num técnico para expandir e ver seus casos atribuídos.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* LOADING */}
          {isLoading && (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* ERRO */}
          {isError && (
            <p className="text-destructive text-center py-8">
              Não foi possível carregar os dados da equipe.
            </p>
          )}

          {/* VAZIO */}
          {!isLoading && !isError && overview?.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Nenhum técnico encontrado.
            </p>
          )}

          {/* LISTA */}
          {!isLoading && !isError && overview && overview.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {overview.map((tech, index) => (
                <AccordionItem
                  value={`tech-${tech.nome}-${index}`} // 🔒 valor único e seguro
                  key={index}
                >
                  <AccordionTrigger>
                    <div className="flex w-full justify-between items-center">
                      <span className="font-semibold">{tech.nome}</span>

                      <Badge variant="secondary">
                        {tech.cases?.length ?? 0} casos
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent>
                    <ul className="space-y-2 pt-2 pl-4 border-l-2 ml-2 border-muted">
                      {(tech.cases ?? []).map((c) => (
                        <li key={c.id} className="text-sm py-1">
                          <Link
                            to={ROUTES.CASE_DETAIL(c.id)}
                            className="text-primary hover:underline font-medium"
                          >
                            {c.nomeCompleto}
                          </Link>
                        </li>
                      ))}

                      {tech.cases?.length === 0 && (
                        <li className="text-sm text-muted-foreground italic">
                          Nenhum caso ativo atribuído.
                        </li>
                      )}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
