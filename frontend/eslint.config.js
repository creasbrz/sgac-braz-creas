// frontend/eslint.config.js
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";
import eslintJs from "@eslint/js";

export default [
  // Configuração base recomendada pelo ESLint
  eslintJs.configs.recommended,

  // Configurações para ficheiros TypeScript e TSX
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "typescript-eslint": tseslint.plugin,
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
    },
    rules: {
      // Regras recomendadas para TypeScript
      ...tseslint.configs.recommended.rules,
      // Regras recomendadas para React Hooks
      ...pluginReactHooks.configs.recommended.rules,
      // Regra para o Fast Refresh do Vite
      "react-refresh/only-export-components": "warn",
    },
  },

  // Ignora a pasta de build
  {
    ignores: ["dist/"],
  },
];