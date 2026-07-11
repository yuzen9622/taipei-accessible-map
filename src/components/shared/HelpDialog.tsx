"use client";

import {
  BookOpen,
  ExternalLink,
  Globe,
  HelpCircle,
  MapPin,
  MessageSquare,
  Search,
  Navigation,
  Filter,
  Accessibility,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:bg-accent/30">
      <div className="mb-2.5 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function IconLegendCard({
  items,
}: {
  items: string[];
}) {
  const iconMap = [Accessibility, Navigation, Filter];
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="space-y-3">
        {items.map((item, i) => {
          const Icon = iconMap[i] ?? Accessibility;
          const [label, ...desc] = item.split(/：|: /);
          return (
            <div key={item} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-[13px] leading-relaxed">
                <span className="font-medium text-foreground">{label}</span>
                {desc.length > 0 && (
                  <span className="text-muted-foreground">
                    {"："}
                    {desc.join("：")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DataSourceCard({
  href,
  imageSrc,
  alt,
  imageClassName,
}: {
  href: string;
  imageSrc: string;
  alt: string;
  imageClassName?: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-3 transition-colors hover:bg-accent/30"
    >
      <Image
        src={imageSrc}
        alt={alt}
        width={120}
        height={48}
        className={cn("rounded-md p-1", imageClassName)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{alt}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

export default function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { t } = useAppTranslation("translation");

  const generalFeatures = t("helpDescription.features.general.features", {
    returnObjects: true,
  }) as string[];

  const taipeiIcons = t("helpDescription.features.taipei.icons", {
    returnObjects: true,
  }) as string[];

  const feedbackSteps = t("helpDescription.feedback.steps", {
    returnObjects: true,
  }) as string[];

  const feedbackExamples = t("helpDescription.feedback.examples", {
    returnObjects: true,
  }) as string[];

  const faqItems = t("helpDescription.faq.items", {
    returnObjects: true,
  }) as { question: string; answer: string }[];

  const featureIcons = [Search, Navigation];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(95vw,560px)] max-w-[min(95vw,560px)] rounded-2xl p-0 overflow-hidden max-h-[85vh]">
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="size-[18px] text-primary" />
              {t("help")}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground mt-1">
              {t("helpDescription.overview")}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="features" className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 border-b border-border/60 px-4 pt-2">
              <TabsList className="w-full bg-transparent h-auto p-0 gap-0">
                <TabsTrigger
                  value="features"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 min-h-[44px] text-[13px]"
                >
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  {t("helpDescription.tabs.features")}
                </TabsTrigger>
                <TabsTrigger
                  value="taipei"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 min-h-[44px] text-[13px]"
                >
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  {t("helpDescription.tabs.taipei")}
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 min-h-[44px] text-[13px]"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  {t("helpDescription.tabs.feedback")}
                </TabsTrigger>
                <TabsTrigger
                  value="faq"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2.5 min-h-[44px] text-[13px]"
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                  {t("helpDescription.tabs.faq")}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="features" className="mt-0 p-4 space-y-3">
                {generalFeatures.map((feature, i) => {
                  const Icon = featureIcons[i] ?? Globe;
                  const [title, ...rest] = feature.split(/：|: /);
                  return (
                    <FeatureCard
                      key={feature}
                      icon={Icon}
                      title={title ?? ""}
                      description={rest.join("：")}
                    />
                  );
                })}
              </TabsContent>

              <TabsContent value="taipei" className="mt-0 p-4 space-y-4">
                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Filter className="h-4 w-4" />
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {t("helpDescription.features.taipei.features.filter")}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t("helpDescription.features.taipei.note")}
                  </p>
                  <IconLegendCard items={taipeiIcons} />
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="mt-0 p-4 space-y-4">
                <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">
                    {t("helpDescription.feedback.title")}
                  </p>
                  <ol className="space-y-2">
                    {feedbackSteps.map((step, i) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-[13px] leading-relaxed text-muted-foreground">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t("helpDescription.tabs.feedbackExamples")}
                  </p>
                  <div className="space-y-2">
                    {feedbackExamples.map((example) => (
                      <div
                        key={example}
                        className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5"
                      >
                        <p className="text-[13px] text-muted-foreground italic">
                          {example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="faq" className="mt-0 p-4 space-y-3">
                <Accordion type="multiple" className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                  {faqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
                      <AccordionTrigger className="px-4 py-3 text-sm font-medium text-primary hover:no-underline hover:bg-accent/30">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {item.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="pt-2 space-y-3">
                  <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {t("helpDescription.tabs.repository")}
                    </p>
                    <Link
                      href="https://github.com/yuzen9622/taipei-accessible-map"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
                    >
                      github.com/yuzen9622/taipei-accessible-map
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">
                      {t("data")}
                    </p>
                    <div className="space-y-2">
                      <DataSourceCard
                        href="https://tdx.transportdata.tw"
                        imageSrc="https://tdx.transportdata.tw/images/tdxlogo.png"
                        alt={t("tdx")}
                        imageClassName="dark:bg-primary bg-primary-foreground"
                      />
                      <DataSourceCard
                        href="https://data.moenv.gov.tw/"
                        imageSrc="/epa-logo.svg"
                        alt={t("moe")}
                        imageClassName="bg-primary dark:bg-primary-foreground"
                      />
                      <DataSourceCard
                        href="https://data.gov.tw/"
                        imageSrc="/gov-open-data.svg"
                        alt={t("gov")}
                        imageClassName="dark:bg-primary bg-primary-foreground"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
