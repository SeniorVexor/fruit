/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                slate: {
                    950: '#020617',
                    900: '#0f172a',
                    800: '#1e293b',
                }
            }
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: ["light", "dark", "synthwave"],
    },
};