"use client";

import { useState, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShieldCheck,
  Search,
  Settings2,
  Plus,
  ArrowDownToLine,
} from "lucide-react";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
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
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { AddBatchDialog } from "@/components/dashboard/add-batch-dialog";
import { useRef } from "react";

const metrics: PageMetric[] = [
  { title: "Total Stock (Doses)", value: "19,240", icon: Package, gradient: "from-indigo-500/5", iconClass: "text-indigo-400", badge: "Optimal Level", badgeClass: "text-emerald-400 bg-emerald-400/10", sub: "All vaccine types" },
  { title: "Adequate Stock", value: "12", icon: ShieldCheck, gradient: "from-emerald-500/5", iconClass: "text-emerald-400", badge: "Sufficient", badgeClass: "text-emerald-400 bg-emerald-400/10", sub: "Batches above reorder" },
  { title: "Low Stock Alerts", value: "3", icon: TrendingDown, gradient: "from-amber-500/5", iconClass: "text-amber-400", badge: "Reorder Soon", badgeClass: "text-amber-400 bg-amber-400/10", sub: "Below threshold" },
  { title: "Near Expiry", value: "2", icon: AlertTriangle, gradient: "from-red-500/5", iconClass: "text-red-400", badge: "Urgent", badgeClass: "text-red-400 bg-red-400/10", sub: "Expiring within 30 days" },
];

const allInventory = [
  { id: "INV-AR-001", vaccine: "Anti-Rabies (Canine)", batch: "AR-Q3-2026-014", stock: 4200, unit: "doses", reorder: 3000, expiry: "Dec 2026", storage: "CDO Central — Zone 1", status: "adequate" },
  { id: "INV-AR-002", vaccine: "Anti-Rabies (Feline)", batch: "AR-Q3-2026-015", stock: 1850, unit: "doses", reorder: 1500, expiry: "Nov 2026", storage: "CDO Central — Zone 1", status: "adequate" },
  { id: "INV-PV-001", vaccine: "Anti-Parvovirus", batch: "PV-Q2-2026-008", stock: 3100, unit: "doses", reorder: 2500, expiry: "Oct 2026", storage: "CDO Central — Zone 2", status: "adequate" },
  { id: "INV-DW-001", vaccine: "Deworming (Oral)", batch: "DW-Q2-2026-041", stock: 5200, unit: "tablets", reorder: 4000, expiry: "Sep 2026", storage: "CDO Central — Zone 3", status: "adequate" },
  { id: "INV-AR-003", vaccine: "Anti-Rabies (Canine)", batch: "AR-Q1-2026-007", stock: 420, unit: "doses", reorder: 3000, expiry: "Jun 2026", storage: "Brgy. Lapasan Satellite", status: "low" },
  { id: "INV-PV-002", vaccine: "Anti-Parvovirus", batch: "PV-Q1-2026-003", stock: 180, unit: "doses", reorder: 2500, expiry: "Jul 2026", storage: "Brgy. Bulua Satellite", status: "low" },
  { id: "INV-DW-002", vaccine: "Deworming (Oral)", batch: "DW-Q1-2026-019", stock: 340, unit: "tablets", reorder: 4000, expiry: "Jun 2026", storage: "Brgy. Carmen Satellite", status: "low" },
  { id: "INV-AR-004", vaccine: "Anti-Rabies (Canine)", batch: "AR-Q4-2025-022", stock: 90, unit: "doses", reorder: 3000, expiry: "May 30, 2026", storage: "CDO Central — Zone 1", status: "expiring" },
  { id: "INV-DW-003", vaccine: "Deworming (Injectable)", batch: "DI-Q4-2025-011", stock: 65, unit: "vials", reorder: 500, expiry: "May 28, 2026", storage: "CDO Central — Zone 3", status: "expiring" },
  { id: "INV-AR-005", vaccine: "Anti-Rabies (Canine)", batch: "AR-Q2-2026-010", stock: 2800, unit: "doses", reorder: 3000, expiry: "Aug 2026", storage: "CDO Central — Zone 1", status: "adequate" },
  { id: "INV-PV-003", vaccine: "Anti-Parvovirus", batch: "PV-Q2-2026-009", stock: 1200, unit: "doses", reorder: 2500, expiry: "Sep 2026", storage: "Brgy. Kauswagan Satellite", status: "low" },
];

