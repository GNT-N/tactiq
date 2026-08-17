import path from 'path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Next lit .env.local en priorité, pas dotenv. On charge les deux dans le
// même ordre : dotenv n'écrase pas une variable déjà définie, donc le
// premier chargé gagne. En production (Render), les variables viennent de
// l'environnement et ces deux fichiers sont simplement absents.
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})