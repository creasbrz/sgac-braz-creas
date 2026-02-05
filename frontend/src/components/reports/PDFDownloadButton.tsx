// frontend/src/components/reports/PDFDownloadButton.tsx
import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFDownloadButtonProps extends ButtonProps {
  // O uso de 'any' aqui é intencional para evitar conflitos de tipagem 
  // entre versões diferentes do React e React-PDF
  document: React.ReactElement<any>; 
  fileName: string;
  label?: string;
  icon?: React.ReactNode;
}

export function PDFDownloadButton({ 
  document, 
  fileName, 
  label = "PDF", 
  icon,
  className,
  variant = "outline",
  size = "sm",
  disabled,
  ...props 
}: PDFDownloadButtonProps) {
  
  const [isClient, setIsClient] = useState(false);

  // Garante que o componente só monte no navegador
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Se não estiver no cliente, mostra loading mas não tenta renderizar o PDF
  if (!isClient) {
    return (
      <Button variant={variant} size={size} disabled className={cn("gap-2", className)} {...props}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Carregando...
      </Button>
    );
  }

  return (
    <PDFDownloadLink document={document} fileName={fileName} className="text-decoration-none">
      {({ loading, error }) => {
        if (error) {
          console.error("Erro na geração do PDF:", error);
          return (
            <Button variant="destructive" size={size} disabled className={cn("gap-2", className)} {...props}>
              <AlertCircle className="h-3.5 w-3.5" />
              Erro
            </Button>
          );
        }

        return (
          <Button 
            variant={variant} 
            size={size} 
            disabled={loading || disabled} 
            className={cn("gap-2", className)}
            {...props}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                {icon || <Printer className="h-3.5 w-3.5" />}
                {label}
              </>
            )}
          </Button>
        );
      }}
    </PDFDownloadLink>
  );
}