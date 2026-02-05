// frontend/src/components/common/SessionExpiryDialog.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, ShieldAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { SESSION_EXPIRED_EVENT } from "@/lib/api"
import { ROUTES } from "@/constants/app-routes"

export function SessionExpiryDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleExpiry = () => setIsOpen(true)
    
    // Escuta o evento disparado pelo axios interceptor
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiry)
    
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiry)
    }
  }, [])

  const handleLoginRedirect = () => {
    setIsOpen(false)
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md border-destructive/20 bg-background shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
               <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle>Sessão Expirada</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-foreground/80 leading-relaxed">
            Por medidas de segurança, seu acesso foi desconectado devido à inatividade ou expiração das credenciais.
            <br/><br/>
            <span className="text-xs text-muted-foreground bg-muted p-2 rounded block border border-border">
              <strong>Dica:</strong> Se você estava digitando um texto longo (Evolução ou Parecer), 
              copie-o agora antes de clicar em sair para não perder seus dados.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleLoginRedirect}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
          >
            <LogOut className="h-4 w-4" /> Ir para Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}