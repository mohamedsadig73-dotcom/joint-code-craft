import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // S6/P4 guard: forbid direct `supabase.from(...)` calls outside the
  // Service Layer. UI code (pages/components/hooks UI) must go through
  // `src/services/*`. Existing offending files are warnings until they
  // are migrated; new files are blocked at review time.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.object.name='supabase'][callee.property.name='from']",
          message:
            "Do not call supabase.from() from UI layer. Use a service in src/services/* instead (S6/P4 architectural rule).",
        },
      ],
    },
  },
  // Services and hooks/data are the only legitimate consumers of supabase.from().
  {
    files: [
      "src/services/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/integrations/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  }
);
