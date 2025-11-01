import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintComments from "eslint-plugin-eslint-comments";
import importPlugin from "eslint-plugin-import";
import noCommentedCode from "eslint-plugin-no-commented-code";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [
      ".next",
      "backups",
      "scripts",
      "dev/**", // Ignore development scripts and utilities
      "next-env.d.ts",
      "src/app/docs/**", // Ignore all documentation files and components
      "*.config.js", // Ignore root config files (postcss, prettier, etc.)
      "*.config.ts",
      "*.config.mjs",
      "mdx-components.tsx", // Ignore MDX components file
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["src/**/*.ts", "src/**/*.tsx"], // Only lint files in src/
    plugins: {
      "unused-imports": unusedImports,
      import: importPlugin,
      "no-commented-code": noCommentedCode,
      "eslint-comments": eslintComments,
    },
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      // Block commits with console.log and console.warn
      "no-console": ["error", { allow: ["error", "info"] }],

      // Warn about TODO/FIXME/HACK comments (doesn't block commits)
      "no-warning-comments": [
        "warn",
        {
          terms: ["todo", "fixme", "hack", "xxx", "note"],
          location: "start",
        },
      ],

      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Upgraded to error level for stricter enforcement
      "@typescript-eslint/no-unused-vars": "off", // Turned off in favor of unused-imports plugin
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/consistent-indexed-object-style": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-base-to-string": "warn",

      // Detect and block commented-out code
      "no-commented-code/no-commented-code": "error",

      // Block inline comments (comments on the same line as code)
      "no-inline-comments": "error",

      // Control ESLint directive comments to prevent abuse
      "eslint-comments/no-unlimited-disable": "error",
      "eslint-comments/no-unused-disable": "error",

      // Enforce using @/ path alias instead of relative imports (../../)
      // Only blocks imports starting with ../ or ./ going up directories
      "import/no-relative-packages": "error",

      // NOTE: import/no-unused-modules is disabled due to flat config compatibility issues
      // Alternative: use "ts-prune" or "knip" CLI tools for unused exports detection
      // "import/no-unused-modules": ["off"],
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },
  },
  // Prettier config must be last to override formatting rules
  eslintConfigPrettier,
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);
