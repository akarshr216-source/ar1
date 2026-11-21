import { useState } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import type { QuestionItem, SubjectName } from '../types.ts';

interface PdfExportStudioProps {
  questions: QuestionItem[];
  onExportPdf: (
    kind: 'repeated' | 'hardest',
    subjectFilter: 'All' | SubjectName,
    includeAnswers: boolean
  ) => Promise<void>;
  downloadingKind: 'repeated' | 'hardest' | 'both' | null;
}

export function PdfExportStudio({
  questions,
  onExportPdf,
  downloadingKind,
}: PdfExportStudioProps) {
  const [subjectFilter, setSubjectFilter] = useState<'All' | SubjectName>('All');
  const [includeAnswers, setIncludeAnswers] = useState(true);

  const countFor = (kind: 'repeated' | 'hardest') =>
    questions.filter(
      (q) => q.category === kind && (subjectFilter === 'All' || q.subject === subjectFilter)
    ).length;

  const repeatedCount = countFor('repeated');
  const hardestCount = countFor('hardest');

  const handleDownloadBoth = async () => {
    await onExportPdf('repeated', subjectFilter, includeAnswers);
    await onExportPdf('hardest', subjectFilter, includeAnswers);
  };

  return (
    <section id="pdf-studio" className="py-16 border-t border-slate-200">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">
            Separate Publication-Ready Booklets
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Separate PDF Export Studio
          </h2>
          <p className="mt-2 text-[15px] text-slate-600 max-w-2xl leading-relaxed">
            Generate two distinct, print-ready A4 PDFs with full Unicode mathematical and chemical notation — one dedicated to High-Frequency Repeated Questions and one dedicated to Hardest &amp; HOTS Questions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Science', 'Social Science', 'Mathematics'] as const).map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSubjectFilter(subj)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  subjectFilter === subj
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {subj === 'All' ? 'All 3 Subjects' : subj}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeAnswers}
              onChange={(e) => setIncludeAnswers(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
            />
            <span>Include Marking Scheme Solutions</span>
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PDF 1: Repeated Questions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 pb-3 border-b border-slate-100">
              <span className="font-semibold text-[#1D4ED8]">Booklet 01 · High-Frequency</span>
              <span className="font-mono-tabular font-medium text-slate-700">
                {repeatedCount} Questions · A4 PDF
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-slate-900 mt-4">
              Repeated Board Questions (2026 Syllabus)
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Compiles recurring 3-mark and 5-mark core board questions across Science (086), Social Science (087), and Mathematics (041/241) with CBSE paper codes and repeat counts.
            </p>
            <p className="mt-3 text-xs font-mono-tabular text-slate-500">
              Filename: CBSE_2026_Repeated_Questions_{subjectFilter === 'All' ? 'All_Subjects' : subjectFilter.replace(/\s+/g, '_')}.pdf
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              {includeAnswers ? 'With Marking Scheme Key' : 'Questions Only (Practice)'}
            </span>
            <button
              type="button"
              onClick={() => onExportPdf('repeated', subjectFilter, includeAnswers)}
              disabled={downloadingKind !== null || repeatedCount === 0}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {downloadingKind === 'repeated' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Download Repeated PDF</span>
            </button>
          </div>
        </div>

        {/* PDF 2: Hardest Questions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 pb-3 border-b border-slate-100">
              <span className="font-semibold text-[#B91C1C]">Booklet 02 · HOTS &amp; Competency</span>
              <span className="font-mono-tabular font-medium text-slate-700">
                {hardestCount} Questions · A4 PDF
              </span>
            </div>
            <h3 className="font-display text-xl font-semibold text-slate-900 mt-4">
              Hardest &amp; HOTS Questions (2026 Syllabus)
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Isolates high-discrimination numericals, multi-concept riders, source-based history/civics prompts, common student mistake traps, and step-by-step solutions.
            </p>
            <p className="mt-3 text-xs font-mono-tabular text-slate-500">
              Filename: CBSE_2026_Hardest_Questions_{subjectFilter === 'All' ? 'All_Subjects' : subjectFilter.replace(/\s+/g, '_')}.pdf
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              {includeAnswers ? 'With Solutions & Traps' : 'Questions Only (Practice)'}
            </span>
            <button
              type="button"
              onClick={() => onExportPdf('hardest', subjectFilter, includeAnswers)}
              disabled={downloadingKind !== null || hardestCount === 0}
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {downloadingKind === 'hardest' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Download Hardest PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <FileText className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          <span>
            Need both separate PDFs right away? Download both booklets sequentially for{' '}
            <strong className="font-semibold text-slate-900">
              {subjectFilter === 'All' ? 'Science, Social Science & Mathematics' : subjectFilter}
            </strong>
            .
          </span>
        </div>
        <button
          type="button"
          onClick={handleDownloadBoth}
          disabled={downloadingKind !== null || (repeatedCount === 0 && hardestCount === 0)}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Download Both Separate PDFs</span>
        </button>
      </div>
    </section>
  );
}
