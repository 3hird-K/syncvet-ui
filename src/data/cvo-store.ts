// City Veterinary Office (CVO) Cagayan de Oro Central Store & Types
// Provides unified government veterinary records, consultation EMR, health certificates,
// animal control cases, FEFO inventory, offline sync queue, and audit trail.

export interface CVOConsultation {
  id: string;
  encounterNo: string;
  petId: string;
  petName: string;
  species: "Dog" | "Cat" | "Livestock" | "Other";
  breed: string;
  ownerName: string;
  ownerContact: string;
  ownerBarangay: string;
  vetName: string;
  date: string;
  time: string;
  createdAt?: string;
  chiefComplaint: string;
  symptoms: string[];
  vitals: {
    weightKg: number;
    temperatureC: number;
    heartRateBpm?: number;
    mucousMembrane?: "Normal (Pink)" | "Pale" | "Congested" | "Jaundiced";
  };
  diagnosis: string;
  treatment: string;
  medication: string;
  dosageInstructions: string;
  followUpDate?: string;
  status: "waiting" | "in-consultation" | "treatment" | "completed";
  veterinarianNotes?: string;
  serviceType: "Free Consultation" | "Deworming Check" | "Bite Wound Care" | "General Checkup" | "Post-Op Evaluation" | "Field Treatment/Consultation";
  // Official CDO CVO Field Treatment / Consultation Form details
  noOfHeads?: number;
  dateOfBirth?: string;
  age?: string;
  gender?: "M" | "F";
  color?: string;
  weightAssessment?: "Ideal Weight" | "Overweight" | "Underweight";
  bodyConditionScore?: number; // 1-9
  servicesRequested?: {
    healthy?: boolean;
    vitamins?: boolean;
    deworming?: boolean;
    farmManagement?: boolean;
    consultation?: boolean;
  };
  clinicalSystems?: {
    mentation?: string[];
    eyes?: string[];
    ears?: string[];
    mouthTeethGums?: string[];
    skinCoat?: string[];
    neurologic?: string[];
    respiratoryLungs?: string[];
    cardiacHeart?: string[];
    gastrointestinal?: string[];
    abdomen?: string[];
    urogenital?: string[];
    musculoskeletal?: string[];
  };
  recommendations?: string;
  followUp?: boolean;
}

export interface CVOHealthCertificate {
  certificateNumber: string;
  qrCodeUrl: string;
  issueDate: string;
  validUntil: string;
  purpose: "Domestic Air/Sea Travel" | "Inter-Barangay Transport" | "General Health Declaration" | "Adoption Clearance";
  petId: string;
  petName: string;
  species: "Dog" | "Cat" | "Livestock";
  breed: string;
  sex: "Male" | "Female";
  age: string;
  color: string;
  microchipOrTag?: string;
  ownerName: string;
  ownerAddress: string;
  ownerBarangay: string;
  ownerContact: string;
  rabiesVaccination: {
    brand: string;
    batchNumber: string;
    dateGiven: string;
    validUntil: string;
    vaccinator: string;
  };
  findings: string;
  fitForTravel: boolean;
  issuingOffice: string;
  issuingVet: string;
  vetLicenseNo: string;
  vetPtrNo: string;
  status: "valid" | "expired" | "revoked";
}

export interface CVOAnimalControlCase {
  caseId: string;
  animalDescription: string;
  species: "Dog" | "Cat" | "Livestock";
  breedEstimate: string;
  color: string;
  estimatedAge: string;
  gender: "Male" | "Female" | "Unknown";
  dateCaptured: string;
  captureTime: string;
  barangay: string;
  specificLocation: string;
  reason: "Stray Roaming" | "Rabies Observation (Bite Incident)" | "Animal Cruelty Rescue" | "Public Safety Complaint";
  impoundingFacility: string;
  intakeOfficer: string;
  status: "impounded" | "claimed" | "released" | "adopted" | "closed";
  holdingDaysElapsed: number;
  maxHoldingDays: number;
  ownerClaimant?: {
    name: string;
    contact: string;
    claimDate: string;
    penaltyFeePaid?: boolean;
    orNumber?: string;
  };
  timeline: {
    timestamp: string;
    stage: string;
    officer: string;
    notes: string;
  }[];
}

