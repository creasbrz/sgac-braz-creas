// frontend/src/components/layout/GdfLogo.tsx
import { memo } from 'react'
// Ajuste o caminho abaixo se o nome do seu arquivo for diferente
import logoGdf from '@/assets/logo-gdf.png' 

// Mudamos a tipagem de SVGProps para ImgHTMLAttributes, pois agora é uma imagem
export const GdfLogo = memo(function GdfLogo({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src={logoGdf}
      alt="Logo GDF"
      // object-contain garante que o logo não fique esticado/distorcido
      className={`object-contain ${className}`}
      {...props}
    />
  )
})