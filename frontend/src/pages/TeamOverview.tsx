// frontend/src/pages/TeamOverview.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
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
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
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
    queryKey: ['teamOverview'],
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
            Clique num técnico para expandir e ver os seus casos atribuídos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex h-64 items-center justify-center">
             <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {isError && <p className="text-destructive">Erro ao carregar os dados da equipe.</p>}
          
          <Accordion type="single" collapsible className="w-full">
            {overview?.map((tech) => (
              <AccordionItem value={tech.nome} key={tech.nome}>
                <AccordionTrigger>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{tech.nome}</span>
                    <Badge variant="secondary">{tech.cases.length} casos</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pt-2 pl-4">
                    {tech.cases.map(c => (
                      <li key={c.id} className="text-sm">
                        <Link 
                          to={ROUTES.CASE_DETAIL.replace(':id', c.id)} 
                          className="text-primary hover:underline"
                        >
                          {c.nomeCompleto}
                        </Link>
                      </li>
                    ))}
                    {tech.cases.length === 0 && (
                      <li className="text-sm text-muted-foreground">
                        Nenhum caso ativo atribuído.
                      </li>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

        </CardContent>
      </Card>
    </div>
  )
}