"use client";

import { useState } from "react";
import { Printer, Download, X, Check, Stethoscope, ShieldCheck, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type CVOConsultation } from "@/data/cvo-store";
import Image from "next/image";
import CityVetLogo from "@/assets/logo-dark.png";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

interface OfficialConsultationSheetDialogProps {
  consultation: CVOConsultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfficialConsultationSheetDialog({
  consultation,
  open,
  onOpenChange,
}: OfficialConsultationSheetDialogProps) {
  const [downloading, setDownloading] = useState(false);

  if (!consultation) return null;

  const handlePrint = () => {
    const element = document.getElementById("cvo-consultation-sheet");
    if (!element) {
      window.print();
      return;
    }

    // Use isolated hidden print iframe so modal transforms/overflow don't clip the paper
    let iframe = document.getElementById("cvo-print-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "cvo-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((s) => s.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CVO Form - ${consultation.encounterNo}</title>
          ${styles}
          <style>
            @page {
              size: portrait;
              margin: 6mm 8mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            #cvo-consultation-sheet {
              border: 2px solid black !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 5mm 7mm !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            input[type="checkbox"] {
              accent-color: black !important;
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    }, 450);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("cvo-consultation-sheet");
    if (!element) return;

    setDownloading(true);
    try {
      const canvas = await (html2canvas as any)(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        margin,
        printableWidth,
        Math.min(imgHeight, pdfHeight - margin * 2)
      );
      pdf.save(`CVO-Consultation-${consultation.encounterNo || "Record"}.pdf`);
      toast.success("Official CVO Form Downloaded", {
        description: `Saved as CVO-Consultation-${consultation.encounterNo}.pdf`,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Could not generate PDF. Please try Print > Save as PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const systems = (consultation.clinicalSystems || {}) as Record<string, string[] | undefined>;
  const isChecked = (category: string, item: string) => {
    const list = systems[category] || [];
    return list.some((val: string) => val.toLowerCase().includes(item.toLowerCase()));
  };

  const services = consultation.servicesRequested || {
    healthy: true,
    vitamins: true,
    deworming: true,
    consultation: true,
  };

  const bcs = consultation.bodyConditionScore || 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-5xl sm:max-w-5xl lg:max-w-6xl max-h-[94vh] overflow-y-auto p-3 sm:p-6 bg-background pointer-events-auto">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b pr-10 sm:pr-12">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <FileText className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold">
                City Veterinary Office Field Treatment / Consultation Form
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Official Cagayan de Oro Municipal Clinical Examination Record • Encounter #{consultation.encounterNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90"
            >
              {downloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span>{downloading ? "Generating PDF..." : "Download PDF"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              <Printer className="size-3.5" />
              <span>Print Document</span>
            </Button>
          </div>
        </DialogHeader>

        {/* ── Official Government Form Container (Fidelity reproduction of physical paper) ── */}
        <div
          id="cvo-consultation-sheet"
          className="bg-white text-black p-5 sm:p-8 md:p-10 rounded-xl border-2 border-slate-400 font-sans shadow-md text-[11px] leading-tight select-text w-full max-w-5xl mx-auto [accent-color:#000000] accent-black"
        >
          {/* Top Form Header with City Veterinary Department Logo & Official Title */}
          <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-black pb-2.5 mb-2.5">
            <div className="size-14 sm:size-16 shrink-0 flex items-center justify-center">
              <Image
                src={CityVetLogo}
                alt="City Veterinary Department Seal"
                width={64}
                height={64}
                className="size-14 sm:size-16 object-contain grayscale contrast-125 print:grayscale print:contrast-150"
                priority
              />
            </div>
            <div className="flex-1">
              <div className="text-[9.5px] uppercase font-bold tracking-wider text-slate-600">
                Republic of the Philippines • City of Cagayan de Oro
              </div>
              <h1 className="text-base sm:text-xl font-black tracking-tight uppercase leading-none font-serif text-slate-900 mt-0.5">
                CITY VETERINARY OFFICE <span className="font-light text-slate-700 text-sm sm:text-base">- CAGAYAN DE ORO</span>
              </h1>
              <h2 className="text-xs sm:text-sm font-extrabold tracking-wide uppercase text-slate-900 mt-1">
                FIELD TREATMENT/CONSULTATION FORM
              </h2>
            </div>
            <div className="text-right text-[10px] font-mono shrink-0 flex flex-col items-end gap-0.5">
              <div className="font-bold border-2 border-black px-2 py-0.5 rounded bg-slate-50 text-slate-950">
                NO: {consultation.encounterNo}
              </div>
              <span className="text-[8.5px] font-sans text-slate-500 font-medium uppercase tracking-tight">Official Clinical Form</span>
            </div>
          </div>

          {/* Patient & Owner Identity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-3 gap-y-1.5 border-b-2 border-black pb-2 mb-2">
            <div className="md:col-span-6 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">OWNER&apos;S NAME:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.ownerName || "MARIE BASALA"}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">SPECIES:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.species || "DOG"}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">NO. OF HEADS:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.noOfHeads || 1}
              </span>
            </div>

            <div className="md:col-span-6 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">BARANGAY:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.ownerBarangay || "PUNTOD"}
              </span>
            </div>
            <div className="md:col-span-6 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">DATE OF BIRTH:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.dateOfBirth || "FEB 3, 2024"}
              </span>
            </div>

            <div className="md:col-span-6 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">CONTACT #:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 pl-1 pb-0.5 font-mono">
                {consultation.ownerContact || "09456430090"}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">AGE:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.age || "2 yrs"}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">GENDER:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.gender || "M"}
              </span>
            </div>

            <div className="md:col-span-6 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">PET NAME:</span>
              <span className="border-b border-black flex-1 font-bold text-slate-900 uppercase pl-1 pb-0.5">
                {consultation.petName || "BINGO"}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">WEIGHT:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 pl-1 pb-0.5">
                {consultation.vitals.weightKg ? `${consultation.vitals.weightKg} kg` : "12.4 kg"}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">COLOR:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.color || "Brown & White"}
              </span>
            </div>

            <div className="md:col-span-6 flex items-baseline gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">BREED:</span>
              <span className="border-b border-black flex-1 font-semibold text-slate-800 uppercase pl-1 pb-0.5">
                {consultation.breed || "Aspin (Mixed)"}
              </span>
            </div>
            <div className="md:col-span-6 flex flex-wrap items-center gap-3 pt-0.5">
              <label className="flex items-center gap-1 font-bold text-[9px]">
                <input
                  type="checkbox"
                  readOnly
                  checked={consultation.weightAssessment === "Ideal Weight" || !consultation.weightAssessment}
                  className="size-3 accent-black rounded-none"
                />
                Ideal Weight
              </label>
              <label className="flex items-center gap-1 font-bold text-[9px]">
                <input
                  type="checkbox"
                  readOnly
                  checked={consultation.weightAssessment === "Overweight"}
                  className="size-3 accent-black rounded-none"
                />
                Overweight
              </label>
              <label className="flex items-center gap-1 font-bold text-[9px]">
                <input
                  type="checkbox"
                  readOnly
                  checked={consultation.weightAssessment === "Underweight"}
                  className="size-3 accent-black rounded-none"
                />
                Underweight
              </label>
            </div>

            {/* Body condition score & encounter date */}
            <div className="md:col-span-8 flex items-center gap-2">
              <span className="font-extrabold uppercase text-[10px] shrink-0">
                Body Condition Score:
              </span>
              <div className="flex items-center gap-1.5 font-bold text-[10px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
                  <span
                    key={score}
                    className={`inline-flex items-center justify-center size-4 rounded-xs text-[9px] ${
                      score === bcs
                        ? "bg-black text-white font-black"
                        : "border border-slate-400 text-slate-700"
                    }`}
                  >
                    {score}
                  </span>
                ))}
              </div>
            </div>
            <div className="md:col-span-4 flex items-center justify-end gap-1.5">
              <span className="font-extrabold uppercase text-[10px] shrink-0">DATE:</span>
              <span className="font-mono font-bold text-[11px] border border-black px-2 py-0.5 bg-slate-50">
                {consultation.date}
              </span>
            </div>
          </div>

          {/* Main Clinical Body: 12-Systems Examination (Left 9 cols) + Services & Symptoms (Right 3 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border-b-2 border-black pb-3 mb-2">
            {/* Left 8 Cols: The 12 Clinical Body Systems */}
            <div className="md:col-span-8 border-r-0 md:border-r border-black md:pr-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                {/* 1. MENTATION / ATTITUDE */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    1. MENTATION / ATTITUDE
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      BAR / QAR
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("mentation", "aggressive")} className="size-2.5 accent-black rounded-none" />
                      Aggressive
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("mentation", "depressed")} className="size-2.5 accent-black rounded-none" />
                      Depressed
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("mentation", "anxious")} className="size-2.5 accent-black rounded-none" />
                      Anxious/Fearful
                    </label>
                  </div>
                </div>

                {/* 2. EYES */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    2. EYES
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={!isChecked("eyes", "discharge") && !isChecked("eyes", "cataract")} className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("eyes", "cataract")} className="size-2.5 accent-black rounded-none" />
                      Cataract L / R
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("eyes", "discharge")} className="size-2.5 accent-black rounded-none" />
                      Discharge L / R
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("eyes", "corneal")} className="size-2.5 accent-black rounded-none" />
                      Corneal Ulcer
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("eyes", "inflamed")} className="size-2.5 accent-black rounded-none" />
                      Inflamed L / R
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("eyes", "eyelid")} className="size-2.5 accent-black rounded-none" />
                      Eyelid Lesion
                    </label>
                  </div>
                </div>

                {/* 3. EARS */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    3. EARS
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("ears", "mites")} className="size-2.5 accent-black rounded-none" />
                      Mites
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("ears", "inflamed")} className="size-2.5 accent-black rounded-none" />
                      Inflamed L / R
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("ears", "lesions")} className="size-2.5 accent-black rounded-none" />
                      Lesions/Growth
                    </label>
                    <label className="flex items-center gap-1 col-span-2">
                      <input type="checkbox" readOnly checked={isChecked("ears", "debris")} className="size-2.5 accent-black rounded-none" />
                      Excessive Debris L / R
                    </label>
                  </div>
                </div>

                {/* 4. MOUTH / TEETH / GUMS */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    4. MOUTH/TEETH/GUMS
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={!isChecked("mouthTeethGums", "calculus")} className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("mouthTeethGums", "ulcers")} className="size-2.5 accent-black rounded-none" />
                      Ulcers/Growths
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("mouthTeethGums", "broken")} className="size-2.5 accent-black rounded-none" />
                      Broken Tooth
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("mouthTeethGums", "calculus")} className="size-2.5 accent-black rounded-none" />
                      Calculus (mild)
                    </label>
                    <label className="flex items-center gap-1 col-span-2">
                      <input type="checkbox" readOnly checked={isChecked("mouthTeethGums", "gingivitis")} className="size-2.5 accent-black rounded-none" />
                      Gingivitis: mild / mod / sev
                    </label>
                  </div>
                </div>

                {/* 5. SKIN / COAT */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    5. SKIN / COAT
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("skinCoat", "rash")} className="size-2.5 accent-black rounded-none" />
                      Rash / Derm
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("skinCoat", "parasites")} className="size-2.5 accent-black rounded-none" />
                      Parasites
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("skinCoat", "dander")} className="size-2.5 accent-black rounded-none" />
                      Dry Coat/Dander
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("skinCoat", "alopecia")} className="size-2.5 accent-black rounded-none" />
                      Alopecia
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("skinCoat", "lumps")} className="size-2.5 accent-black rounded-none" />
                      Lumps/Tumors
                    </label>
                  </div>
                </div>

                {/* 6. NEUROLOGIC */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    6. NEUROLOGIC
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("neurologic", "paresis")} className="size-2.5 accent-black rounded-none" />
                      Paresis/Paralysis
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("neurologic", "seizure")} className="size-2.5 accent-black rounded-none" />
                      Seizure/Tremor
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("neurologic", "ataxia")} className="size-2.5 accent-black rounded-none" />
                      Ataxia/Gait
                    </label>
                  </div>
                </div>

                {/* 7. RESPIRATORY / LUNGS */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    7. RESPIRATORY / LUNGS
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("respiratoryLungs", "rapid")} className="size-2.5 accent-black rounded-none" />
                      Rapid Breathing
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("respiratoryLungs", "nasal")} className="size-2.5 accent-black rounded-none" />
                      Nasal Discharge
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("respiratoryLungs", "difficulty")} className="size-2.5 accent-black rounded-none" />
                      Difficulty Breathing
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("respiratoryLungs", "congestion")} className="size-2.5 accent-black rounded-none" />
                      Congestion
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("respiratoryLungs", "coughing")} className="size-2.5 accent-black rounded-none" />
                      Coughing
                    </label>
                  </div>
                </div>

                {/* 8. CARDIAC / HEART */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    8. CARDIAC / HEART
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("cardiacHeart", "rhythm")} className="size-2.5 accent-black rounded-none" />
                      Abnormal Rhythm
                    </label>
                    <label className="flex items-center gap-1 col-span-2">
                      <input type="checkbox" readOnly checked={isChecked("cardiacHeart", "murmur")} className="size-2.5 accent-black rounded-none" />
                      Heart Murmur
                    </label>
                  </div>
                </div>

                {/* 9. GASTROINTESTINAL */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    9. GASTROINTESTINAL
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("gastrointestinal", "feces")} className="size-2.5 accent-black rounded-none" />
                      Abnormal feces
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("gastrointestinal", "parasites")} className="size-2.5 accent-black rounded-none" />
                      Parasites
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("gastrointestinal", "diarrhea")} className="size-2.5 accent-black rounded-none" />
                      Diarrhea
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("gastrointestinal", "vomiting")} className="size-2.5 accent-black rounded-none" />
                      Vomiting
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("gastrointestinal", "inappetence")} className="size-2.5 accent-black rounded-none" />
                      Inappetence
                    </label>
                  </div>
                </div>

                {/* 10. ABDOMEN */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    10. ABDOMEN
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("abdomen", "palpation")} className="size-2.5 accent-black rounded-none" />
                      Painful Palpation
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("abdomen", "enlarged")} className="size-2.5 accent-black rounded-none" />
                      Enlarged Organ
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("abdomen", "mass")} className="size-2.5 accent-black rounded-none" />
                      Mass / Growth
                    </label>
                    <label className="flex items-center gap-1 col-span-2">
                      <input type="checkbox" readOnly checked={isChecked("abdomen", "fluid")} className="size-2.5 accent-black rounded-none" />
                      Fluid (Ascites)
                    </label>
                  </div>
                </div>

                {/* 11. UROGENITAL */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    11. UROGENITAL
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("urogenital", "discharge")} className="size-2.5 accent-black rounded-none" />
                      Genital Discharge
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("urogenital", "testicle")} className="size-2.5 accent-black rounded-none" />
                      Abnormal Testicle
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("urogenital", "estrus")} className="size-2.5 accent-black rounded-none" />
                      Estrus/Pregnancy
                    </label>
                  </div>
                </div>

                {/* 12. MUSCULOSKELETAL */}
                <div className="border border-slate-300 p-1.5 rounded-xs bg-slate-50/50">
                  <p className="font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1">
                    12. MUSCULOSKELETAL
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked className="size-2.5 accent-black rounded-none" />
                      Appear Normal
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("musculoskeletal", "lameness")} className="size-2.5 accent-black rounded-none" />
                      Lameness
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("musculoskeletal", "pain")} className="size-2.5 accent-black rounded-none" />
                      Pain
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" readOnly checked={isChecked("musculoskeletal", "swelling")} className="size-2.5 accent-black rounded-none" />
                      Swelling
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Service Checklist & Symptoms / History */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-2.5">
              {/* Service Requested Checkbox Block */}
              <div className="border-2 border-black p-2 rounded-xs bg-slate-50">
                <p className="font-black text-[10px] uppercase border-b border-black pb-1 mb-1.5 text-center">
                  SERVICES RENDERED
                </p>
                <div className="space-y-1.5 font-bold text-[10px] pl-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      readOnly
                      checked={Boolean(services.healthy)}
                      className="size-3.5 accent-black rounded-none"
                    />
                    HEALTHY
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      readOnly
                      checked={Boolean(services.vitamins)}
                      className="size-3.5 accent-black rounded-none"
                    />
                    VITAMINS
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      readOnly
                      checked={Boolean(services.deworming)}
                      className="size-3.5 accent-black rounded-none"
                    />
                    DEWORMING
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      readOnly
                      checked={Boolean(services.farmManagement)}
                      className="size-3.5 accent-black rounded-none"
                    />
                    FARM MANAGEMENT
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      readOnly
                      checked={Boolean(services.consultation)}
                      className="size-3.5 accent-black rounded-none"
                    />
                    CONSULTATION
                  </label>
                </div>
              </div>

              {/* Symptoms / History Narrative Box */}
              <div className="border-2 border-black p-2 rounded-xs flex-1 flex flex-col justify-between min-h-[160px]">
                <div>
                  <p className="font-black text-[10px] uppercase border-b border-black pb-1 mb-1">
                    SYMPTOMS / HISTORY
                  </p>
                  <p className="text-[10px] text-slate-800 leading-snug whitespace-pre-line font-medium pt-1">
                    {consultation.chiefComplaint || "Routine wellness and annual health examination. Diet and appetite normal."}
                    {consultation.symptoms && consultation.symptoms.length > 0 && (
                      <span className="block mt-1 font-semibold text-slate-900">
                        Observed Signs: {consultation.symptoms.join(", ")}
                      </span>
                    )}
                  </p>
                </div>

                <div className="border-t border-black pt-2 mt-4 text-center">
                  <div className="h-6 flex items-end justify-center font-serif italic text-xs font-bold text-slate-800">
                    {consultation.vetName || "Dr. Helen Ann P. Tacandong, DVM"}
                  </div>
                  <p className="text-[8.5px] uppercase font-bold tracking-tight text-slate-600 border-t border-dotted border-slate-500 pt-0.5">
                    Veterinarian / Technician
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Clinical Diagnosis & Treatment Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b-2 border-black pb-2 mb-2">
            {/* Diagnosis */}
            <div className="border border-black p-2 rounded-xs min-h-[90px] bg-slate-50/30">
              <p className="font-black text-[11px] uppercase border-b border-black pb-1 mb-1">
                DIAGNOSIS:
              </p>
              <p className="text-[11px] font-bold text-slate-900 leading-snug pt-0.5">
                {consultation.diagnosis || "Clinically Healthy Pet"}
              </p>
              {consultation.veterinarianNotes && (
                <p className="text-[9.5px] text-slate-600 italic mt-1.5">
                  Clinical notes: {consultation.veterinarianNotes}
                </p>
              )}
            </div>

            {/* Treatment & Prescription */}
            <div className="border border-black p-2 rounded-xs min-h-[90px] bg-slate-50/30">
              <p className="font-black text-[11px] uppercase border-b border-black pb-1 mb-1">
                TREATMENT & MEDICATION:
              </p>
              <p className="text-[11px] font-semibold text-slate-900 leading-snug pt-0.5">
                {consultation.treatment || "Standard preventive care and supportive therapy administered."}
              </p>
              {consultation.medication && (
                <div className="mt-1 pt-1 border-t border-slate-300 text-[10px]">
                  <span className="font-bold">Rx:</span> {consultation.medication}
                  {consultation.dosageInstructions && (
                    <span className="block text-[9.5px] text-slate-700 font-medium">
                      Directions: {consultation.dosageInstructions}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations & Follow-Up Strip */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8 flex items-baseline gap-2">
              <label className="flex items-center gap-1 font-extrabold uppercase text-[10px] shrink-0">
                <input type="checkbox" readOnly checked className="size-3 accent-black rounded-none" />
                RECOMMENDATIONS:
              </label>
              <span className="border-b border-black flex-1 text-[10px] font-medium text-slate-800 pl-1 pb-0.5">
                {consultation.recommendations || "Observe pet at home. Provide plenty of clean water and complete prescribed regimen."}
              </span>
            </div>

            <div className="md:col-span-4 flex items-baseline gap-2">
              <label className="flex items-center gap-1 font-extrabold uppercase text-[10px] shrink-0">
                <input
                  type="checkbox"
                  readOnly
                  checked={Boolean(consultation.followUp || consultation.followUpDate)}
                  className="size-3 accent-black rounded-none"
                />
                FOLLOW UP:
              </label>
              <span className="border-b border-black flex-1 text-[10px] font-bold text-slate-900 pl-1 pb-0.5">
                {consultation.followUpDate ? `Return on ${consultation.followUpDate}` : "As needed (walk-in)"}
              </span>
            </div>
          </div>

          {/* Official Footer Notice */}
          <div className="mt-3 pt-1.5 border-t border-slate-300 flex items-center justify-between text-[8px] text-slate-500 uppercase tracking-wider">
            <span>Republic of the Philippines • City Government of Cagayan de Oro</span>
            <span>City Veterinary Office Management Information System (CVO-MIS)</span>
            <span>Official Clinical Form</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
