// frontend/src/pages/NotFound.tsx
import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'

export function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-100 text-center">
      <h1 className="text-6xl font-bold text-slate-800">404</h1>
      <p className="mt-4 text-xl text-slate-600">Página não encontrada.</p>
      <p className="mt-2 text-slate-500">
        A página que você está a procurar não existe ou foi movida.
      </p>
      <Link
        to={ROUTES.DASHBOARD}
        className="mt-8 rounded-md bg-sky-600 px-6 py-2 text-white hover:bg-sky-700"
      >
        Voltar para o Painel
      </Link>
    </div>
  )
}