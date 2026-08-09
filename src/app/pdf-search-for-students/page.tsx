import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search for Students \u2014 Search Textbooks & Notes Free",
  description: "Search across your textbooks, lecture slides, and readings at once. Free, private PDF search built for exam prep, essays, and citation hunting \u2014 no signup, files never leave your browser.",
  alternates: { canonical: absUrl("/pdf-search-for-students") },
  openGraph: {
    title: "PDF Search for Students \u2014 Search Textbooks & Notes Free",
    description: "Turn a semester of PDFs into a searchable study aid. Find definitions, formulas, and citations across every file at once.",
    url: absUrl("/pdf-search-for-students"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Is PDF search really free for students?", answer: "Yes \u2014 completely free, with no account, no student-email verification, and no page or file limits beyond 200 files and 50 MB each. There\u2019s nothing to upgrade." },
    { question: "Can I search my whole textbook at once?", answer: "Yes. A single textbook PDF searches in seconds, and you can load multiple textbooks and all your lecture slides together and search across all of them at once." },
    { question: "Will my notes and readings stay private?", answer: "Yes. Parsing happens inside your browser tab \u2014 your files are never uploaded to a server, so confidential course materials stay on your device." },
    { question: "Can I search scanned lecture handouts?", answer: "Yes. A photographed or scanned handout has no text layer, so PDFSearch reads it with OCR right in your browser — no upload, no preparation. Recognition is good on clean print and weaker on faint photos, and OCR needs a desktop browser." },
    { question: "Does it work on a school Chromebook?", answer: "Yes. It runs in any modern browser with nothing to install, so locked-down school laptops and Chromebooks work fine." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "For Students", path: "/pdf-search-for-students" },
]);

export default function PdfSearchForStudentsPage() {
  return (
    <LandingPageShell
      headline="PDF Search Built for Students"
      subheadline="Search every textbook, lecture slide, and reading at once \u2014 find the definition, formula, or quote you need in seconds."
      description="Search across your textbooks, lecture slides, and readings at once. Free, private PDF search built for exam prep, essays, and citation hunting \u2014 no signup, files never leave your browser."
      breadcrumbLabel="For Students"
      benefits={[
        "Search a whole semester at once",
        "Case-sensitive term matching",
        "Every match with page numbers",
        "Free \u2014 no student email needed",
      ]}
      trustSignals={[
        { title: "Made for study piles", desc: "Load a term\u2019s worth of PDFs and search them as one" },
        { title: "Find exact terms", desc: "Whole-word mode nails defined terms and formulas" },
        { title: "Private by default", desc: "Course materials never leave your laptop" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            From a folder of PDFs to a searchable study aid
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>By week ten, a typical course is a folder of twenty-plus PDFs: the textbook, weekly lecture slides, problem sets, and a few papers the professor assigned. When exam week arrives and you need “where did we define elasticity” or “which lecture covered the Krebs cycle,” opening files one at a time is exactly the wrong tool.</p>
            <p>Load the whole folder into PDFSearch and ask once. Matches come back grouped by file with page numbers, so you jump straight to the slide or page you need. Whole-word and case-sensitive modes matter more than students expect — they separate a defined term from the same word used casually, which is the difference between finding the definition and scrolling past it. The <Link href="/find-words-in-pdf" className="text-[var(--accent)] hover:underline">find-words-in-PDF</Link> workflow is built for exactly this “show me everywhere it appears” pattern.</p>
            <p>It’s free with no student-email gate, and because parsing happens in your browser, your notes and readings stay on your machine. Photographed or scanned handouts have no text layer, so they&rsquo;re read with OCR in your browser — <Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">here’s how to check</Link>.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load your course PDFs",
          desc: "Drag your textbook, lecture slides, and readings onto the upload zone \u2014 up to 200 files at once. Mix in PDF URLs from the course site if you like.",
        },
        {
          title: "Search a concept or term",
          desc: "Type the definition, formula, or keyword. Turn on whole-word mode for precise terms so \u201ccell\u201d doesn\u2019t match \u201cexcellent.\u201d",
        },
        {
          title: "Jump to the exact page",
          desc: "Results are grouped by file with page numbers and the surrounding sentence, so you land on the right slide instantly.",
        },
        {
          title: "Build your study list",
          desc: "Export every match to CSV to assemble a review sheet of key passages, or just skim the list like search results.",
        },
      ]}
      faqItems={[
        {
          question: "Is PDF search really free for students?",
          answer: "Yes \u2014 completely free, with no account, no student-email verification, and no page or file limits beyond 200 files and 50 MB each. There\u2019s nothing to upgrade.",
        },
        {
          question: "Can I search my whole textbook at once?",
          answer: "Yes. A single textbook PDF searches in seconds, and you can load multiple textbooks and all your lecture slides together and search across all of them at once.",
        },
        {
          question: "Will my notes and readings stay private?",
          answer: "Yes. Parsing happens inside your browser tab \u2014 your files are never uploaded to a server, so confidential course materials stay on your device.",
        },
        {
          question: "Can I search scanned lecture handouts?",
          answer: "Yes. A photographed or scanned handout has no text layer, so PDFSearch reads it with OCR right in your browser — no upload, no preparation. Recognition is good on clean print and weaker on faint photos, and OCR needs a desktop browser.",
        },
        {
          question: "Does it work on a school Chromebook?",
          answer: "Yes. It runs in any modern browser with nothing to install, so locked-down school laptops and Chromebooks work fine.",
        },
      ]}
      relatedTools={[
        { href: "/find-words-in-pdf", title: "Find Words in PDF", description: "List every occurrence of a term with context." },
        { href: "/search-multiple-pdfs", title: "Search Multiple PDFs", description: "One query across your whole course folder." },
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Precise, case-sensitive term lookups." },
      ]}
      relatedArticles={[
        { href: "/blog/pdf-search-workflow-for-students", title: "A PDF Search Workflow for Students", description: "Textbooks, notes, and exam prep, step by step." },
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "Why find-in-page isn\u2019t enough for study piles." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
