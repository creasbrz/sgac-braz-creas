// frontend/src/pages/TeamOverview.tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, MoreHorizontal, Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { api } from '@/lib/api'
import { ROUTES } from '@/constants/routes'
import { formatCPF } from '@/utils/formatters'
import { getUrgencyColor } from '@/constants/caseConstants'

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CaseStatusBadge } from '@/components/CaseStatusBadge'

interface CaseInfo {
  id: string
  nomeCompleto: string
  cpf: string
  sexo?: string
  urgencia?: string
  violacao?: string
  dataEntrada: string
  status: string
}

interface TechnicianOverview {
  nome: string
  cargo: string
  cases: CaseInfo[]
}

export function TeamOverview() {
  const { data: overview, isLoading, isError } = useQuery<TechnicianOverview[]>({
    queryKey: ['reports', 'team-overview'],
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
          Visualize todos os casos ativos distribuídos por cada técnico em formato detalhado.
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
          {isLoading && (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {isError && (
            <p className="text-destructive text-center py-8">
              Não foi possível carregar os dados da equipe.
            </p>
          )}

          {!isLoading && !isError && overview?.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Nenhum técnico encontrado.
            </p>
          )}

          {!isLoading && !isError && overview && overview.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {overview.map((tech, index) => (
                <AccordionItem
                  value={`tech-${tech.nome}-${index}`} 
                  key={index}
                >
                  <AccordionTrigger>
                    <div className="flex w-full justify-between items-center pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{tech.nome}</span>
                        <Badge variant="outline" className="text-xs font-normal bg-muted/50">
                          {tech.cargo}
                        </Badge>
                      </div>

                      <Badge variant={tech.cases?.length > 0 ? 'default' : 'secondary'}>
                        {tech.cases?.length ?? 0} casos
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="p-0">
                    <div className="border rounded-md my-2 mx-1 overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Nome</TableHead>
                            <TableHead className="whitespace-nowrap">Sexo</TableHead>
                            <TableHead className="whitespace-nowrap">CPF</TableHead>
                            <TableHead className="whitespace-nowrap">Urgência</TableHead>
                            <TableHead className="whitespace-nowrap">Violação</TableHead>
                            <TableHead className="whitespace-nowrap">Entrada</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tech.cases?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground italic">
                                Nenhum caso ativo atribuído.
                              </TableCell>
                            </TableRow>
                          ) : (
                            tech.cases.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                  <Link
                                    to={ROUTES.CASE_DETAIL(c.id)}
                                    className="text-primary hover:underline"
                                    title={c.nomeCompleto}
                                  >
                                    {c.nomeCompleto}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{c.sexo || '-'}</TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatCPF(c.cpf)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`${getUrgencyColor(c.urgencia)} border px-2 py-0.5 text-[10px] uppercase whitespace-nowrap block text-center w-fit`}>
                                    {c.urgencia}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{c.violacao || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                  {formatDistanceToNow(new Date(c.dataEntrada), { locale: ptBR, addSuffix: true })}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <CaseStatusBadge status={c.status} />
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem className="p-0">
                                        <Link to={ROUTES.CASE_DETAIL(c.id)} className="flex w-full items-center px-2 py-1.5 cursor-pointer">
                                          <Edit className="mr-2 h-4 w-4" /> Ver Detalhes
                                        </Link>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
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