-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Method" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "Method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "ReimbursementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nameNormalized_key" ON "Category"("nameNormalized");

-- CreateIndex
CREATE INDEX "Category_displayOrder_idx" ON "Category"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Method_nameNormalized_key" ON "Method"("nameNormalized");

-- CreateIndex
CREATE INDEX "Method_displayOrder_idx" ON "Method"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReimbursementStatus_nameNormalized_key" ON "ReimbursementStatus"("nameNormalized");

-- CreateIndex
CREATE INDEX "ReimbursementStatus_displayOrder_idx" ON "ReimbursementStatus"("displayOrder");
