export type SubjectName = 'Science' | 'Social Science' | 'Mathematics';

export type QuestionCategory = 'repeated' | 'hardest';

export interface QuestionItem {
  id: string;
  subject: SubjectName;
  subjectCode: string;
  category: QuestionCategory;
  unit: string;
  chapter: string;
  marks: number;
  questionType: string;
  questionText: string;
  options?: string[];
  subQuestions?: string[];
  yearsAppeared: string[];
  paperCodes: string[];
  repeatCount?: number;
  difficultyReason?: string;
  commonTrap?: string;
  syllabus2026Status: string;
  markingSchemeAnswer: string;
  source: 'baseline' | 'live-cbse';
  sourceArchiveUrl?: string;
}

export interface CbseArchiveEntry {
  id: string;
  year: string;
  examType: 'Main Examination' | 'Second Board / Compartment';
  subject: SubjectName;
  subjectLabel: string;
  url: string;
  fileType: 'ZIP' | 'PDF';
  fileSize: string;
}

export interface ZipPdfEntry {
  fileName: string;
  compressedSize: number;
  uncompressedSize: number;
  compMethod: number;
  lfhOffset: number;
}

export interface SubjectSyllabusSpec {
  subject: SubjectName;
  code: string;
  totalTheoryMarks: number;
  internalMarks: number;
  units: {
    name: string;
    marks: number;
    chapters: string[];
  }[];
  excludedTopics2026: {
    topic: string;
    reason: string;
  }[];
}
