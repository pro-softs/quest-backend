-- CreateTable
CREATE TABLE "configs" (
    "id" TEXT NOT NULL,
    "subjects" JSONB NOT NULL,
    "ageGroups" JSONB NOT NULL,
    "styles" JSONB NOT NULL,
    "noOfEpisodes" INTEGER NOT NULL DEFAULT 3,
    "noOfScenes" INTEGER NOT NULL DEFAULT 6,
    "noOfGenerations" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "videoId" TEXT,
    "tokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "usedFor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
