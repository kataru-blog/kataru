import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './entities/*.schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/22272691-bf6b-4057-b6fe-3ec4dbf2c58e.sqlite',
  },
})
