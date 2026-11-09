import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
// R3F's frame loop intentionally mutates Three.js objects outside React rendering.
export default tseslint.config({ ignores: ['dist', 'node_modules'] }, { files: ['**/*.{ts,tsx}'], extends: [js.configs.recommended, ...tseslint.configs.recommended], languageOptions: { globals: globals.browser }, plugins: { 'react-hooks': hooks }, rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' } })
