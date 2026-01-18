// frontend/src/components/reports/PDFDownloadButton.tsx
import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, AlertCircle } from 'lucide-react';

interface PDFButtonProps {
  document: React.ReactElement;
  fileName: string;
  label?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  className?: string; // [CORREÇÃO] Adicionado para permitir estilização externa
}

export function PDFDownloadButton({ 
  document, 
  fileName, 
  label = "PDF", 
  size = "sm",
  variant = "outline",
  className 
}: PDFButtonProps) {
  const [isClient, setIsClient] = useState(false);

  // Garante que o react-pdf só execute no cliente para evitar erros de SSR/Hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Estado inicial de carregamento (antes de montar)
  if (!isClient) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Carregando...
      </Button>
    );
  }

  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading, error }) => {
        // Tratamento de erro visual caso a geração falhe (ex: erro de fonte)
        if (error) {
          console.error("Erro na geração do PDF:", error);
          return (
            <Button variant="destructive" size={size} disabled className={className}>
              <AlertCircle className="mr-2 h-3.5 w-3.5" />
              Erro ao Gerar
            </Button>
          );
        }

        return (
          <Button 
            variant={variant} 
            size={size} 
            disabled={loading} 
            className={className}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-3.5 w-3.5" />
                {label}
              </>
            )}
          </Button>
        );
      }}
    </PDFDownloadLink>
  );
}