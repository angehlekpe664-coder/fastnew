import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export type ValidationRules = {
  expectedAmount: number;
  academicYear: string;
  treasuryAccountNumber: string;
  paymentTitle: string;
  allowedDateFrom: string | null;
  allowedDateTo: string | null;
  acceptedTemplates: string[];
  treasuryDomain: string;
  requireQrCode: boolean;
  requireOfficialLogo: boolean;
  customRules: Array<{ key: string; value: string; enabled: boolean }>;
};

export const DEFAULT_RULES: ValidationRules = {
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

export async function getValidationRules(): Promise<ValidationRules> {
  const settings = await prisma.validationSetting.findMany();
  if (settings.length === 0) return DEFAULT_RULES;

  const merged = { ...DEFAULT_RULES } as Record<string, unknown>;
  for (const s of settings) {
    merged[s.key] = s.value;
  }
  return merged as unknown as ValidationRules;
}

export async function upsertValidationRules(rules: Partial<ValidationRules>) {
  const entries = Object.entries(rules);
  for (const [key, value] of entries) {
    await prisma.validationSetting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object, label: key, category: "validation" },
    });
  }
  return getValidationRules();
}
