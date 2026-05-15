import {
  PawPrint,
  Dog,
  Cat,
  QrCode,
  Search,
  Plus,
  Filter,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";

export const metadata = {
  title: "Pet Registry — SyncVet",
  description:
    "City-wide animal registry with QR-coded digital health passports for the CDO Veterinary Office.",
};

const metrics: PageMetric[] = [
  {
    title: "Total Registered",
    value: "12,842",
    icon: PawPrint,
    gradient: "from-indigo-500/5",
    iconClass: "text-indigo-400",
    badge: "CDO District",
    badgeClass: "text-indigo-400 bg-indigo-400/10",
    sub: "Dogs & cats combined",
  },
  {
    title: "Dogs",
    value: "8,614",
    icon: Dog,
    gradient: "from-amber-500/5",
    iconClass: "text-amber-400",
    badge: "67% of Registry",
    badgeClass: "text-amber-400 bg-amber-400/10",
    sub: "All breeds & Aspins",
  },
  {
    title: "Cats",
    value: "4,228",
    icon: Cat,
    gradient: "from-blue-500/5",
    iconClass: "text-blue-400",
    badge: "33% of Registry",
    badgeClass: "text-blue-400 bg-blue-400/10",
    sub: "All breeds & Puspins",
  },
  {
    title: "QR Passports Issued",
    value: "11,390",
    icon: QrCode,
    gradient: "from-emerald-500/5",
    iconClass: "text-emerald-400",
    badge: "89% Coverage",
    badgeClass: "text-emerald-400 bg-emerald-400/10",
    sub: "Digital health records",
  },
];

const pets = [
  { id: "CDO-2026-00142", name: "Bantay", species: "Dog", breed: "Aspin (Mixed)", owner: "Maria Santos", barangay: "Lapasan", vaccinated: true, qr: true },
  { id: "CDO-2026-00141", name: "Muning", species: "Cat", breed: "Puspin (Mixed)", owner: "Juan Dela Cruz", barangay: "Carmen", vaccinated: true, qr: true },
  { id: "CDO-2026-00140", name: "Brownie", species: "Dog", breed: "Labrador Mix", owner: "Elena Velez", barangay: "Bulua", vaccinated: false, qr: false },
  { id: "CDO-2026-00139", name: "Mingming", species: "Cat", breed: "Siamese Mix", owner: "Mark Ramos", barangay: "Kauswagan", vaccinated: true, qr: true },
  { id: "CDO-2026-00138", name: "Rocky", species: "Dog", breed: "Aspin (Mixed)", owner: "Grace Tan", barangay: "Macasandig", vaccinated: true, qr: true },
  { id: "CDO-2026-00137", name: "Tiger", species: "Cat", breed: "Tabby", owner: "Paolo Chen", barangay: "Gusa", vaccinated: false, qr: false },
  { id: "CDO-2026-00136", name: "Princess", species: "Dog", breed: "Shih Tzu", owner: "Donna Cruz", barangay: "Patag", vaccinated: true, qr: true },
  { id: "CDO-2026-00135", name: "Blackie", species: "Dog", breed: "Aspin (Mixed)", owner: "Roberto Lim", barangay: "Iponan", vaccinated: true, qr: true },
];

export default function PetRegistryPage() {
  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Animal Health Module"
        title="Pet Registry"
        subtitle={
          <>
            City-wide animal registration database with{" "}
            <span className="text-foreground">QR-coded digital health passports</span>{" "}
            for the CDO Veterinary Office.
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Download className="size-3.5" /> Export CSV
            </Button>
            <Button size="sm" className="gap-2 text-xs">
              <Plus className="size-3.5" /> Register Pet
            </Button>
          </>
        }
      />

      <PageMetricCards metrics={metrics} />

      {/* ── Table ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Registered Animals</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/60">
                All pets registered under the CDO Veterinary Office jurisdiction
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name, ID, or owner..." className="h-8 w-64 pl-8 text-xs" />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="size-3" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Pet ID</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Species</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Breed</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Owner</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Barangay</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Vaccinated</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">QR Passport</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pets.map((pet) => (
                <TableRow key={pet.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{pet.id}</TableCell>
                  <TableCell className="text-sm font-semibold">{pet.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {pet.species === "Dog" ? "🐕" : "🐈"} {pet.species}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{pet.breed}</TableCell>
                  <TableCell className="text-xs">{pet.owner}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{pet.barangay}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px]", pet.vaccinated ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-red-500/15 text-red-500 hover:bg-red-500/25")}>
                      {pet.vaccinated ? "Vaccinated" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pet.qr ? (
                      <QrCode className="size-4 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
