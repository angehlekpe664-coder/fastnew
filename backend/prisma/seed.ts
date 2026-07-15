import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_RULES = {
  expectedAmount: 2500,
  academicYear: "2025-2026",
  treasuryAccountNumber: "",
  paymentTitle: "FAST/PRODUITS ACCESSOIRES",
  allowedDateFrom: null,
  allowedDateTo: null,
  acceptedTemplates: ["quittance tresor", "equittance", "paiement efc"],
  treasuryDomain: "equittancetresor.finances.bj",
  requireQrCode: false,
  requireOfficialLogo: false,
  customRules: [],
};

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@uac.bj";
  const password = process.env.ADMIN_PASSWORD ?? "Admin@2026!";
  const nom = process.env.ADMIN_NOM ?? "Administrateur UniPay";

  const hash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, nom, passwordHash: hash, role: "admin" },
  });

  for (const [key, value] of Object.entries(DEFAULT_RULES)) {
    await prisma.validationSetting.upsert({
      where: { key },
      update: { value: value as object },
      create: {
        key,
        value: value as object,
        label: key,
        category: "validation",
      },
    });
  }

  console.log("✅ Seed terminé");
  console.log(`   Admin : ${email} / ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
