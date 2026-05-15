/**
 * Mock directory data for SyncVet — animal health management with predictive
 * resource forecasting for the Cagayan de Oro City Veterinary Office.
 * (Thesis scope; replace with API data when backend is available.)
 */
export type SyncVetRole =
  | "administrator"
  | "veterinarian"
  | "field_officer"
  | "pet_owner"
  | "resource_manager";

export interface SyncVetUser {
  id: string;
  fullName: string;
  email: string;
  role: SyncVetRole;
  initials: string;
  avatarClass: string;
  online?: boolean;
  /** Optional: vets linked to forecast workflows in the study */
  pendingForecasts?: number;
}

export const SYNCVET_USERS: SyncVetUser[] = [
  {
    id: "USER_3D5BACF2A891C4E7",
    fullName: "Dr. Maria Santos",
    email: "m.santos@cdovet.gov.ph",
    role: "administrator",
    initials: "MS",
    avatarClass: "bg-gradient-to-br from-orange-600 to-amber-700",
    online: true,
  },
  {
    id: "USER_7F2A91B3E804D62C",
    fullName: "Dr. James Reyes",
    email: "j.reyes@cdovet.gov.ph",
    role: "veterinarian",
    initials: "JR",
    avatarClass: "bg-blue-700",
    pendingForecasts: 2,
  },
  {
    id: "USER_A91C44E7F203B18D",
    fullName: "Ana Lim",
    email: "a.lim@cdovet.gov.ph",
    role: "field_officer",
    initials: "AL",
    avatarClass: "bg-emerald-700",
  },
  {
    id: "USER_B204D18C9E7F62A1",
    fullName: "Dr. Carlo Bautista",
    email: "c.bautista@cdovet.gov.ph",
    role: "veterinarian",
    initials: "CB",
    avatarClass: "bg-cyan-700",
    pendingForecasts: 1,
  },
  {
    id: "USER_C318E29D0F8A73B2",
    fullName: "Sofia Cruz",
    email: "sofia.cruz@email.com",
    role: "pet_owner",
    initials: "SC",
    avatarClass: "bg-pink-700",
  },
  {
    id: "USER_D429F30E1A9B84C3",
    fullName: "Miguel Ortiz",
    email: "m.ortiz@cdovet.gov.ph",
    role: "resource_manager",
    initials: "MO",
    avatarClass: "bg-violet-700",
  },
  {
    id: "USER_E53A041F2BAC95D4",
    fullName: "Dr. Elena Gomez",
    email: "e.gomez@cdovet.gov.ph",
    role: "veterinarian",
    initials: "EG",
    avatarClass: "bg-teal-700",
  },
  {
    id: "USER_F64B15203CBD06E5",
    fullName: "Rico Tan",
    email: "r.tan@cdovet.gov.ph",
    role: "field_officer",
    initials: "RT",
    avatarClass: "bg-lime-800",
  },
  {
    id: "USER_075C26314DCE17F6",
    fullName: "Patricia Dela Rosa",
    email: "patty.delarosa@email.com",
    role: "pet_owner",
    initials: "PD",
    avatarClass: "bg-rose-700",
  },
  {
    id: "USER_186D37425EDF28A7",
    fullName: "Dr. Norman Chu",
    email: "n.chu@cdovet.gov.ph",
    role: "veterinarian",
    initials: "NC",
    avatarClass: "bg-indigo-700",
    online: true,
  },
  {
    id: "USER_297E48536FEB39C8",
    fullName: "Liza Fernandez",
    email: "liza.f@email.com",
    role: "pet_owner",
    initials: "LF",
    avatarClass: "bg-fuchsia-700",
  },
  {
    id: "USER_3A8F59647AFE40E9",
    fullName: "Aaron Villarin",
    email: "a.villarin@cdovet.gov.ph",
    role: "field_officer",
    initials: "AV",
    avatarClass: "bg-amber-800",
  },
];

const ROLE_LABEL: Record<SyncVetRole, string> = {
  administrator: "ADMINISTRATOR",
  veterinarian: "VETERINARIAN",
  field_officer: "FIELD OFFICER",
  pet_owner: "PET OWNER",
  resource_manager: "RESOURCE MANAGER",
};

export function formatRoleLabel(role: SyncVetRole): string {
  return ROLE_LABEL[role];
}

export function syncVetUserStats(users: SyncVetUser[]) {
  const total = users.length;
  const admins = users.filter((u) => u.role === "administrator").length;
  const veterinarians = users.filter((u) => u.role === "veterinarian").length;
  const online = users.filter((u) => u.online).length;
  return { total, admins, veterinarians, online };
}
