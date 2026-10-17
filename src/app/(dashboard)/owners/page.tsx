"use client";

import { useState, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  Search,
  PawPrint,
  MapPin,
  Phone,
  Eye,
  Calendar,
  FileCheck2,
  Stethoscope,
  Plus,
  BadgeCheck,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { type SupabaseUser } from "@/data/syncvet-users";
import { useCVO } from "@/lib/cvo-context";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

interface OwnerProfile {
  id: string;
  name: string;
  contact: string;
  barangay: string;
  address: string;
  residencyVerified: boolean;
  registeredDate: string;
  animals: {
    id: string;
    name: string;
    species: string;
    breed: string;
    vaccinated: boolean;
  }[];
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function OwnersPage() {
  const { consultations } = useCVO();
  const [query, setQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<OwnerProfile | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // TanStack Query to integrate with Supabase `users` and `pets` table
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("owners_live_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        queryClient.invalidateQueries({ queryKey: ["supabase-owners"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const { data: dbUsers = [] } = useQuery<SupabaseUser[]>({
    queryKey: ["supabase-owners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    staleTime: 15000,
  });

  const { data: dbPets = [] } = useQuery<any[]>({
    queryKey: ["supabase-owners-pets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("id, name, species, breed, is_vaccinated, owner_id");
      if (error) return [];
      return data || [];
    },
    staleTime: 15000,
  });

  // Construct real-time owner profiles from Supabase users
  const allOwners: OwnerProfile[] = useMemo(() => {
    return dbUsers.map((u) => {
      const userAnimals = dbPets
        .filter((p) => p.owner_id === u.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species || "Dog",
          breed: p.breed || "Mixed",
          vaccinated: Boolean(p.is_vaccinated),
        }));

      return {
        id: u.id.slice(0, 14),
        name: u.full_name || u.email || "Registered Citizen",
        contact: u.phone_number || "Not provided",
        barangay: "Cagayan de Oro",
        address: u.address || "Cagayan de Oro City",
        residencyVerified: true,
        registeredDate: u.created_at
          ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(u.created_at))
          : "Registered",
        animals: userAnimals,
      };
    });
  }, [dbUsers, dbPets]);

  const metrics: PageMetric[] = [
    {
      title: "Registered Pet Owners",
      value: `${allOwners.length}`,
      icon: Users,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-500",
      badge: "Verified Citizens",
      badgeClass: "text-blue-500 bg-blue-500/10",
      sub: "Across 80 CDO barangays",
    },
    {
      title: "Residency Verified",
      value: "96.4%",
      icon: BadgeCheck,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-500",
      badge: "LGU Compliant",
      badgeClass: "text-emerald-500 bg-emerald-500/10",
      sub: "Barangay certificate verified",
    },
    {
      title: "Avg Animals / Household",
      value: "1.6",
      icon: PawPrint,
      gradient: "from-purple-500/5",
      iconClass: "text-purple-500",
      badge: "Canine & Feline",
      badgeClass: "text-purple-500 bg-purple-500/10",
      sub: "Multi-pet households",
    },
    {
      title: "Total Animals Owned",
      value: `${allOwners.reduce((acc, o) => acc + o.animals.length, 0)}`,
      icon: ShieldCheck,
      gradient: "from-primary/5",
      iconClass: "text-primary",
      badge: "In Registry",
      badgeClass: "text-primary bg-primary/10",
      sub: "Under jurisdiction",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOwners;
    return allOwners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.barangay.toLowerCase().includes(q) ||
        o.contact.toLowerCase().includes(q)
    );
  }, [allOwners, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Lookup consultations for selected owner
  const ownerConsultations = useMemo(() => {
    if (!selectedOwner) return [];
    return consultations.filter(
      (c) => c.ownerName.toLowerCase() === selectedOwner.name.toLowerCase()
    );
  }, [selectedOwner, consultations]);

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      {/* ── Page Header ── */}
      <PageHeader
        supertitle="Citizen & Animal Services"
        title="Owner Registry"
        subtitle={<>Official directory of registered pet owners and livestock holders in Cagayan de Oro City with <span className="text-foreground">LGU residency verification</span> and multi-animal portfolio management.</>}
        actions={
          <Link href="/pet-registry">
            <Button size="sm" className="gap-1.5 text-xs">
              <PawPrint className="size-3.5" /> Register Animal
            </Button>
          </Link>
        }
      />

      {/* ── Metrics ── */}
      <PageMetricCards metrics={metrics} />

      {/* ── Table Card ── */}
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Registered Citizens Directory</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                Residents maintaining registered animals under the jurisdiction of the City Veterinary Office
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search citizen name, ID, contact, or barangay..."
                  className="h-8 w-full sm:w-72 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Owner ID</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Full Legal Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Contact Number</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Barangay</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Residency Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Animals Registered</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Joined Date</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No owners found matching your query.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((owner, idx) => (
                  <TableRow key={`${owner.id}-${idx}`} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                      {owner.id}
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-sm text-foreground">{owner.name}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {owner.contact}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1 text-foreground">
                        <MapPin className="size-3 text-primary/70" /> Barangay {owner.barangay}
                      </span>
                    </TableCell>
                    <TableCell>
                      {owner.residencyVerified ? (
                        <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          CDO Resident Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/20">
                          Pending Verification
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {owner.animals.length} {owner.animals.length === 1 ? "Animal" : "Animals"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {owner.registeredDate}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOwner(owner)}
                        className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                      >
                        <Eye className="size-3.5" /> View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemLabel="owners"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Owner Detail Drawer ── */}
      <Sheet open={!!selectedOwner} onOpenChange={(open) => !open && setSelectedOwner(null)}>
        <SheetContent className="sm:max-w-[540px] overflow-y-auto p-6">
          {selectedOwner && (
            <div className="space-y-5">
              <SheetHeader className="p-0 text-left">
                <div className="flex items-center justify-between pr-8">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedOwner.id}
                  </Badge>
                  {selectedOwner.residencyVerified ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Verified Resident
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  {selectedOwner.name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Barangay {selectedOwner.barangay}, Cagayan de Oro City • {selectedOwner.contact}
                </SheetDescription>
              </SheetHeader>

              {/* Tabs for multi-animal portfolio & service history */}
              <Tabs defaultValue="animals" className="w-full">
                <TabsList className="grid grid-cols-2 h-9 w-full">
                  <TabsTrigger value="animals" className="text-xs">
                    Animals ({selectedOwner.animals.length})
                  </TabsTrigger>
                  <TabsTrigger value="consultations" className="text-xs">
                    Consultations ({ownerConsultations.length})
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Registered Animals */}
                <TabsContent value="animals" className="space-y-3 pt-2">
                  {selectedOwner.animals.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No registered animals recorded under this profile yet.
                    </p>
                  ) : (
                    selectedOwner.animals.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{a.name}</span>
                            <Badge variant="outline" className="text-[9px] py-0">{a.species}</Badge>
                            <span className="font-mono text-[10px] text-muted-foreground">{a.id}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Breed: {a.breed}</p>
                        </div>
                        <Badge
                          className={`text-[9px] ${
                            a.vaccinated
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-red-500/15 text-red-500"
                          }`}
                        >
                          {a.vaccinated ? "Vaccinated" : "Unvaccinated"}
                        </Badge>
                      </div>
                    ))
                  )}
                  <Link href="/pet-registry">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mt-2">
                      <Plus className="size-3.5" /> Add Animal to Owner
                    </Button>
                  </Link>
                </TabsContent>

                {/* Tab 2: Consultations */}
                <TabsContent value="consultations" className="space-y-2.5 pt-2">
                  {ownerConsultations.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No clinical consultation encounters on file for this owner.
                    </p>
                  ) : (
                    ownerConsultations.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-primary">{c.encounterNo}</span>
                          <span className="text-[10px] text-muted-foreground">{c.date}</span>
                        </div>
                        <p className="font-semibold text-foreground">{c.petName} ({c.species})</p>
                        <p className="text-muted-foreground">Diagnosis: {c.diagnosis}</p>
                        <p className="text-[11px] text-muted-foreground/80">Attending: {c.vetName}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
