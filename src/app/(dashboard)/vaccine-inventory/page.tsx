"use client";

import { useState, useMemo, useRef } from "react";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShieldCheck,
  Search,
  ArrowDownToLine,
  ArrowUpDown,
  Filter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { AddBatchDialog } from "@/components/dashboard/add-batch-dialog";
import { useCVO } from "@/lib/cvo-context";

export default function VaccineInventoryPage() {
  const { inventory } = useCVO();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fefoSort, setFefoSort] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalDoses = useMemo(() => inventory.reduce((sum, i) => sum + i.stock, 0), [inventory]);
  const adequateCount = useMemo(() => inventory.filter((i) => i.status === "in-stock").length, [inventory]);
  const lowStockCount = useMemo(() => inventory.filter((i) => i.status === "low-stock").length, [inventory]);
  const nearExpiryCount = useMemo(
    () => inventory.filter((i) => i.status === "expiring-soon" || i.status === "expired").length,
    [inventory]
  );

  const metrics: PageMetric[] = useMemo(() => [
    {
      title: "Total Stock (Units/Doses)",
      value: `${totalDoses.toLocaleString()}`,
      icon: Package,
      gradient: "from-indigo-500/5",
      iconClass: "text-indigo-400",
      badge: totalDoses > 0 ? "Live Cold-Chain" : "No Inventory Logged",
      badgeClass: totalDoses > 0 ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10",
      sub: "Central storage count",
    },
    {
      title: "Adequate Stock",
      value: `${adequateCount}`,
      icon: ShieldCheck,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-400",
      badge: "Sufficient",
      badgeClass: "text-emerald-400 bg-emerald-400/10",
      sub: "Batches above reorder threshold",
    },
    {
      title: "Low Stock Alerts",
      value: `${lowStockCount}`,
      icon: TrendingDown,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-400",
      badge: lowStockCount > 0 ? "Reorder Soon" : "Levels Healthy",
      badgeClass: lowStockCount > 0 ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10",
      sub: "Below minimum stock",
    },
    {
      title: "FEFO Near Expiry",
      value: `${nearExpiryCount}`,
      icon: AlertTriangle,
      gradient: "from-red-500/5",
      iconClass: "text-red-400",
      badge: nearExpiryCount > 0 ? "Prioritize First" : "Zero Expired",
      badgeClass: nearExpiryCount > 0 ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10",
      sub: "First-Expired, First-Out queue",
    },
  ], [totalDoses, adequateCount, lowStockCount, nearExpiryCount]);


  const columns = [
    { id: "batch", label: "Batch No." },
    { id: "name", label: "Item / Vaccine Name", required: true },
    { id: "category", label: "Category" },
    { id: "stock", label: "In Stock" },
    { id: "min", label: "Min Stock" },
    { id: "expiry", label: "Expiry Date" },
    { id: "storage", label: "Storage Location" },
    { id: "status", label: "FEFO Status" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    let list = [...inventory];

    if (categoryFilter !== "all") {
      list = list.filter((i) => i.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.batchNumber.toLowerCase().includes(q) ||
          i.storageLocation.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    if (fefoSort) {
      list.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    }

    return list;
  }, [inventory, query, categoryFilter, fefoSort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: `Ingesting municipal stock manifest: ${file.name}...`,
      success: () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return "Stock manifest ingested into CVO central storage.";
      },
      error: "Error processing manifest.",
    });
  };

  const getStatusBadge = (status: string, daysToExpiry: number) => {
    if (daysToExpiry <= 30) {
      return (
        <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/25 text-[10px]">
          <AlertTriangle className="mr-1 size-3" /> Expiring ({daysToExpiry}d)
        </Badge>
      );
    }
    if (status === "low-stock") {
      return (
        <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 text-[10px]">
          <TrendingDown className="mr-1 size-3" /> Low Stock
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 text-[10px]">
        Adequate
      </Badge>
    );
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
        supertitle="Resource Planning & Logistics"
        title="Vaccine & Medicine Inventory"
        subtitle={
          <>
            Government cold-chain management with <span className="text-foreground">FEFO (First-Expire, First-Out)</span> prioritization, batch traceability, and automated reorder triggers.
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ArrowDownToLine className="size-3.5" /> Receive Stock Manifest
            </Button>
            <AddBatchDialog />
          </>
        }
      />

      <PageMetricCards metrics={metrics} />

      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Government Stock Ledger</CardTitle>
                <Badge
                  variant="outline"
                  onClick={() => setFefoSort(!fefoSort)}
                  className={cn(
                    "cursor-pointer text-[10px] gap-1 transition-colors",
                    fefoSort
                      ? "border-primary text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                >
                  <ArrowUpDown className="size-3" />
                  FEFO Priority: {fefoSort ? "Active (Nearest Expiry)" : "Standard"}
                </Badge>
              </div>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                All vaccine batches, medical supplies, and anesthetics across CVO central cold-chain storage and satellite barangay refrigerators
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search item, lot, or storage..."
                  className="h-8 w-full sm:w-60 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs bg-muted/20">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Vaccines">Vaccines</SelectItem>
                  <SelectItem value="Medicines">Medicines</SelectItem>
                  <SelectItem value="Surgical Supplies">Surgical Supplies</SelectItem>
                  <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                </SelectContent>
              </Select>

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
                {visibleColumns.includes("batch") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">
                    Batch / Lot No.
                  </TableHead>
                )}
                {visibleColumns.includes("name") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Item Name
                  </TableHead>
                )}
                {visibleColumns.includes("category") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Category
                  </TableHead>
                )}
                {visibleColumns.includes("stock") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    In Stock
                  </TableHead>
                )}
                {visibleColumns.includes("min") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Minimum Buffer
                  </TableHead>
                )}
                {visibleColumns.includes("expiry") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Expiry (FEFO)
                  </TableHead>
                )}
                {visibleColumns.includes("storage") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Cold-Chain Storage Location
                  </TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">
                    Status
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No inventory records match your query.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item, idx) => (
                  <TableRow key={`${item.id}-${idx}`} className="hover:bg-muted/50">
                    {visibleColumns.includes("batch") && (
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                        {item.batchNumber}
                      </TableCell>
                    )}
                    {visibleColumns.includes("name") && (
                      <TableCell>
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.manufacturer}</p>
                      </TableCell>
                    )}
                    {visibleColumns.includes("category") && (
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.category}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("stock") && (
                      <TableCell className="font-bold text-sm text-foreground">
                        {item.stock} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("min") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {item.minimumStock} {item.unit}
                      </TableCell>
                    )}
                    {visibleColumns.includes("expiry") && (
                      <TableCell className="text-xs">
                        <span className="font-semibold text-foreground">{item.expirationDate}</span>
                        <p className="text-[10px] text-muted-foreground">
                          {item.daysToExpiry > 0 ? `${item.daysToExpiry} days remaining` : "Expired"}
                        </p>
                      </TableCell>
                    )}
                    {visibleColumns.includes("storage") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {item.storageLocation}
                      </TableCell>
                    )}
                    {visibleColumns.includes("status") && (
                      <TableCell className="text-right pr-6">
                        {getStatusBadge(item.status, item.daysToExpiry)}
                      </TableCell>
                    )}
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
            itemLabel="items"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
