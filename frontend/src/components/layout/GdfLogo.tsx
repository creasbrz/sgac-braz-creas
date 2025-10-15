// frontend/src/components/layout/GdfLogo.tsx
export function GdfLogo() {
  return (
    <svg
      className="size-8 text-primary"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true" // O logo é decorativo, por isso escondemo-lo de leitores de tela.
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27.234 53.304L64.53 16L101.826 53.304L64.53 90.609L27.234 53.304ZM64.53 0L0 64.53L64.53 128L128 64.53L64.53 0Z"
        fill="currentColor"
      />
    </svg>
  )
}
