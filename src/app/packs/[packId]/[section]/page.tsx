import { notFound } from "next/navigation";
import { buildNavigation, getSection } from "@/lib/config/sections";
import { canEditPack, getSessionUser, hasRole } from "@/lib/server/auth";
import { loadPack } from "@/lib/server/packService";
import { PackShell } from "@/components/PackShell";
import { SectionForm } from "@/components/SectionForm";
import { SiteManager } from "@/components/SiteManager";
import { MediaManager } from "@/components/MediaManager";
import { DiagramSection } from "@/components/DiagramSection";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ packId: string; section: string }>;
  searchParams: Promise<{ site?: string }>;
}

export default async function SectionPage({ params, searchParams }: Props) {
  const { packId, section: slug } = await params;
  const { site } = await searchParams;

  const user = await getSessionUser();
  const section = getSection(slug);
  const pack = await loadPack(packId);
  if (!section || !pack) notFound();

  const siteNumber = site ? Number(site) : section.siteSpecific ? pack.sites[0]?.number : undefined;
  const currentSite = pack.sites.find((entry) => entry.number === siteNumber);
  if (section.siteSpecific && !currentSite) notFound();

  const canEdit = canEditPack(user, { ownerId: pack.ownerId, status: pack.status });
  const navigation = buildNavigation(
    pack.id,
    pack.sites.map((entry) => ({ number: entry.number, name: entry.name })),
  );
  const activeHref = section.siteSpecific
    ? `/packs/${pack.id}/${section.slug}?site=${siteNumber}`
    : `/packs/${pack.id}/${section.slug}`;
  const sites = pack.sites.map((entry) => ({ number: entry.number, name: entry.name }));

  return (
    <PackShell
      packId={pack.id}
      reference={pack.reference}
      title={pack.title}
      status={pack.status}
      navigation={navigation}
      activeHref={activeHref}
      currentSite={currentSite ? { number: currentSite.number, name: currentSite.name } : undefined}
      issues={pack.issues}
      canReview={hasRole(user, "REVIEWER")}
    >
      <h2 className="text-xl font-bold">
        {section.title}
        {currentSite ? ` - Site ${currentSite.number}` : ""}
      </h2>

      {section.id === "tqs-form" ? (
        <div className="flex flex-col gap-6">
          <SectionForm
            packId={pack.id}
            section={section}
            initialValues={pack.packValues}
            packVersion={pack.version}
            canEdit={canEdit}
            issues={pack.issues.filter((issue) => !issue.siteNumber)}
            scope="pack"
          />

          <SiteManager packId={pack.id} sites={sites} canEdit={canEdit} />

          {pack.sites.map((entry) => (
            <section
              key={entry.id}
              aria-label={`Track details for site ${entry.number}`}
              className="rounded-md border border-blue-300 bg-blue-50/50 p-3"
            >
              <h3 className="mb-3 text-lg font-semibold">
                Site {entry.number}
                {entry.name ? ` - ${entry.name}` : ""}
              </h3>
              <SectionForm
                packId={pack.id}
                section={section}
                siteNumber={entry.number}
                initialValues={entry.sections["tqs-form"] ?? {}}
                packVersion={pack.version}
                canEdit={canEdit}
                issues={pack.issues.filter((issue) => issue.siteNumber === entry.number)}
                scope="site"
              />
            </section>
          ))}

          <MediaManager
            packId={pack.id}
            kind="PHOTO"
            sectionId="tqs-form"
            sites={sites}
            canEdit={canEdit}
            title="Photographs"
          />
        </div>
      ) : null}

      {section.kind === "form" && section.id !== "tqs-form" && currentSite ? (
        <SectionForm
          packId={pack.id}
          section={section}
          siteNumber={currentSite.number}
          initialValues={currentSite.sections[section.id] ?? {}}
          packVersion={pack.version}
          canEdit={canEdit}
          issues={pack.issues.filter(
            (issue) => issue.siteNumber === currentSite.number && issue.sectionId === section.id,
          )}
          scope="site"
        />
      ) : null}

      {section.kind === "diagram" ? (
        <DiagramSection packId={pack.id} sites={sites} canEdit={canEdit} />
      ) : null}

      {section.kind === "media" && section.mediaKind ? (
        <MediaManager
          packId={pack.id}
          kind={section.mediaKind as "TRACE" | "CCQ_CHART"}
          sectionId={section.id}
          sites={sites}
          canEdit={canEdit}
          title={section.title}
        />
      ) : null}
    </PackShell>
  );
}
