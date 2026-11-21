import { useEffect, useState } from 'react';
import { ExternalLink, FileArchive, Loader2, Sparkles, CheckSquare, Square, RefreshCw } from 'lucide-react';
import type { CbseArchiveEntry, QuestionItem, SubjectName, ZipPdfEntry } from '../types.ts';

interface LiveArchivePanelProps {
  onQuestionsExtracted: (newQuestions: QuestionItem[], analyzedLabel: string) => void;
}

export function LiveArchivePanel({ onQuestionsExtracted }: LiveArchivePanelProps) {
  const [archives, setArchives] = useState<CbseArchiveEntry[]>([]);
  const [sourceUrl, setSourceUrl] = useState('https://www.cbse.gov.in/cbsenew/question-paper.html');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState<'All' | SubjectName>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');

  const [activeArchive, setActiveArchive] = useState<CbseArchiveEntry | null>(null);
  const [zipEntries, setZipEntries] = useState<ZipPdfEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const res = await fetch('/api/cbse/catalog');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch CBSE catalog');
      }
      setArchives(data.archives || []);
      if (data.sourceUrl) setSourceUrl(data.sourceUrl);
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'Unable to reach CBSE catalog');
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const inspectArchive = async (entry: CbseArchiveEntry) => {
    setActiveArchive(entry);
    setZipEntries([]);
    setSelectedFiles([]);
    setEntriesError(null);
    setAnalyzeStatus(null);
    setAnalyzeError(null);
    setLoadingEntries(true);

    try {
      const res = await fetch(`/api/cbse/zip-entries?url=${encodeURIComponent(entry.url)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect archive');
      }
      const list: ZipPdfEntry[] = data.entries || [];
      setZipEntries(list);
      // Pre-select up to 2 representative set PDFs
      const autoPick = list
        .filter((item) => item.uncompressedSize < 3_500_000)
        .slice(0, 2)
        .map((item) => item.fileName);
      setSelectedFiles(autoPick.length > 0 ? autoPick : list.slice(0, 1).map((i) => i.fileName));
    } catch (err) {
      setEntriesError(err instanceof Error ? err.message : 'Failed to inspect ZIP directory');
    } finally {
      setLoadingEntries(false);
    }
  };

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles((prev) => {
      if (prev.includes(fileName)) {
        return prev.filter((f) => f !== fileName);
      }
      if (prev.length >= 2) {
        return [prev[1], fileName];
      }
      return [...prev, fileName];
    });
  };

  const runLiveAnalysis = async () => {
    if (!activeArchive) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalyzeStatus(null);

    try {
      const res = await fetch('/api/cbse/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeArchive.subject,
          year: activeArchive.year,
          archiveUrl: activeArchive.url,
          selectedFileNames: selectedFiles,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze CBSE PDFs');
      }
      const extracted: QuestionItem[] = data.extractedQuestions || [];
      onQuestionsExtracted(
        extracted,
        `${activeArchive.year} ${activeArchive.subjectLabel} (${(data.analyzedFiles || []).join(', ')})`
      );
      setAnalyzeStatus(
        `Extracted ${extracted.length} 2026-syllabus questions from ${(data.analyzedFiles || []).length} official PDF set(s) and added them to your Question Bank & PDF Exports.`
      );
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const years = ['All', ...Array.from(new Set(archives.map((a) => a.year)))];

  const visibleArchives = archives.filter((a) => {
    if (subjectFilter !== 'All' && a.subject !== subjectFilter) return false;
    if (yearFilter !== 'All' && a.year !== yearFilter) return false;
    return true;
  });

  return (
    <section id="archive" className="py-16 border-t border-slate-200">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">
            Live Scraper &amp; Range-ZIP PDF Extractor
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Official CBSE Question Paper Archive
          </h2>
          <p className="mt-2 text-[15px] text-slate-600 max-w-2xl leading-relaxed">
            Connected live to{' '}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#1D4ED8] underline underline-offset-4 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>cbse.gov.in/cbsenew/question-paper.html</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            . Inspect any 2022–2026 Class X ZIP archive to preview its official regional Set PDFs and extract fresh 2026-syllabus questions straight into your PDF booklets.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCatalog}
          disabled={loadingCatalog}
          className="inline-flex items-center gap-2 py-2 px-4 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingCatalog ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Refresh CBSE Index</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'Science', 'Social Science', 'Mathematics'] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSubjectFilter(sub)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subjectFilter === sub
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sub === 'All' ? 'All Subjects' : sub}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {years.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setYearFilter(yr)}
              className={`px-3 py-1.5 text-xs font-mono-tabular font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                yearFilter === yr
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {yr === 'All' ? 'All Years' : yr}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Archive Browser + Inspector */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left: Live Archive List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loadingCatalog ? (
            <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
              <span>Fetching official Class X links from cbse.gov.in...</span>
            </div>
          ) : catalogError ? (
            <div className="p-6 text-sm text-red-700 bg-red-50">
              <p className="font-medium">{catalogError}</p>
              <button
                type="button"
                onClick={loadCatalog}
                className="mt-3 py-1.5 px-3 text-xs font-medium bg-white border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Examination</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {visibleArchives.map((item) => {
                    const isSelected = activeArchive?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                          {item.year}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{item.subjectLabel}</div>
                          <div className="text-xs text-slate-500 font-mono-tabular">
                            {item.fileType} · {item.fileSize}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{item.examType}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="py-1.5 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 whitespace-nowrap"
                            >
                              Raw {item.fileType}
                            </a>
                            <button
                              type="button"
                              onClick={() => inspectArchive(item)}
                              className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1D4ED8] text-white'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Inspect Sets'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Set PDF Inspector & Gemini Extractor */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          {!activeArchive ? (
            <div className="py-10 text-center space-y-2">
              <FileArchive className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900">
                Select a CBSE Archive to Inspect Set PDFs
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Click “Inspect Sets” on any 2022–2026 paper row to read its internal PDF filenames via HTTP Range requests and extract 2026-syllabus questions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <p className="text-xs font-mono-tabular text-[#1D4ED8] font-medium">
                  {activeArchive.year} · {activeArchive.examType}
                </p>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                  {activeArchive.subjectLabel}
                </h3>
              </div>

              {loadingEntries ? (
                <div className="py-6 flex items-center gap-2.5 text-xs text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" aria-hidden="true" />
                  <span>Reading ZIP central directory from cbse.gov.in...</span>
                </div>
              ) : entriesError ? (
                <p className="text-xs text-red-700 bg-red-50 p-3 rounded-lg">{entriesError}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{zipEntries.length} official PDF sets found</span>
                    <span>Select up to 2 sets to analyze</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {zipEntries.map((entry) => {
                      const checked = selectedFiles.includes(entry.fileName);
                      const kb = entry.uncompressedSize
                        ? `${Math.round(entry.uncompressedSize / 1024)} KB`
                        : 'PDF';
                      const shortName = entry.fileName.split('/').pop() || entry.fileName;
                      return (
                        <button
                          key={entry.fileName}
                          type="button"
                          onClick={() => toggleFileSelection(entry.fileName)}
                          className={`w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left text-xs transition-colors cursor-pointer ${
                            checked ? 'bg-blue-50/70 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                            )}
                            <span className="truncate font-mono-tabular">{shortName}</span>
                          </span>
                          <span className="font-mono-tabular text-slate-500 shrink-0">{kb}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={runLiveAnalysis}
                    disabled={analyzing || selectedFiles.length === 0}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Extracting &amp; Filtering for 2026 Syllabus...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                        <span>Extract Repeated &amp; Hardest Questions ({selectedFiles.length} PDFs)</span>
                      </>
                    )}
                  </button>

                  {analyzeStatus && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-lg leading-relaxed">
                      {analyzeStatus}
                    </p>
                  )}

                  {analyzeError && (
                    <p className="text-xs text-red-800 bg-red-50 border border-red-200 p-3 rounded-lg leading-relaxed">
                      {analyzeError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
