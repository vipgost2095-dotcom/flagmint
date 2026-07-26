import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // чтобы был доступен через ngrok/локальную сеть при тесте в Telegram
    port: 5173,
  },
});
