const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;

export const postcssOptions = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
