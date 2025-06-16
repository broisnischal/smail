import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }
  }
});
