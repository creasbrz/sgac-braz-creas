// frontend/eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // 1. Ignora pastas de build e dependências
  { ignores: ['dist', 'node_modules', 'public', 'coverage'] },

  // 2. Configuração Base
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    
    // Aplica apenas aos arquivos de código fonte
    files: ['**/*.{ts,tsx}'],
    
    languageOptions: {
      ecmaVersion: 2024, // Bleeding Edge
      globals: {
        ...globals.browser, // Apenas globais do navegador (window, document)
      },
    },
    
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    
    rules: {
      // --- React Hooks ---
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn', // Crucial para evitar loops infinitos em useEffect
      
      // --- Fast Refresh (Vite) ---
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // --- TypeScript & Code Quality ---
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Em prod, console.log é lixo
    },
  },
)