function statusBadge(status: string) {
  switch (status) {
    case "adequate":
      return <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 text-[10px]">Adequate</Badge>;
    case "low":
      return <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 text-[10px]"><TrendingDown className="mr-1 size-3" />Low Stock</Badge>;
    case "expiring":
      return <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/25 text-[10px]"><AlertTriangle className="mr-1 size-3" />Near Expiry</Badge>;
    default:
      return null;
  }
}

export default function VaccineInventoryPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const columns = [
    { id: "id", label: "Batch ID" },
    { id: "vaccine", label: "Vaccine", required: true },
    { id: "batch", label: "Batch No." },
    { id: "stock", label: "In Stock" },
    { id: "reorder", label: "Reorder Level" },
    { id: "expiry", label: "Expiry" },
    { id: "storage", label: "Storage" },
    { id: "status", label: "Status" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allInventory;
    return allInventory.filter(
      (item) =>
        item.vaccine.toLowerCase().includes(q) ||
        item.batch.toLowerCase().includes(q) ||
        item.storage.toLowerCase().includes(q)
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
      loading: `Uploading manifest: ${file.name}...`,
      success: () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return "Upload processed";
      },
      error: "Error: Database synchronization failed. Manifest could not be processed.",
    });
    
    // Reset immediately so the user can select the same file again if needed,
    // though the promise is already running.
  };

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".csv,.xlsx,.pdf"
      />
      <PageHeader
        supertitle="Resource Planning Module"
        title="Vaccine Inventory"
        subtitle={<>Real-time stock management with <span className="text-foreground">expiry tracking</span>, <span className="text-foreground">batch traceability</span>, and automated reorder alerts.</>}
        actions={<>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <ArrowDownToLine className="size-3.5" /> Receive Stock
          </Button>
          <AddBatchDialog />
        </>}
      />
      <PageMetricCards metrics={metrics} />
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Stock Ledger</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/60">All vaccine batches across central storage and barangay satellite locations</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by vaccine or batch..." className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
              </div>
              <TableColumnFilter 
                columns={columns}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes("id") && <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Batch ID</TableHead>}
                {visibleColumns.includes("vaccine") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Vaccine</TableHead>}
                {visibleColumns.includes("batch") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Batch No.</TableHead>}
                {visibleColumns.includes("stock") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">In Stock</TableHead>}
                {visibleColumns.includes("reorder") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Reorder Level</TableHead>}
                {visibleColumns.includes("expiry") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Expiry</TableHead>}
                {visibleColumns.includes("storage") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Storage</TableHead>}
                {visibleColumns.includes("status") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={visibleColumns.length} className="py-8 text-center text-muted-foreground">No batches match your search.</TableCell></TableRow>
              ) : rows.map((item) => (
                <TableRow key={item.id} className={cn("hover:bg-muted/50", item.status === "expiring" && "bg-red-500/5")}>
                  {visibleColumns.includes("id") && <TableCell className="font-mono text-xs text-muted-foreground pl-6">{item.id}</TableCell>}
                  {visibleColumns.includes("vaccine") && <TableCell className="text-sm font-semibold">{item.vaccine}</TableCell>}
                  {visibleColumns.includes("batch") && <TableCell className="font-mono text-xs text-muted-foreground">{item.batch}</TableCell>}
                  {visibleColumns.includes("stock") && (
                    <TableCell>
                      <span className={cn("text-sm font-bold tabular-nums", item.status === "low" && "text-amber-500", item.status === "expiring" && "text-red-500")}>{item.stock.toLocaleString()}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">{item.unit}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes("reorder") && <TableCell className="text-xs tabular-nums text-muted-foreground">{item.reorder.toLocaleString()}</TableCell>}
                  {visibleColumns.includes("expiry") && <TableCell className={cn("text-xs", item.status === "expiring" && "font-semibold text-red-500")}>{item.expiry}</TableCell>}
                  {visibleColumns.includes("storage") && <TableCell className="text-xs text-muted-foreground">{item.storage}</TableCell>}
                  {visibleColumns.includes("status") && <TableCell>{statusBadge(item.status)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination page={safePage} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length} itemLabel="batches" onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
}
