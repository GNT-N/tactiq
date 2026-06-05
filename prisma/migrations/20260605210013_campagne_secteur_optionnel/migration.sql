-- DropForeignKey
ALTER TABLE "Campagne" DROP CONSTRAINT "Campagne_secteur_id_fkey";

-- AlterTable
ALTER TABLE "Campagne" ALTER COLUMN "secteur_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Campagne" ADD CONSTRAINT "Campagne_secteur_id_fkey" FOREIGN KEY ("secteur_id") REFERENCES "Secteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
