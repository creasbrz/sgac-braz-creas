import { memo, type SVGProps } from 'react'

export const GdfLogo = memo(function GdfLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true" // Marca como decorativo para acessibilidade
      {...props}
    >
      {/* Ícone de Escudo (Representando Proteção Social/Governamental) */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
})