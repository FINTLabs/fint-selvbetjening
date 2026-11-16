import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    tailwindcss(),
    ...(process.env.VITEST ? [] : [reactRouter()]),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    include: ["app/**/*.test.{ts,tsx}", "mocks/**/*.test.{ts,tsx}"],
  },
});
