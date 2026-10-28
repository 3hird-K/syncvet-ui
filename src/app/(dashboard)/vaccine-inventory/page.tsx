"use client";

import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShieldCheck,
  ArrowUpDown,
  Pencil,
  Trash2,
  Search,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { AddBatchDialog } from "@/components/dashboard/add-batch-dialog";
import { DeleteBatchDialog } from "@/components/dashboard/delete-batch-dialog";
import { useCVO } from "@/lib/cvo-context";
import type { CVOInventoryItem } from "@/data/cvo-store";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const CATEGORIES = ["Vaccines", "Medicines", "Surgical Supplies", "Medical Supplies"] as const;

const STORAGE_LOCATIONS = [
  "Main Vaccine Refrigerator (2°C – 8°C)",
  "Medicine & Pharmacy Cabinet",
  "Medical & Surgical Supply Shelf",
];

const UNITS = ["doses", "vials", "units", "boxes"] as const;

export default function VaccineInventoryPage() {
  const { inventory, updateInventoryBatch, addAuditLog } = useCVO();
  const effectiveInventory = inventory;
  const queryClient = useQueryClient();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // Realtime subscription to live sync inventory whenever doses are deducted or added
  useEffect(() => {
    const channel = supabase
      .channel("vaccine-inventory-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vaccination_records" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fefoSort, setFefoSort] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBatch, setSelectedBatch] = useState<CVOInventoryItem | null>(null);

  // Edit State for the Right Sidebar Drawer
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<string>("Vaccines");
  const [editBatchNumber, setEditBatchNumber] = useState("");
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editStock, setEditStock] = useState("100");
  const [editUnit, setEditUnit] = useState<string>("doses");
  const [editMinimumStock, setEditMinimumStock] = useState("25");
  const [editExpiry, setEditExpiry] = useState<Date | undefined>();
  const [editStorageLocation, setEditStorageLocation] = useState(STORAGE_LOCATIONS[0]);
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete state
  const [batchToDelete, setBatchToDelete] = useState<CVOInventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Automatically populate and enter edit state whenever a row is clicked
  useEffect(() => {
    if (selectedBatch) {
      setEditName(selectedBatch.name || "");
      setEditCategory(selectedBatch.category || "Vaccines");
      setEditBatchNumber(selectedBatch.batchNumber || "");
      setEditManufacturer(selectedBatch.manufacturer || "");
      setEditStock(String(selectedBatch.stock ?? 0));
      setEditUnit(selectedBatch.unit || "doses");
      setEditMinimumStock(String(selectedBatch.minimumStock ?? 25));
      setEditStorageLocation(selectedBatch.storageLocation || STORAGE_LOCATIONS[0]);

      if (selectedBatch.expirationDate) {
        try {
          setEditExpiry(parseISO(selectedBatch.expirationDate));
        } catch {
          setEditExpiry(new Date(selectedBatch.expirationDate));
        }
      }
    }
  }, [selectedBatch]);

  const currentExpiryDays = useMemo(() => {
    if (!editExpiry) return 0;
    const diffTime = editExpiry.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [editExpiry]);

  const handleSaveEdit = async () => {
    if (!selectedBatch) return;

    if (!editName.trim()) {
      toast.error("Item name is required.");
      return;
    }

    if (!editBatchNumber.trim()) {
      toast.error("Batch/Lot number is required.");
      return;
    }

    if (!editExpiry) {
      toast.error("Please pick an expiration date for FEFO tracking.");
      return;
    }

    const stockNum = Math.max(0, parseInt(editStock) || 0);
    const minStockNum = Math.max(0, parseInt(editMinimumStock) || 0);
    const formattedExpiry = format(editExpiry, "yyyy-MM-dd");

    setSaveLoading(true);

    try {
      const updates: Partial<CVOInventoryItem> = {
        name: editName.trim(),
        category: editCategory as any,
        batchNumber: editBatchNumber.trim().toUpperCase(),
        manufacturer: editManufacturer.trim(),
        stock: stockNum,
        unit: editUnit as any,
        minimumStock: minStockNum,
        expirationDate: formattedExpiry,
        storageLocation: editStorageLocation,
      };

      const success = await updateInventoryBatch(selectedBatch.id || selectedBatch.batchNumber, updates);

      if (success) {
        addAuditLog({
          user: "CVO Logistics Officer",
          role: "Administrator",
          action: "Updated Inventory Batch",
          entity: "Inventory",
          recordId: editBatchNumber.trim().toUpperCase(),
          details: `Updated batch ${editBatchNumber.trim().toUpperCase()} (${editName.trim()}). Stock: ${stockNum} ${editUnit}, Expiry: ${formattedExpiry}.`,
        });

        toast.success("Batch Updated Successfully", {
          description: `${editName.trim()} (Lot #${editBatchNumber.trim().toUpperCase()}) updated in FEFO ledger.`,
        });

        setSelectedBatch((prev) => (prev ? ({ ...prev, ...updates } as CVOInventoryItem) : null));
      } else {
        toast.error("Failed to update batch. Please check your connection.");
      }
    } catch {
      toast.error("An error occurred while updating the batch.");
    } finally {
      setSaveLoading(false);
    }
  };

  const totalDoses = useMemo(() => effectiveInventory.reduce((sum, i) => sum + i.stock, 0), [effectiveInventory]);
  const adequateCount = useMemo(() => effectiveInventory.filter((i) => i.status === "in-stock").length, [effectiveInventory]);
  const lowStockCount = useMemo(() => effectiveInventory.filter((i) => i.status === "low-stock").length, [effectiveInventory]);
  const nearExpiryCount = useMemo(
    () => effectiveInventory.filter((i) => i.status === "expiring-soon" || i.daysToExpiry <= 180).length,
    [effectiveInventory]
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
      badge: totalDoses === 0 ? "No Batches" : "Sufficient",
      badgeClass: totalDoses === 0 ? "text-muted-foreground bg-muted/20" : "text-emerald-400 bg-emerald-400/10",
      sub: "Batches above reorder threshold",
    },
    {
      title: "Low Stock Alerts",
      value: `${lowStockCount}`,
      icon: TrendingDown,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-400",
      badge: totalDoses === 0 ? "No Batches" : lowStockCount > 0 ? "Reorder Soon" : "Levels Healthy",
      badgeClass: totalDoses === 0 ? "text-muted-foreground bg-muted/20" : lowStockCount > 0 ? "text-amber-400 bg-amber-400/10" : "text-emerald-400 bg-emerald-400/10",
      sub: "Below minimum alert level",
    },
    {
      title: "FEFO Near Expiry",
      value: `${nearExpiryCount}`,
      icon: AlertTriangle,
      gradient: "from-red-500/5",
      iconClass: "text-red-400",
      badge: totalDoses === 0 ? "No Batches" : nearExpiryCount > 0 ? "Prioritize First" : "Zero Expired",
      badgeClass: totalDoses === 0 ? "text-muted-foreground bg-muted/20" : nearExpiryCount > 0 ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10",
      sub: "First-Expired, First-Out queue",
    },
  ], [totalDoses, adequateCount, lowStockCount, nearExpiryCount]);

  const columns = [
    { id: "batch", label: "Batch No." },
    { id: "name", label: "Item / Vaccine Name", required: true },
    { id: "category", label: "Category" },
    { id: "stock", label: "In Stock" },
    { id: "min", label: "Low Stock Alert" },
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
    let list = [...effectiveInventory];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.batchNumber.toLowerCase().includes(q) ||
          i.manufacturer?.toLowerCase().includes(q) ||
          i.storageLocation?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((i) => {
        if (statusFilter === "expiring-soon") {
          return i.status === "expiring-soon" || i.daysToExpiry <= 30;
        }
        if (statusFilter === "low-stock") {
          return i.status === "low-stock" || (i.stock > 0 && i.stock <= i.minimumStock);
        }
        if (statusFilter === "in-stock") {
          return i.status === "in-stock" && i.daysToExpiry > 30 && i.stock > i.minimumStock;
        }
        if (statusFilter === "expired") {
          return i.status === "expired" || i.daysToExpiry <= 0;
        }
        return i.status === statusFilter;
      });
    }

    if (fefoSort) {
      list.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    }

    return list;
  }, [effectiveInventory, searchQuery, statusFilter, fefoSort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getStatusBadge = (status: string, daysToExpiry: number) => {
    if (daysToExpiry <= 30) {
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 text-[10px] font-medium border-0 py-0.5 px-2 shrink-0 whitespace-nowrap">
          <AlertTriangle className="mr-1 size-3" /> Expiring ({daysToExpiry}d)
        </Badge>
      );
    }
    if (status === "low-stock") {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 text-[10px] font-medium border-0 py-0.5 px-2 shrink-0 whitespace-nowrap">
          <TrendingDown className="mr-1 size-3" /> Low Stock
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-medium border-0 py-0.5 px-2 shrink-0 whitespace-nowrap">
        Adequate
      </Badge>
    );
  };

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Resource Planning & Logistics"
        title="Vaccine & Medicine Inventory"
        subtitle={
          <>
            Government cold-chain management with <span className="text-foreground">FEFO (First-Expire, First-Out)</span> prioritization, batch traceability, and automated reorder triggers.
          </>
        }
        actions={<AddBatchDialog />}
      />

      <PageMetricCards metrics={metrics} />

      <Card>
        <CardHeader className="px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle className="text-base font-bold text-foreground">
                Government Stock Ledger
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                All vaccine batches, medical supplies, and anesthetics across CVO central cold-chain storage. Click any row to view full batch details.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Search item / batch */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search ledger..."
                  className="h-8 pl-8 text-xs bg-muted/20 w-36 sm:w-44 rounded-lg"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs bg-muted/20 shrink-0">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">Adequate Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="expiring-soon">Near Expiry</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* FEFO Priority Sort Toggle */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setFefoSort(!fefoSort)}
                className={cn(
                  "size-8 shrink-0 cursor-pointer transition-colors",
                  fefoSort
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 shadow-xs"
                    : "bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
                title={
                  fefoSort
                    ? "FEFO Priority Active: Sorting by earliest expiry first (Click to toggle)"
                    : "Sort by FEFO: First-Expire, First-Out (Click to activate)"
                }
                aria-label="Toggle FEFO Priority Sort"
              >
                <ArrowUpDown className="size-3.5" />
              </Button>

              <TableColumnFilter
                columns={columns}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />

              {/* Create: + Add Batch Button directly in ledger header */}
              <AddBatchDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleColumns.includes("batch") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-6 whitespace-nowrap w-[140px]">
                    Batch / Lot No.
                  </TableHead>
                )}
                {visibleColumns.includes("name") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider min-w-[260px] w-[280px]">
                    Item Name
                  </TableHead>
                )}
                {visibleColumns.includes("category") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap w-[110px]">
                    Category
                  </TableHead>
                )}
                {visibleColumns.includes("stock") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap w-[110px]">
                    In Stock
                  </TableHead>
                )}
                {visibleColumns.includes("min") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap w-[120px]">
                    Low Stock Alert
                  </TableHead>
                )}
                {visibleColumns.includes("expiry") && (
                  <TableHead
                    onClick={() => setFefoSort(!fefoSort)}
                    className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap w-[130px] cursor-pointer hover:text-foreground select-none transition-colors"
                    title={
                      fefoSort
                        ? "Sorted by FEFO (Earliest Expiring First). Click to toggle."
                        : "Click to sort by FEFO (Earliest Expiring First)"
                    }
                  >
                    <div className="flex items-center gap-1">
                      <span>Expiry (FEFO)</span>
                      <ArrowUpDown className={cn("size-2.5 transition-colors", fefoSort ? "text-primary" : "text-muted-foreground/40")} />
                    </div>
                  </TableHead>
                )}
                {visibleColumns.includes("storage") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider min-w-[180px]">
                    Storage Location
                  </TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right pr-6 whitespace-nowrap w-[110px]">
                    Status
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="py-16 text-center"
                  >
                    {effectiveInventory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-3">
                        <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                          <Package className="size-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground">No Vaccine or Medicine Batches Yet</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Your clinic inventory ledger is currently empty. Start logging cold-chain vaccines and medical supplies to enable FEFO stock tracking.
                          </p>
                        </div>
                        <AddBatchDialog />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto py-8 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">No batches match the selected filters or search.</p>
                        <button
                          type="button"
                          onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}
                          className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Reset filters & search
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item, idx) => (
                  <TableRow
                    key={`${item.id}-${idx}`}
                    onClick={() => setSelectedBatch(item)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    {visibleColumns.includes("batch") && (
                      <TableCell className="font-mono text-xs pl-6 py-3 whitespace-nowrap w-[140px]">
                        <span className="font-semibold text-foreground/90">{item.batchNumber}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("name") && (
                      <TableCell className="py-3 min-w-[260px] max-w-[320px]">
                        <p className="text-xs font-semibold text-foreground leading-snug">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.manufacturer}
                        </p>
                      </TableCell>
                    )}
                    {visibleColumns.includes("category") && (
                      <TableCell className="py-3 whitespace-nowrap w-[110px]">
                        <Badge variant="outline" className="text-[10px] font-medium py-0.5 px-2">
                          {item.category}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("stock") && (
                      <TableCell className="py-3 whitespace-nowrap w-[110px]">
                        <span className="font-bold text-xs text-foreground font-mono">{item.stock}</span>{" "}
                        <span className="text-[11px] text-muted-foreground">{item.unit}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("min") && (
                      <TableCell className="py-3 whitespace-nowrap text-xs text-muted-foreground w-[120px]">
                        <span className="font-mono font-medium">{item.minimumStock}</span>{" "}
                        <span className="text-[11px]">{item.unit}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("expiry") && (
                      <TableCell className="py-3 whitespace-nowrap text-xs w-[130px]">
                        <span className="font-semibold text-foreground font-mono block text-xs">
                          {item.expirationDate}
                        </span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {item.daysToExpiry > 0 ? `${item.daysToExpiry} days remaining` : "Expired"}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("storage") && (
                      <TableCell className="py-3 text-xs text-muted-foreground min-w-[180px] leading-tight">
                        {item.storageLocation}
                      </TableCell>
                    )}
                    {visibleColumns.includes("status") && (
                      <TableCell className="text-right pr-6 py-3 whitespace-nowrap w-[110px]">
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

      {/* ── Batch Full Details & Edit State Right Sidebar Drawer ── */}
      <Sheet open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
        <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto p-6 space-y-5">
          {selectedBatch && (
            <div className="space-y-5">
              <SheetHeader className="p-0 text-left space-y-2">
                <div className="flex items-center justify-between pr-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                      {selectedBatch.batchNumber}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {editCategory}
                    </Badge>
                  </div>
                  {getStatusBadge(selectedBatch.status, currentExpiryDays)}
                </div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Package className="size-5 text-primary" />
                  Edit Batch Ledger
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Direct edit state for cold-chain vaccine parameters, stock count, low stock alert, and FEFO expiry.
                </SheetDescription>
              </SheetHeader>

              {/* Form in direct Edit State */}
              <div className="space-y-4 text-xs">
                {/* Product Name */}
                <div className="space-y-1">
                  <Label htmlFor="drawer-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Product / Item Name *
                  </Label>
                  <Input
                    id="drawer-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Rabisin (Boehringer Ingelheim) — 1.0 mL"
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                {/* Category & Manufacturer */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="drawer-cat" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Category *
                    </Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger id="drawer-cat" className="h-9 text-xs w-full">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="drawer-mfg" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Manufacturer / Source
                    </Label>
                    <Input
                      id="drawer-mfg"
                      value={editManufacturer}
                      onChange={(e) => setEditManufacturer(e.target.value)}
                      placeholder="e.g. Zoetis Philippines Inc."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Batch / Lot No */}
                <div className="space-y-1">
                  <Label htmlFor="drawer-batch" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Batch / Lot Number *
                  </Label>
                  <Input
                    id="drawer-batch"
                    value={editBatchNumber}
                    onChange={(e) => setEditBatchNumber(e.target.value)}
                    placeholder="e.g. RAB-2026-8433"
                    className="h-9 font-mono text-xs uppercase"
                  />
                </div>

                {/* Stock, Unit & Minimum Alert */}
                <div className="p-3.5 bg-muted/20 rounded-xl border border-border/60 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Stock & Cold-Chain Inventory
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="drawer-stock" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        In Stock *
                      </Label>
                      <Input
                        id="drawer-stock"
                        type="number"
                        min="0"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="drawer-unit" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Unit *
                      </Label>
                      <Select value={editUnit} onValueChange={setEditUnit}>
                        <SelectTrigger id="drawer-unit" className="h-9 text-xs w-full">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u} className="text-xs">
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="drawer-min" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Low Stock Alert *
                      </Label>
                      <Input
                        id="drawer-min"
                        type="number"
                        min="0"
                        value={editMinimumStock}
                        onChange={(e) => setEditMinimumStock(e.target.value)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Expiration Date (FEFO) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Expiration Date (FEFO) *
                    </Label>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {currentExpiryDays > 0 ? `${currentExpiryDays} days remaining` : "Expired"}
                    </span>
                  </div>
                  <DatePicker
                    date={editExpiry}
                    setDate={setEditExpiry}
                    placeholder="Pick expiration date"
                  />
                </div>

                {/* Storage Location */}
                <div className="space-y-1">
                  <Label htmlFor="drawer-storage" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cold-Chain Storage Location *
                  </Label>
                  <Select value={editStorageLocation} onValueChange={setEditStorageLocation}>
                    <SelectTrigger id="drawer-storage" className="h-9 text-xs truncate w-full">
                      <SelectValue placeholder="Storage location" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORAGE_LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc} className="text-xs">
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = selectedBatch;
                    setSelectedBatch(null);
                    setBatchToDelete(target);
                    setDeleteDialogOpen(true);
                  }}
                  className="h-9 text-xs gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer font-medium border-border/60"
                >
                  <Trash2 className="size-3.5" /> Delete Batch
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBatch(null)}
                    className="h-9 text-xs cursor-pointer rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saveLoading || !editExpiry}
                    className="h-9 px-4 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5"
                  >
                    {saveLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="size-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Batch Confirmation Dialog (Delete) */}
      <DeleteBatchDialog
        batch={batchToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => setSelectedBatch(null)}
      />
    </div>
  );
}
