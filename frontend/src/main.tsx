// frontend/src/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

// TAILWIND V4 ENTRY POINT
// Importa o CSS global que contém as diretivas @import "tailwindcss" e @theme
import './styles/index.css'

const container = document.getElementById('root')

// Fail-safe para garantir que a aplicação não tente montar no vazio
if (!container) {
  throw new Error("Erro Crítico: Elemento #root não encontrado no index.html")
}

// Renderização React 18+
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)