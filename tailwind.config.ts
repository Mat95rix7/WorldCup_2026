// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // "sans" sera la police par défaut (utilisez celle que vous préférez)
                sans: ["var(--font-roboto)", "sans-serif"],
                // Vous pouvez définir des noms spécifiques
                poppins: ["var(--font-poppins)", "sans-serif"],
                inter: ["var(--font-inter)", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },
        },
    },
    plugins: [],
};
export default config;