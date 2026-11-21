import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Repeat, CheckCircle2, Trash2 } from 'lucide-react';
import type { QuestionItem } from '../types.ts';

interface QuestionCardProps {
  question: QuestionItem;
  index: number;
  globalShowAnswers: boolean;
  onRemoveCustom?: (id: string) => void;
}

function formatAnswerLines(answer: string): string[] {
  return answer
    .replace(/\s+(\([a-d]\)\s)/g, '\n$1')
    .replace(/\s+(Case\s+\d+\s*\([^)]+\):)/g, '\n$1')
    .replace(/\s+(Theorem:|Rider:|Workers:|Muslim organisations:|Hugli Jute Basin:|Sugar shift[^:]*:)/g, '\n$1')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function QuestionCard({
  question,
  index,
  globalShowAnswers,
  onRemoveCustom,
}: QuestionCardProps) {
  const [isAnswerOpen, setIsAnswerOpen] = useState(globalShowAnswers);

  useEffect(() => {
    setIsAnswerOpen(globalShowAnswers);
  }, [globalShowAnswers]);

  const isRepeated = question.category === 'repeated';
  const answerLines = formatAnswerLines(question.markingSchemeAnswer);

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6 transition-colors hover:border-slate-300">
      {/* Unboxed typographic metadata row (Zero-Pill Discipline) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="font-mono-tabular font-semibold text-slate-900">
            Q{String(index + 1).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-slate-900">
            {question.subject} ({question.subjectCode})
          </span>
          <span aria-hidden="true">·</span>
          <span>{question.chapter}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular font-medium text-slate-800">
            {question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{question.questionType}</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {isRepeated ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#1D4ED8] font-mono-tabular">
              <Repeat className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Repeated {question.repeatCount || question.yearsAppeared.length}×</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#B91C1C]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Hardest / HOTS</span>
            </span>
          )}

          {question.source === 'live-cbse' && onRemoveCustom && (
            <button
              type="button"
              onClick={() => onRemoveCustom(question.id)}
              title="Remove extracted question"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Remove</span>
            </button>
          )}
        </div>
      </div>

      {/* Question Body */}
      <div className="pt-4 space-y-3">
        <h3 className="text-[16px] leading-relaxed font-semibold text-slate-900">
          {question.questionText}
        </h3>

        {question.options && question.options.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-2 pt-1 text-sm text-slate-700">
            {question.options.map((opt, idx) => (
              <li key={idx} className="py-1.5 px-3 bg-slate-50 rounded-md border border-slate-100">
                {opt}
              </li>
            ))}
          </ul>
        )}

        {question.subQuestions && question.subQuestions.length > 0 && (
          <ul className="space-y-1.5 pl-1 text-[15px] leading-relaxed text-slate-700">
            {question.subQuestions.map((sub, idx) => (
              <li key={idx}>{sub}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Paper Citations & Syllabus Verification Line */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono-tabular">
            Years: {question.yearsAppeared.join(', ')}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            Paper Codes: {question.paperCodes.join(', ')}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{question.syllabus2026Status}</span>
          </span>
          {question.source === 'live-cbse' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#1D4ED8] font-medium">Live Extracted from cbse.gov.in</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsAnswerOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{isAnswerOpen ? 'Hide Answer' : 'Show Answer'}</span>
          {isAnswerOpen ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Answer & Marking Scheme Breakdown */}
      {isAnswerOpen && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5 text-sm leading-relaxed text-slate-700">
          {!isRepeated && question.difficultyReason && (
            <p>
              <strong className="font-semibold text-slate-900">Why it is Hard: </strong>
              {question.difficultyReason}
            </p>
          )}
          {!isRepeated && question.commonTrap && (
            <p className="text-red-800">
              <strong className="font-semibold">Common Mistake Trap: </strong>
              {question.commonTrap}
            </p>
          )}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-800 space-y-1.5">
            <p className="text-xs font-semibold text-slate-900">
              Answer (CBSE Marking Scheme):
            </p>
            {answerLines.map((line, idx) => (
              <p key={idx} className="leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
