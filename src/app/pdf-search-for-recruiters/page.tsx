import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search for Recruiters \u2014 Search R\u00e9sum\u00e9 Batches Fast",
  description: "Search a batch of r\u00e9sum\u00e9 PDFs for skills, tools, and keywords at once. Free, private full-text search \u2014 load up to 200 r\u00e9sum\u00e9s, find the right candidates, nothing uploaded.",
  alternates: { canonical: absUrl("/pdf-search-for-recruiters") },
  openGraph: {
    title: "PDF Search for Recruiters \u2014 Search R\u00e9sum\u00e9 Batches Fast",
    description: "Search a whole batch of r\u00e9sum\u00e9s at once for the skills and keywords that matter \u2014 privately, nothing uploaded.",
    url: absUrl("/pdf-search-for-recruiters"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "How many r\u00e9sum\u00e9s can I search at once?", answer: "Up to 200 PDF files per session, each up to 50 MB \u2014 enough to screen the applicant batch for a typical req in one pass." },
    { question: "Can I match a specific skill exactly?", answer: "Yes. Whole-word and case-sensitive search let you match a precise skill or tool \u2014 so \u201cGo\u201d or \u201cReact\u201d matches the skill, not an unrelated word." },
    { question: "Is candidate data kept private?", answer: "Yes. R\u00e9sum\u00e9s are parsed inside your browser and never uploaded to a server, so candidate personal data stays on your device and under your control." },
    { question: "Can I export a shortlist?", answer: "Yes. Export all matches to CSV with the candidate\u2019s file name and the matching line, giving you a keyword-screened shortlist to review or share." },
    { question: "Do r\u00e9sum\u00e9s need to be a particular format?", answer: "Any text-based PDF r\u00e9sum\u00e9 works. A r\u00e9sum\u00e9 that\u2019s a scanned image is read with OCR in your browser \u2014 nothing is uploaded \u2014 though recognition can garble an unusual name, so confirm before relying on it." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "For Recruiters", path: "/pdf-search-for-recruiters" },
]);

export default function PdfSearchForRecruitersPage() {
  return (
    <LandingPageShell
      headline="PDF Search for Recruiters & HR"
      subheadline="Search a whole batch of r\u00e9sum\u00e9 PDFs at once \u2014 find candidates with the exact skill, tool, or certification in seconds."
      description="Search a batch of r\u00e9sum\u00e9 PDFs for skills, tools, and keywords at once. Free, private full-text search \u2014 load up to 200 r\u00e9sum\u00e9s, find the right candidates, nothing uploaded."
      breadcrumbLabel="For Recruiters"
      benefits={[
        "Search up to 200 r\u00e9sum\u00e9s at once",
        "Match exact skills and tools",
        "See which files mention what",
        "Private \u2014 candidate data stays local",
      ]}
      trustSignals={[
        { title: "Batch r\u00e9sum\u00e9 search", desc: "Load a folder of r\u00e9sum\u00e9s and query it as one" },
        { title: "Skill-keyword matching", desc: "Whole-word mode nails specific tools and certs" },
        { title: "Candidate privacy", desc: "R\u00e9sum\u00e9s are parsed locally, never uploaded" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Screen a résumé batch by keyword in minutes
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>A single req can generate a folder of a hundred résumé PDFs, and the screening question is always the same: which of these candidates actually mention the thing you need — a specific framework, a certification, a clearance, a tool. Opening résumés one at a time to Ctrl+F each is how good candidates get skipped on a slow afternoon.</p>
            <p>Load the batch and search once. Every résumé that mentions the skill comes back with the candidate’s file surfaced and the matching line shown in context, so you can build a shortlist by keyword in minutes. Whole-word matching keeps “React” from matching “reactor,” which matters more in résumé screening than anywhere else. The underlying <Link href="/bulk-pdf-search" className="text-[var(--accent)] hover:underline">bulk PDF search</Link> workflow is what powers this at folder scale.</p>
            <p>One important note for HR: candidate résumés are personal data, and here they’re parsed entirely in your browser and never uploaded — which keeps screening compliant with your own data-handling rules by default. There’s nothing sent to a third party to worry about.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load the r\u00e9sum\u00e9s",
          desc: "Drag the folder of r\u00e9sum\u00e9 PDFs onto the upload zone \u2014 up to 200 at once. They\u2019re read locally; nothing is uploaded.",
        },
        {
          title: "Search a skill or keyword",
          desc: "Type the tool, framework, certification, or title. Use whole-word mode so specific skills match exactly.",
        },
        {
          title: "See who matches",
          desc: "Results group by candidate file with the matching line shown, so you can spot qualified r\u00e9sum\u00e9s at a glance.",
        },
        {
          title: "Build your shortlist",
          desc: "Export matches to CSV \u2014 candidate file and matching excerpt \u2014 to hand off a keyword-screened shortlist.",
        },
      ]}
      faqItems={[
        {
          question: "How many r\u00e9sum\u00e9s can I search at once?",
          answer: "Up to 200 PDF files per session, each up to 50 MB \u2014 enough to screen the applicant batch for a typical req in one pass.",
        },
        {
          question: "Can I match a specific skill exactly?",
          answer: "Yes. Whole-word and case-sensitive search let you match a precise skill or tool \u2014 so \u201cGo\u201d or \u201cReact\u201d matches the skill, not an unrelated word.",
        },
        {
          question: "Is candidate data kept private?",
          answer: "Yes. R\u00e9sum\u00e9s are parsed inside your browser and never uploaded to a server, so candidate personal data stays on your device and under your control.",
        },
        {
          question: "Can I export a shortlist?",
          answer: "Yes. Export all matches to CSV with the candidate\u2019s file name and the matching line, giving you a keyword-screened shortlist to review or share.",
        },
        {
          question: "Do r\u00e9sum\u00e9s need to be a particular format?",
          answer: "Any text-based PDF r\u00e9sum\u00e9 works. A r\u00e9sum\u00e9 that\u2019s a scanned image is read with OCR in your browser \u2014 nothing is uploaded \u2014 though recognition can garble an unusual name, so confirm before relying on it.",
        },
      ]}
      relatedTools={[
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "Search an entire applicant batch at folder scale." },
        { href: "/find-words-in-pdf", title: "Find Words in PDF", description: "See every r\u00e9sum\u00e9 that mentions a skill." },
        { href: "/search-multiple-pdfs", title: "Search Multiple PDFs", description: "One query across all candidate files." },
      ]}
      relatedArticles={[
        { href: "/blog/search-multiple-pdfs-online", title: "How to Search Multiple PDFs Online", description: "Batch-search tutorial." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "Comparing the options for screening." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
