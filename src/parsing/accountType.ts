import type { AccountType, FileManifest } from "./types";

/**
 * Detects the user's Instagram account type from the export contents.
 *
 * Account-type detection has to look at *content*, not file presence: even
 * personal accounts ship `monetization/eligibility.json` and an empty
 * `professional_information.json`. The signal we trust is whether either
 * file has any *populated* entry indicating an active professional state.
 *
 * Phase 1 returns `personal` or `creator`. The `business` discriminator is
 * deferred until we have category data to tell them apart.
 */
export async function detectAccountType(
  manifest: FileManifest,
): Promise<AccountType> {
  const [proInfo, monetization] = await Promise.all([
    manifest.readJson<ProfessionalInfoFile>(
      "personal_information/personal_information/professional_information.json",
    ),
    manifest.readJson<MonetizationFile>(
      "your_instagram_activity/monetization/eligibility.json",
    ),
  ]);

  if (hasPopulatedProfessionalInfo(proInfo)) return "creator";
  if (hasMonetizationApproval(monetization)) return "creator";
  return "personal";
}

type ProfessionalInfoEntry = {
  string_map_data?: Record<string, unknown>;
};
type ProfessionalInfoFile = {
  profile_business?: ProfessionalInfoEntry[];
};

function hasPopulatedProfessionalInfo(
  file: ProfessionalInfoFile | undefined,
): boolean {
  if (!file?.profile_business?.length) return false;
  return file.profile_business.some((entry) => {
    const map = entry?.string_map_data;
    return map !== undefined && Object.keys(map).length > 0;
  });
}

type MonetizationEntry = {
  string_map_data?: {
    Decision?: { value?: string };
  };
};
type MonetizationFile = {
  monetization_eligibility?: MonetizationEntry[];
};

function hasMonetizationApproval(file: MonetizationFile | undefined): boolean {
  if (!file?.monetization_eligibility?.length) return false;
  return file.monetization_eligibility.some((entry) => {
    const decision = entry?.string_map_data?.Decision?.value?.toLowerCase();
    if (!decision) return false;
    return decision === "eligible" || decision === "approved";
  });
}
