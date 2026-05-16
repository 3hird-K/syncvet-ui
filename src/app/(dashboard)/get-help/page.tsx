import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  MessageSquare, 
  Video, 
  FileText,
  BrainCircuit,
  Activity,
  Syringe,
  MapPin
} from "lucide-react";

export default function GetHelpPage() {
  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="SUPPORT CENTER"
        title="Get Help & Documentation"
        subtitle="Learn how to navigate SyncVet and maximize the impact of your veterinary operations."
      />

      {/* Search Header */}
      <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-background shadow-none">
        <CardContent className="pt-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search for guides, system features, or troubleshooting..." 
              className="pl-10 h-12 bg-background/80 border-border/50 shadow-sm text-sm"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="bg-accent/50 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-accent">Pet Registry</Badge>
            <Badge variant="secondary" className="bg-accent/50 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-accent">ML Forecasting</Badge>
            <Badge variant="secondary" className="bg-accent/50 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-accent">Risk Scoring</Badge>
            <Badge variant="secondary" className="bg-accent/50 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-accent">Vaccine Stock</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Core System Knowledge */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <BrainCircuit className="size-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold tracking-tight">Understanding ML Forecasting</CardTitle>
            <CardDescription className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed">
              SyncVet uses historical data to predict current month demand. Learn how the confidence interval and trend decomposition models work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-[11px] font-bold uppercase tracking-widest text-primary hover:no-underline">
              Read ML Guide →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2">
              <Activity className="size-4 text-orange-500" />
            </div>
            <CardTitle className="text-base font-bold tracking-tight">Barangay Risk Scoring</CardTitle>
            <CardDescription className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed">
              How risk scores are calculated based on rabies cases, stray population, and vaccination coverage gaps across CDO.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-[11px] font-bold uppercase tracking-widest text-orange-500 hover:no-underline">
              View Risk Methodology →
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
              <Syringe className="size-4 text-emerald-500" />
            </div>
            <CardTitle className="text-base font-bold tracking-tight">Field Operations Sync</CardTitle>
            <CardDescription className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed">
              Best practices for mobile teams to sync vaccination data from field drives back to the central CVO registry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-[11px] font-bold uppercase tracking-widest text-emerald-500 hover:no-underline">
              Sync Procedures →
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FAQs */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold tracking-tight">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I add a new pet to the registry?</AccordionTrigger>
                <AccordionContent>
                  Navigate to the &quot;Pet Registry&quot; tab and click the &quot;Add Pet&quot; button. You&apos;ll need the owner&apos;s details, pet info, and initial vaccination status.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What do the confidence intervals in the charts mean?</AccordionTrigger>
                <AccordionContent>
                  The shaded area represents the 80% confidence band. If the line stays within this area, demand is following historical patterns.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>How is the &quot;High Risk&quot; status triggered for a Barangay?</AccordionTrigger>
                <AccordionContent>
                  A Barangay is flagged as high risk if its vaccination coverage falls below 70% or if a rabies case is reported within 3km in the last 6 months.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Can I export the analytics reports to PDF?</AccordionTrigger>
                <AccordionContent>
                  Yes, every analytics card has an export button in the top right corner. You can export individual charts or the entire monthly summary as a PDF.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Support & Resources */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold tracking-tight">Still need help?</CardTitle>
              <CardDescription className="text-[11px] font-medium text-muted-foreground/60">
                Contact the CVO IT Support Desk for technical issues.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 border-border/50 h-10">
                <MessageSquare className="size-4 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-bold">Start a Support Ticket</p>
                  <p className="text-[10px] text-muted-foreground">Response time: &lt; 2 hours</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-border/50 h-10">
                <Video className="size-4 text-orange-500" />
                <div className="text-left">
                  <p className="text-xs font-bold">Watch Training Videos</p>
                  <p className="text-[10px] text-muted-foreground">Master the system in 15 mins</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-border/50 h-10">
                <FileText className="size-4 text-emerald-500" />
                <div className="text-left">
                  <p className="text-xs font-bold">Download User Manual</p>
                  <p className="text-[10px] text-muted-foreground">Comprehensive PDF guide (v2.4)</p>
                </div>
              </Button>
            </CardContent>
          </Card>
          
          <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-4">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <HelpCircle className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-foreground">System Version 2.4.0-Stable</p>
              <p className="text-[11px] text-muted-foreground">Your system is up to date with the latest Cagayan de Oro City Veterinary protocols.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
