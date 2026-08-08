import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for Node.js backend projects.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nodeConfig = [
  // Base recommended JS rules
  js.configs.recommended,

  // Prettier integration
  eslintConfigPrettier,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Turbo repo plugin
  {
    plugins: {
      turbo: turboPlugin
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn"
    }
  },

  // Only warn plugin for dev-friendly linting
  {
    plugins: {
      onlyWarn
    }
  },

  // Ignore dist output
  {
    ignores: ["dist/**"]
  },

  // Node-specific settings
  {
    languageOptions: {
      globals: {
        NodeJS: true,
        process: true
      }
    },
    rules: {
      "no-console": "off", // Allow console logging in backend
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];
