import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/build/**",
      "**/.wrangler/**",
      "**/.cache/**",
      "**/public/build/**",
      "**/temp_reference/**",
      "**/temp_zantag_vercel/**",
      "**/functions/**",
      "**/dist-worker/**",
      ".env",
      ".DS_Store"
    ]
  },
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: pluginReactHooks.configs.recommended.rules,
  },
  pluginJsxA11y.flatConfigs.recommended,
  {
    rules: {
      "react/jsx-no-target-blank": "off",
      "react-hooks/exhaustive-deps": "warn"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
