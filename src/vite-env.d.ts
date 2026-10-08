/// <reference types="vite/client" />

// Le variabili d'ambiente dell'app: vedi .env.example.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_EMAIL?: string
}
