import { useMemo, useState } from 'react';
import { BookOpen, Download, ExternalLink, Loader2, Search } from 'lucide-react';
import { BASELINE_CBSE_QUESTIONS } from './data/baselineQuestions.ts';
import { QuestionCard } from './components/QuestionCard.tsx';
import { LiveArchivePanel } from './components/LiveArchivePanel.tsx';
import { SyllabusSection } from './components/SyllabusSection.tsx';
import { PdfExportStudio } from './components/PdfExportStudio.tsx';
import type { QuestionCategory, QuestionItem, SubjectName } from './types.ts';

const HERO_IMAGE_PATH = '/src/assets/images/cbse_academic_compendium_1795271203405.jpg';

export default function App() {
  const [questions, setQuestions] = useState<QuestionItem[]>(BASELINE_CBSE_QUESTIONS);
  const [activeCategory, setActiveCategory] = useState<QuestionCategory>('repeated');
  const [activeSubject, setActiveSubject] = useState<'All' | SubjectName>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllAnswers, setShowAllAnswers] = useState(true);

  const [downloadingKind, setDownloadingKind] = useState<'repeated' | 'hardest' | 'both' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [recentExtractionNote, setRecentExtractionNote] = useState<string | null>(null);

  const repeatedTotal = useMemo(
    () => questions.filter((q) => q.category === 'repeated').length,
    [questions]
  );
  const hardestTotal = useMemo(
    () => questions.filter((q) => q.category === 'hardest').length,
    [questions]
  );
  const liveExtractedTotal = useMemo(
    () => questions.filter((q) => q.source === 'live-cbse').length,
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return questions.filter((item) => {
      if (item.category !== activeCategory) return false;
      if (activeSubject !== 'All' && item.subject !== activeSubject) return false;
      if (!qLower) return true;
      return (
        item.questionText.toLowerCase().includes(qLower) ||
        item.chapter.toLowerCase().includes(qLower) ||
        item.subject.toLowerCase().includes(qLower) ||
        item.paperCodes.some((c) => c.toLowerCase().includes(qLower))
      );
    });
  }, [questions, activeCategory, activeSubject, searchQuery]);

  const handleQuestionsExtracted = (newQuestions: QuestionItem[], analyzedLabel: string) => {
    if (newQuestions.length === 0) return;
    setQuestions((prev) => [...newQuestions, ...prev]);
    setRecentExtractionNote(
      `Added ${newQuestions.length} live-extracted 2026-syllabus questions from ${analyzedLabel}.`
    );
  };

  const handleRemoveCustom = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleExportPdf = async (
    kind: 'repeated' | 'hardest',
    subjectFilter: 'All' | SubjectName,
    includeAnswers: boolean
  ) => {
    setDownloadingKind(kind);
    setExportError(null);

    try {
      const res = await fetch('/api/pdf/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          subjectFilter,
          questions,
          includeAnswers,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'PDF export failed' }));
        throw new Error(errData.error || 'PDF export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const subjSlug = subjectFilter === 'All' ? 'All_Subjects' : subjectFilter.replace(/\s+/g, '_');
      const filename =
        kind === 'repeated'
          ? `CBSE_2026_Repeated_Questions_${subjSlug}.pdf`
          : `CBSE_2026_Hardest_Questions_${subjSlug}.pdf`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Unable to generate PDF');
    } finally {
      setDownloadingKind(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            CBSE 2026 Compendium
          </a>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#questions"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Question Bank
            </a>
            <a
              href="#archive"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Official Archive
            </a>
            <a
              href="#syllabus"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              2026 Syllabus
            </a>
            <a
              href="#pdf-studio"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              PDF Studio
            </a>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <a
              href="#pdf-studio"
              className="inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export PDFs</span>
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-[1280px] w-full mx-auto px-6">
        {/* Hero Split */}
        <section className="py-12 lg:py-16">
          <div className="grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-3">
                  Class X Board Examination · Science (086) · Social Science (087) · Mathematics (041 / 241)
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.12] [text-wrap:balance]">
                  Repeated &amp; Hardest Board Questions for 2026
                </h1>
                <p className="mt-5 text-[16px] leading-relaxed text-slate-600 max-w-2xl">
                  Built directly around the official{' '}
                  <a
                    href="https://www.cbse.gov.in/cbsenew/question-paper.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1D4ED8] underline underline-offset-4 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    <span>CBSE Previous Years’ Question Papers</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>{' '}
                  archive (2022–2026). Every question is cross-checked against the 2026 NCERT rationalized syllabus and exported into two separate A4 PDF booklets.
                </p>
              </div>

              {/* Direct Separate PDF Download Actions */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleExportPdf('repeated', activeSubject, true)}
                    disabled={downloadingKind !== null}
                    className="inline-flex items-center gap-2 py-3 px-5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {downloadingKind === 'repeated' ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>
                      Repeated PDF + Answers ({activeSubject === 'All' ? 'All 3' : activeSubject})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportPdf('hardest', activeSubject, true)}
                    disabled={downloadingKind !== null}
                    className="inline-flex items-center gap-2 py-3 px-5 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {downloadingKind === 'hardest' ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span>
                      Hardest PDF + Answers ({activeSubject === 'All' ? 'All 3' : activeSubject})
                    </span>
                  </button>
                </div>

                {exportError && (
                  <p className="text-xs font-medium text-red-700">{exportError}</p>
                )}
              </div>
            </div>

            {/* Right Visual Frame */}
            <div className="lg:col-span-5">
              <div className="h-full min-h-[260px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {heroImgFailed ? (
                  <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <BookOpen className="w-10 h-10 text-slate-500 mb-3" aria-hidden="true" />
                    <p className="font-display text-lg font-semibold text-slate-800">
                      CBSE Class X 2026 Compendium
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Science · Social Science · Mathematics
                    </p>
                  </div>
                ) : (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="Bound academic examination compendiums, brass compass, optical prism, and desk globe representing Science, Social Science, and Mathematics."
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full lg:h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Metric Strip below Hero Split */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-5">
              <p className="text-xs text-slate-500">Repeated Board Questions</p>
              <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#1D4ED8]">
                {repeatedTotal}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Hardest &amp; HOTS Questions</p>
              <p className="mt-1 font-mono-tabular text-2xl font-semibold text-[#B91C1C]">
                {hardestTotal}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Subjects Covered</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                Science, Social, Maths
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500">Live Extracted Sets</p>
              <p className="mt-1 font-mono-tabular text-2xl font-semibold text-slate-900">
                {liveExtractedTotal}
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Question Bank Section */}
        <section id="questions" className="py-12 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
                2026-Syllabus Question Bank
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Switch between Repeated Questions and Hardest HOTS Questions, filter by subject, or search by chapter and paper code.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Primary Category Switcher */}
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveCategory('repeated')}
                  className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeCategory === 'repeated'
                      ? 'bg-white text-[#1D4ED8] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Repeated Questions ({repeatedTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('hardest')}
                  className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeCategory === 'hardest'
                      ? 'bg-white text-[#B91C1C] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hardest &amp; HOTS ({hardestTotal})
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start overflow-x-auto max-w-full">
              {(['All', 'Science', 'Social Science', 'Mathematics'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setActiveSubject(sub)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeSubject === sub
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sub === 'All' ? 'All Subjects' : sub}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chapter, code (31/4/1)..."
                  aria-label="Search questions by topic or CBSE paper code"
                  className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showAllAnswers}
                  onChange={(e) => setShowAllAnswers(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                />
                <span>Show Answers &amp; Marking Schemes</span>
              </label>
            </div>
          </div>

          {recentExtractionNote && (
            <div className="mb-6 p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between gap-4">
              <span>{recentExtractionNote}</span>
              <button
                type="button"
                onClick={() => setRecentExtractionNote(null)}
                className="font-medium underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Question List */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-sm font-medium text-slate-900">
                No matching questions found for this filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveSubject('All');
                  setSearchQuery('');
                }}
                className="mt-3 py-2 px-4 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  globalShowAnswers={showAllAnswers}
                  onRemoveCustom={handleRemoveCustom}
                />
              ))}
            </div>
          )}
        </section>

        {/* Live CBSE Archive Scraper & Extractor */}
        <LiveArchivePanel onQuestionsExtracted={handleQuestionsExtracted} />

        {/* 2026 Syllabus Verification */}
        <SyllabusSection />

        {/* Separate PDF Export Studio */}
        <PdfExportStudio
          questions={questions}
          onExportPdf={handleExportPdf}
          downloadingKind={downloadingKind}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            CBSE 2026 Board Compendium · Class X Science (086), Social Science (087), Mathematics (041/241)
          </p>
          <a
            href="https://www.cbse.gov.in/cbsenew/question-paper.html"
            target="_blank"
            rel="noreferrer"
            className="text-slate-700 hover:text-slate-900 underline underline-offset-4"
          >
            Official CBSE Question Paper Archive
          </a>
        </div>
      </footer>
    </div>
  );
}