export interface CVOOfflineVaccinationRecord {
  id: string;
  activityId: string;
  activityTitle: string;
  barangay: string;
  ownerName: string;
  ownerContact: string;
  petName: string;
  species: "Dog" | "Cat";
  breed: string;
  sex: "Male" | "Female";
  vaccineBrand: string;
  batchNumber: string;
  administeredDate: string;
  nextDueDate: string;
  vaccinatorName: string;
  syncStatus: "synced" | "pending" | "failed";
  timestamp: string;
}

export interface CVOInventoryItem {
  id: string;
  name: string;
  category: "Vaccines" | "Medicines" | "Medical Supplies" | "Surgical Supplies" | "Equipment";
  batchNumber: string;
  manufacturer: string;
  stock: number;
  unit: "doses" | "vials" | "tablets" | "boxes" | "units";
  minimumStock: number;
  expirationDate: string;
  daysToExpiry: number;
  storageLocation: string;
  status: "in-stock" | "low-stock" | "expiring-soon" | "expired";
  fefoPriority: number; // 1 = highest priority (nearest expiry)
}

export interface CVOAuditLog {
  id: string;
  timestamp: string;
  createdAt?: string;
  user: string;
  role: string;
  action: string;
  entity: string;
  recordId: string;
  details: string;
}

export interface CVOFieldOperation {
  id: string;
  opId: string;
  barangay: string;
  type: string;
  lead: string;
  date: string;
  petsTarget: number;
  petsVaccinated: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  notes?: string;
}

// Clean production defaults with official sample matching CVO Consultation form
export const initialConsultations: CVOConsultation[] = [
  {
    id: "cvo-consult-001",
    encounterNo: "CVO-2026-0042",
    petId: "pet-bingo-01",
    petName: "Bingo",
    species: "Dog",
    breed: "Aspin (Mixed)",
    ownerName: "Marie Basala",
    ownerContact: "09456430090",
    ownerBarangay: "Puntod",
    vetName: "Dr. Helen Ann P. Tacandong, DVM",
    date: "2026-10-14",
    time: "09:30 AM",
    chiefComplaint: "General health examination, routine deworming, and vitamin supplementation check.",
    symptoms: ["Healthy / Routine Checkup", "Mild Tartar"],
    vitals: {
      weightKg: 12.4,
      temperatureC: 38.6,
      heartRateBpm: 110,
      mucousMembrane: "Normal (Pink)",
    },
    diagnosis: "Clinically Healthy Canine. Mild dental calculus stage 1.",
    treatment: "Administered Multivitamins + Iron SQ (2ml). Oral Pyrantel Pamoate deworming tablet given.",
    medication: "Oral Vitamin syrup (Pet-Tabs) 5ml once daily x 14 days",
    dosageInstructions: "Give 5ml daily after morning feeding. Ensure fresh water is always available.",
    followUpDate: "2026-11-14",
    status: "completed",
    veterinarianNotes: "Patient is active and responsive. Body condition score is ideal (5/9). Stool exam negative for heavy parasites.",
    serviceType: "Field Treatment/Consultation",
    noOfHeads: 1,
    dateOfBirth: "Feb 3, 2024",
    age: "2",
    gender: "M",
    color: "Brown & White",
    weightAssessment: "Ideal Weight",
    bodyConditionScore: 5,
    servicesRequested: {
      healthy: true,
      vitamins: true,
      deworming: true,
      farmManagement: false,
      consultation: true,
    },
    clinicalSystems: {
      mentation: ["BAR / QAR"],
      eyes: ["Appear Normal"],
      ears: ["Appear Normal"],
      mouthTeethGums: ["Calculus: mild"],
      skinCoat: ["Appear Normal"],
      neurologic: ["Appear Normal"],
      respiratoryLungs: ["Appear Normal"],
      cardiacHeart: ["Appear Normal"],
      gastrointestinal: ["Appear Normal"],
      abdomen: ["Appear Normal"],
      urogenital: ["Appear Normal"],
      musculoskeletal: ["Appear Normal"],
    },
    recommendations: "Maintain oral hygiene with dental chew bones. Annual rabies booster scheduled next month.",
    followUp: true,
  },
];
export const initialCertificates: CVOHealthCertificate[] = [];
export const initialAnimalControlCases: CVOAnimalControlCase[] = [];
export const initialFEFOInventory: CVOInventoryItem[] = [];
export const initialFieldOperations: CVOFieldOperation[] = [];
export const initialAuditLogs: CVOAuditLog[] = [];

