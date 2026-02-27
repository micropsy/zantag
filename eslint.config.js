import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";

const reactRecommended =
  pluginReact.configs?.flat?.recommended ?? {
    plugins: {
      react: pluginReact,
    },
    rules: pluginReact.configs?.recommended?.rules ?? {},
  };

const reactJsxRuntime =
  pluginReact.configs?.flat?.["jsx-runtime"] ?? {
    rules: {
      "react/react-in-jsx-scope": "off",
    },
  };

const jsxA11yRecommended =
  pluginJsxA11y.flatConfigs?.recommended ?? {
    plugins: {
      "jsx-a11y": pluginJsxA11y,
    },
    rules: pluginJsxA11y.configs?.recommended?.rules ?? {},
  };

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
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactRecommended,
  reactJsxRuntime,
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: pluginReactHooks.configs.recommended.rules,
  },
  jsxA11yRecommended,
  {
    rules: {
      "react/jsx-no-target-blank": "off",
      "react-hooks/exhaustive-deps": "warn",
      "jsx-a11y/label-has-associated-control": "off"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
