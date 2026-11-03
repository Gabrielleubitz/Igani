import coreWebVitals from 'eslint-config-next/core-web-vitals'

/**
 * Same rules as before (next/core-web-vitals), as an ESLint 9 flat config, since Next 16 dropped `next lint`.
 * The React Compiler checks that arrived with it are warnings: this app does not use the compiler, and they flag
 * patterns that are correct here (e.g. resetting a form when a dialog opens).
 */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'studio/node_modules/**', 'video/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  {
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]

export default config