export const cvoBarangays = [
  "Agusan",
  "Baikingon",
  "Balubal",
  "Balulang",
  "Barangay 1",
  "Barangay 2",
  "Barangay 3",
  "Barangay 4",
  "Barangay 5",
  "Barangay 6",
  "Barangay 7",
  "Barangay 8",
  "Barangay 9",
  "Barangay 10",
  "Barangay 11",
  "Barangay 12",
  "Barangay 13",
  "Barangay 14",
  "Barangay 15",
  "Barangay 16",
  "Barangay 17",
  "Barangay 18",
  "Barangay 19",
  "Barangay 20",
  "Barangay 21",
  "Barangay 22",
  "Barangay 23",
  "Barangay 24",
  "Barangay 25",
  "Barangay 26",
  "Barangay 27",
  "Barangay 28",
  "Barangay 29",
  "Barangay 30",
  "Barangay 31",
  "Barangay 32",
  "Barangay 33",
  "Barangay 34",
  "Barangay 35",
  "Barangay 36",
  "Barangay 37",
  "Barangay 38",
  "Barangay 39",
  "Barangay 40",
  "Bayabas",
  "Bayanga",
  "Besigan",
  "Bonbon",
  "Bugo",
  "Bulua",
  "Camaman-an",
  "Canitoan",
  "Carmen",
  "Consolacion",
  "Cugman",
  "Dansolihon",
  "F.S. Catanico",
  "Gusa",
  "Indahag",
  "Iponan",
  "Kauswagan",
  "Lapasan",
  "Lumbia",
  "Macabalan",
  "Macasandig",
  "Mambuaya",
  "Nazareth",
  "Pagalungan",
  "Pagatpat",
  "Patag",
  "Pigcarangan",
  "Puerto",
  "Puntod",
  "San Simon",
  "Tablon",
  "Taglimao",
  "Tagpangi",
  "Tignapoloan",
  "Tuburan",
  "Tumpagon",
] as const;

/**
 * Checks if a consultation has already been reviewed, modified, or replied to by a veterinarian.
 * If true, pet owners cannot delete the consultation as it represents an official clinical encounter record.
 */
export function isConsultationLockedByVet(c: Partial<CVOConsultation> | null | undefined): boolean {
  if (!c) return false;
  if (c.status && c.status !== "waiting") return true;
  if (c.diagnosis && c.diagnosis.trim().length > 0) return true;
  if (c.treatment && c.treatment.trim().length > 0) return true;
  if (c.medication && c.medication.trim().length > 0) return true;
  if (c.veterinarianNotes && c.veterinarianNotes.trim().length > 0) return true;
  if (
    c.vetName &&
    c.vetName.trim().length > 0 &&
    !c.vetName.toLowerCase().includes("pending") &&
    !c.vetName.toLowerCase().includes("unassigned")
  ) {
    return true;
  }
  return false;
}

