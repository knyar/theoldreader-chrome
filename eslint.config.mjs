import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended"), {
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.webextensions,
            ...globals.jquery,
        },
    },

    files: ["source/js/*.js"],

    rules: {
        "no-console": "off",

        indent: ["warn", 2, {
            SwitchCase: 1,
        }],

        "no-trailing-spaces": "warn",
        "eol-last": "warn",
        "no-multiple-empty-lines": "warn",

        "space-unary-ops": ["warn", {
            words: true,
            nonwords: false,
        }],

        "space-infix-ops": "warn",
        "keyword-spacing": "warn",
        "space-before-blocks": ["warn", "always"],
        "operator-linebreak": "warn",
        "space-before-function-paren": ["warn", "never"],
        "space-in-parens": ["warn", "never"],
        "array-bracket-spacing": ["warn", "never"],
        "no-spaced-func": "warn",

        "no-unused-vars": ["error", { "caughtErrors": "none" }],

        "key-spacing": ["warn", {
            beforeColon: false,
            afterColon: true,
        }],

        "quote-props": ["warn", "as-needed"],

        "brace-style": ["warn", "1tbs", {
            allowSingleLine: true,
        }],

        curly: ["warn", "multi-line"],
        "no-with": "warn",
        "dot-notation": "warn",
        semi: ["warn", "always"],
        "no-var": "warn",
    },
}];