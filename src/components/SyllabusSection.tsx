import { useState } from 'react';
import { Check, XCircle } from 'lucide-react';
import { CBSE_2026_SYLLABUS } from '../data/syllabus2026.ts';
import type { SubjectName } from '../types.ts';

export function SyllabusSection() {
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Science');
  const current = CBSE_2026_SYLLABUS.find((s) => s.subject === selectedSubject) || CBSE_2026_SYLLABUS[0];

  return (
    <section id="syllabus" className="py-16 border-t border-slate-200">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">
            2026 Rationalized NCERT &amp; CBSE Curriculum Filter
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            2026 Board Syllabus Verification
          </h2>
          <p className="mt-2 text-[15px] text-slate-600 max-w-2xl leading-relaxed">
            Every repeated and hardest question in both PDF booklets is strictly verified against the 2026 Class X theory syllabus. Deleted chapters from older 2022–2023 papers are automatically excluded.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start">
          {CBSE_2026_SYLLABUS.map((spec) => (
            <button
              key={spec.subject}
              type="button"
              onClick={() => setSelectedSubject(spec.subject)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSubject === spec.subject
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {spec.subject} ({spec.code})
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Included Units & Chapters */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              In-Syllabus Units for {current.subject} (2026)
            </h3>
            <span className="font-mono-tabular text-xs font-medium text-slate-600">
              {current.totalTheoryMarks} Theory + {current.internalMarks} Internal = 100 Marks
            </span>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {current.units.map((unit) => (
              <div key={unit.name} className="py-4 first:pt-2 last:pb-0">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h4 className="text-sm font-semibold text-slate-900">{unit.name}</h4>
                  <span className="font-mono-tabular text-xs font-semibold text-[#1D4ED8] whitespace-nowrap shrink-0">
                    {unit.marks} Marks
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {unit.chapters.map((ch) => (
                    <li key={ch} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{ch}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Excluded Topics Guardrail */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">
              Excluded from 2026 Board Exam
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Questions from these older archive topics are filtered out during analysis and PDF export.
            </p>
          </div>

          <ul className="divide-y divide-slate-100 mt-2">
            {current.excludedTopics2026.map((item) => (
              <li key={item.topic} className="py-3.5 first:pt-2 last:pb-0 flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-[#B91C1C] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.topic}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
