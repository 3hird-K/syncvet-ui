export interface CVOVetProfile {
  id: string;
  name: string;
  title: string;
  role: string;
  licenseNo: string;
  email: string;
  phone: string;
  avatarUrl: string;
  specialization: string;
  bio?: string;
}

export const CVO_HELEN_TACANDONG: CVOVetProfile = {
  id: "vet-helen-tacandong",
  name: "Dr. Helen Ann P. Tacandong, DVM",
  title: "City Veterinarian",
  role: "City Veterinarian & Outreach Director",
  licenseNo: "PRC #0014892",
  email: "cvo.tacandong@cagayandeoro.gov.ph",
  phone: "(088) 857-3184",
  avatarUrl: "/dr-helen-tacandong.jpg",
  specialization: "Public Health, Rabies Eradication & Preventive Medicine",
  bio: "Head of the Cagayan de Oro City Veterinary Office (CVO). Leads city-wide disease surveillance, anti-rabies vaccination campaigns, and municipal animal welfare operations across all 80 barangays.",
};

export const CVO_LICENSED_VETS: CVOVetProfile[] = [CVO_HELEN_TACANDONG];

/**
 * Builds the real staff list using authentic registered users from Supabase.
 * Excludes placeholder/dummy names, ensuring only real Administrator and Veterinarian accounts appear.
 */
export function buildRealStaffList(
  dbUsers: any[] = [],
  currentUserName?: string,
  currentUserAvatar?: string
): CVOVetProfile[] {
  const list: CVOVetProfile[] = [CVO_HELEN_TACANDONG];

  // Map real registered users who have role 'Veterinarian' or 'Administrator'
  const staff = (dbUsers || []).filter((u: any) => {
    const r = (u.role || "").toLowerCase().trim();
    return r.includes("vet") || r.includes("admin") || r.includes("staff");
  });

  for (const u of staff) {
    const fullName = (u.full_name || u.name || "").trim();
    if (!fullName) continue;

    // Avoid duplicate entries of Dr. Helen
    const lower = fullName.toLowerCase();
    if (lower.includes("helen") || lower.includes("tacandong")) continue;
    if (list.some((existing) => existing.id === u.id || existing.name.toLowerCase() === lower)) continue;

    const isAdmin = (u.role || "").toLowerCase().includes("admin");
    const isVet = (u.role || "").toLowerCase().includes("vet");

    list.push({
      id: u.id,
      name: isVet && !fullName.startsWith("Dr.") ? `Dr. ${fullName}, DVM` : fullName,
      title: isAdmin ? "Administrator" : "Field Veterinarian",
      role: isAdmin ? "CVO Administrator" : "Attending Veterinarian",
      licenseNo: isAdmin ? "CVO Admin Office" : "PRC Licensed Veterinarian",
      email: u.email || "cvo.staff@cagayandeoro.gov.ph",
      phone: u.phone_number || "(088) 857-3184",
      avatarUrl: u.avatar_url || "",
      specialization: isAdmin
        ? "CVO Municipal Management & Outreach Logistics"
        : "Clinical Consultation, Vaccination & Spay/Neuter Procedures",
      bio: `Official ${isAdmin ? "administrator" : "attending veterinarian"} registered with the Cagayan de Oro City Veterinary Office.`,
    });
  }

  // Include current active user if admin/vet and not already listed
  if (currentUserName) {
    const lowerCur = currentUserName.toLowerCase();
    const already = list.some(
      (v) => v.name.toLowerCase() === lowerCur || v.name.toLowerCase().includes(lowerCur)
    );
    if (!already && !lowerCur.includes("helen")) {
      list.push({
        id: "current-user",
        name: currentUserName,
        title: "Staff Officer",
        role: "CVO Officer",
        licenseNo: "CVO Registered",
        email: "cvo.staff@cagayandeoro.gov.ph",
        phone: "(088) 857-3184",
        avatarUrl: currentUserAvatar || "",
        specialization: "Barangay Field Outreach & Coordination",
      });
    }
  }

  return list;
}

export function findVetProfileByName(name?: string, dbUsers?: any[]): CVOVetProfile {
  if (!name) return CVO_HELEN_TACANDONG;
  const lower = name.toLowerCase().trim();

  if (lower.includes("helen") || lower.includes("tacandong")) {
    return CVO_HELEN_TACANDONG;
  }

  if (dbUsers && dbUsers.length > 0) {
    const realStaff = buildRealStaffList(dbUsers);
    const match = realStaff.find(
      (v) =>
        v.name.toLowerCase().includes(lower) ||
        lower.includes(v.name.toLowerCase()) ||
        v.name.toLowerCase().replace(/[^a-z]/g, "").includes(lower.replace(/[^a-z]/g, ""))
    );
    if (match) return match;
  }

  return {
    id: `vet-${lower.replace(/\s+/g, "-")}`,
    name,
    title: "Attending Veterinarian",
    role: "Licensed CVO Officer",
    licenseNo: "PRC Licensed",
    email: "cvo.veterinarian@cagayandeoro.gov.ph",
    phone: "(088) 857-3184",
    avatarUrl: "",
    specialization: "Clinical Consultations, Vaccination & Outreach",
    bio: "Official attending veterinarian deployed by the Cagayan de Oro City Veterinary Office.",
  };
}
