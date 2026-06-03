-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT,
    "metier" TEXT,
    "ville" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "theme" TEXT NOT NULL DEFAULT 'cyberpunk',
    "dark_mode" BOOLEAN NOT NULL DEFAULT true,
    "email_provider" TEXT,
    "email_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secteur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Secteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campagne" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "secteur_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'active',
    "sources" JSONB,
    "criteres" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campagne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "campagne_id" TEXT,
    "nom_entreprise" TEXT NOT NULL,
    "secteur_activite" TEXT,
    "ville" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email_contact" TEXT,
    "site_web" TEXT,
    "nom_dirigeant" TEXT,
    "siret" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'nouveau',
    "valeur_estimee" DOUBLE PRECISION,
    "analyse_json" JSONB,
    "resume_ia" TEXT,
    "notes" TEXT,
    "prochaine_action" TEXT,
    "prochaine_action_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" TEXT,
    "statut_avant" TEXT,
    "statut_apres" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'genere',
    "prompt_utilise" TEXT,
    "envoye_at" TIMESTAMP(3),
    "ouvert_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Secteur_nom_key" ON "Secteur"("nom");

-- AddForeignKey
ALTER TABLE "Campagne" ADD CONSTRAINT "Campagne_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campagne" ADD CONSTRAINT "Campagne_secteur_id_fkey" FOREIGN KEY ("secteur_id") REFERENCES "Secteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "Campagne"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
