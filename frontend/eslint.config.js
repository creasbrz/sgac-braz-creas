// frontend/eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // 1. Pastas ignoradas globalmente
  { ignores: ['dist', 'node_modules', 'public'] },

  // 2. Extensões de configuração recomendadas
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    
    files: ['**/*.{ts,tsx}'],
    
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node 
      },
    },
    
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    
    rules: {
      // --- React Hooks ---
      ...reactHooks.configs.recommended.rules,
      
      // --- Fast Refresh (Vite) ---
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // --- TypeScript ---
      // Permite 'any' explicito, mas avisa.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
)