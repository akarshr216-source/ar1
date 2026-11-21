import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import PDFDocument from 'pdfkit';
import { GoogleGenAI, Type } from '@google/genai';
import type { CbseArchiveEntry, QuestionItem, SubjectName, ZipPdfEntry } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CBSE_SOURCE_URL = 'https://www.cbse.gov.in/cbsenew/question-paper.html';
const CBSE_BASE_PREFIX = 'https://www.cbse.gov.in/cbsenew/question-paper/';
const PORT = Number(process.env.PORT || 3000);

const FONT_PATHS = {
  sans: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  sansBold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  serif: '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
  serifBold: '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
  mono: '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
};

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets to run live CBSE PDF extraction.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ============================================================================
// CBSE HTML Catalog Scraper (cached 15 minutes)
// ============================================================================
let catalogCache: { fetchedAt: string; archives: CbseArchiveEntry[] } | null = null;
let catalogCacheTime = 0;

function normalizeSubjectFromUrlOrText(href: string, label: string): SubjectName | null {
  const combined = `${href} ${label}`.toLowerCase();
  // Exclude vocational / elective sciences
  if (
    combined.includes('home_science') ||
    combined.includes('home science') ||
    combined.includes('data_science') ||
    combined.includes('data science') ||
    combined.includes('foundation_skills') ||
    combined.includes('foundation skills') ||
    combined.includes('computer') ||
    combined.includes('political_science')
  ) {
    return null;
  }
  if (combined.includes('social')) return 'Social Science';
  if (combined.includes('science')) return 'Science';
  if (combined.includes('math')) return 'Mathematics';
  return null;
}

function isClassXLink(href: string, sectionHeading: string): boolean {
  const h = href.toLowerCase();
  const s = sectionHeading.toLowerCase();
  if (h.includes('/xii/') || s.includes('class xii')) return false;
  return h.includes('/x/') || h.includes('_x/') || s.includes('class x');
}

async function fetchCbseCatalog(): Promise<{ fetchedAt: string; archives: CbseArchiveEntry[] }> {
  const now = Date.now();
  if (catalogCache && now - catalogCacheTime < 15 * 60 * 1000) {
    return catalogCache;
  }

  const res = await fetch(CBSE_SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CBSECompendium/1.0)' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch CBSE archive page (${res.status} ${res.statusText})`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const archives: CbseArchiveEntry[] = [];
  const seenUrls = new Set<string>();

  $('a[href*="question-paper/"]').each((_, el) => {
    const rawHref = $(el).attr('href') || '';
    const fullUrl = rawHref.startsWith('http')
      ? rawHref
      : `https://www.cbse.gov.in/cbsenew/${rawHref.replace(/^\/+/, '')}`;

    if (seenUrls.has(fullUrl)) return;

    const row = $(el).closest('tr');
    const rowCells = row.find('td');
    const rowLabel = rowCells.first().text().trim() || $(el).text().trim();
    const fileTypeText = rowCells.eq(2).text().trim().toUpperCase();
    const fileSizeText = rowCells.eq(3).text().trim();

    const sectionHeading =
      $(el).closest('table').prevAll('h2, h3, .panel-heading').first().text().trim() ||
      $(el).closest('div').prevAll('h2, h3').first().text().trim() ||
      '';

    if (!isClassXLink(fullUrl, sectionHeading)) return;

    const subject = normalizeSubjectFromUrlOrText(fullUrl, rowLabel);
    if (!subject) return;

    const yearMatch = fullUrl.match(/question-paper\/(20\d{2})(-COMPTT)?\//i);
    const year = yearMatch ? yearMatch[1] : '2026';
    const isComptt = /comptt|second_board/i.test(fullUrl) || /compartment|second board/i.test(sectionHeading);
    const examType: CbseArchiveEntry['examType'] = isComptt
      ? 'Second Board / Compartment'
      : 'Main Examination';

    const fileType: 'ZIP' | 'PDF' = fullUrl.toLowerCase().endsWith('.pdf') || fileTypeText === 'PDF' ? 'PDF' : 'ZIP';

    let subjectLabel = rowLabel || subject;
    if (/math/i.test(subject)) {
      if (/basic|241|math_b/i.test(fullUrl)) subjectLabel = 'Mathematics Basic (241)';
      else subjectLabel = 'Mathematics Standard (041)';
    } else if (subject === 'Science') {
      subjectLabel = 'Science (086)';
    } else if (subject === 'Social Science') {
      subjectLabel = 'Social Science (087)';
    }

    seenUrls.add(fullUrl);
    archives.push({
      id: `${year}-${isComptt ? 'comptt' : 'main'}-${subjectLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
      year,
      examType,
      subject,
      subjectLabel,
      url: fullUrl,
      fileType,
      fileSize: fileSizeText || 'Archive',
    });
  });

  // Sort newest year first, Main before Compartment
  archives.sort((a, b) => {
    const yearDiff = Number(b.year) - Number(a.year);
    if (yearDiff !== 0) return yearDiff;
    if (a.examType !== b.examType) {
      return a.examType === 'Main Examination' ? -1 : 1;
    }
    return a.subjectLabel.localeCompare(b.subjectLabel);
  });

  catalogCache = {
    fetchedAt: new Date().toISOString(),
    archives,
  };
  catalogCacheTime = now;
  return catalogCache;
}

// ============================================================================
// HTTP Range-based ZIP Central Directory & Single PDF Extractor
// ============================================================================
function validateCbseUrl(url: string): void {
  if (!url || !url.startsWith(CBSE_BASE_PREFIX)) {
    throw new Error('Invalid archive URL: must belong to official cbse.gov.in question-paper archive.');
  }
}

async function listZipPdfEntries(zipUrl: string): Promise<{ totalBytes: number; entries: ZipPdfEntry[] }> {
  validateCbseUrl(zipUrl);

  const headRes = await fetch(zipUrl, {
    method: 'HEAD',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!headRes.ok) {
    throw new Error(`Unable to inspect CBSE archive (${headRes.status})`);
  }

  const contentLength = Number(headRes.headers.get('content-length') || 0);
  if (!contentLength) {
    throw new Error('Archive did not report content-length for range inspection.');
  }

  const tailWindow = Math.min(contentLength, 65536);
  const tailStart = contentLength - tailWindow;
  const rangeRes = await fetch(zipUrl, {
    headers: {
      Range: `bytes=${tailStart}-${contentLength - 1}`,
      'User-Agent': 'Mozilla/5.0',
    },
  });
  if (!rangeRes.ok && rangeRes.status !== 206) {
    throw new Error(`Range request failed (${rangeRes.status})`);
  }

  const tail = Buffer.from(await rangeRes.arrayBuffer());
  const eocdSig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocdIdx = tail.lastIndexOf(eocdSig);
  if (eocdIdx === -1) {
    throw new Error('ZIP End-of-Central-Directory signature not found in archive tail.');
  }

  const cdSize = tail.readUInt32LE(eocdIdx + 12);
  const cdOffset = tail.readUInt32LE(eocdIdx + 16);

  let cdBuf: Buffer;
  if (cdOffset >= tailStart && cdOffset + cdSize <= contentLength) {
    const rel = cdOffset - tailStart;
    cdBuf = tail.subarray(rel, rel + cdSize);
  } else {
    const cdRes = await fetch(zipUrl, {
      headers: {
        Range: `bytes=${cdOffset}-${cdOffset + cdSize - 1}`,
        'User-Agent': 'Mozilla/5.0',
      },
    });
    cdBuf = Buffer.from(await cdRes.arrayBuffer());
  }

  const entries: ZipPdfEntry[] = [];
  let pos = 0;
  while (pos + 46 <= cdBuf.length) {
    if (
      cdBuf[pos] !== 0x50 ||
      cdBuf[pos + 1] !== 0x4b ||
      cdBuf[pos + 2] !== 0x01 ||
      cdBuf[pos + 3] !== 0x02
    ) {
      break;
    }

    const compMethod = cdBuf.readUInt16LE(pos + 10);
    const compressedSize = cdBuf.readUInt32LE(pos + 20);
    const uncompressedSize = cdBuf.readUInt32LE(pos + 24);
    const fnameLen = cdBuf.readUInt16LE(pos + 28);
    const extraLen = cdBuf.readUInt16LE(pos + 30);
    const commentLen = cdBuf.readUInt16LE(pos + 32);
    const lfhOffset = cdBuf.readUInt32LE(pos + 42);
    const fileName = cdBuf.subarray(pos + 46, pos + 46 + fnameLen).toString('utf8');

    pos += 46 + fnameLen + extraLen + commentLen;

    if (fileName.toLowerCase().endsWith('.pdf') && !fileName.includes('__MACOSX')) {
      entries.push({
        fileName,
        compressedSize,
        uncompressedSize,
        compMethod,
        lfhOffset,
      });
    }
  }

  return { totalBytes: contentLength, entries };
}

async function extractPdfFromCbseZip(zipUrl: string, entry: ZipPdfEntry): Promise<Buffer> {
  validateCbseUrl(zipUrl);

  // Fetch Local File Header + compressed payload + generous slack for header extra field
  const fetchEnd = entry.lfhOffset + 30 + Buffer.byteLength(entry.fileName) + 1024 + entry.compressedSize;
  const res = await fetch(zipUrl, {
    headers: {
      Range: `bytes=${entry.lfhOffset}-${fetchEnd}`,
      'User-Agent': 'Mozilla/5.0',
    },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Failed to fetch PDF byte range for ${entry.fileName} (${res.status})`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 30 || buf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error(`Invalid ZIP Local File Header for ${entry.fileName}`);
  }

  const fnameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + fnameLen + extraLen;
  const compPayload = buf.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compMethod === 0) {
    return compPayload;
  }
  if (entry.compMethod === 8) {
    return zlib.inflateRawSync(compPayload);
  }
  throw new Error(`Unsupported ZIP compression method (${entry.compMethod}) for ${entry.fileName}`);
}

// ============================================================================
// Gemini Live CBSE PDF Extraction & 2026 Syllabus Verification
// ============================================================================
const EXCLUDED_TOPICS_PROMPT = `
STRICT CBSE 2026 CLASS X SYLLABUS FILTER (MUST EXCLUDE):
- Science (086): Exclude Periodic Classification of Elements, Evolution (Darwinism/Speciation), Electric Motor, Electromagnetic Induction, Electric Generator, Sources of Energy, Sustainable Management of Natural Resources, and Colour of Sun at Sunrise/Sunset.
- Social Science (087): Exclude Age of Industrialisation, Making of a Global World subtopics 2 to 4.2 (19th century/Inter-war/Post-war), Democracy & Diversity, Popular Struggles & Movements, Challenges to Democracy, Lifelines of National Economy theory (only Map items allowed), and Consumer Rights.
- Mathematics (041/241): Exclude Euclid's Division Lemma, Decimal Expansions, Division Algorithm for Polynomials, Cross-Multiplication Method, Completing the Square Method, Areas of Similar Triangles, Pythagoras Theorem Proof, Area of Triangle in Coordinate Geometry, Trigonometric Ratios of Complementary Angles, Frustum of a Cone, and Conversion of Solids.
If a question in the PDF belongs to any excluded topic above, DO NOT include it.`;

async function analyzeCbsePdfsWithGemini(
  subject: SubjectName,
  year: string,
  archiveUrl: string,
  pdfBuffers: { fileName: string; data: Buffer }[]
): Promise<QuestionItem[]> {
  const ai = getGeminiClient();

  const pdfParts = pdfBuffers.map((p) => ({
    inlineData: {
      mimeType: 'application/pdf',
      data: p.data.toString('base64'),
    },
  }));

  const prompt = `You are a senior CBSE Class X Board Examiner.
Analyze the attached official CBSE Class X ${subject} question paper PDF(s) from ${year} (downloaded from ${archiveUrl}).
Files analyzed: ${pdfBuffers.map((p) => p.fileName).join(', ')}.

TASK:
1. Extract the top 4 most-repeated / high-frequency board questions (category: "repeated") AND the top 4 hardest / HOTS / competency-trap questions (category: "hardest") directly from these official PDFs.
2. Verify EVERY extracted question against the CBSE 2026 Class X Syllabus.
${EXCLUDED_TOPICS_PROMPT}
3. For each question, return exact question wording (clean Unicode math/chemistry symbols like ², ³, √, θ, π, Δ, →, Ω, ∠), sub-parts if any, exact marks, paper code printed on the PDF (e.g. 31/4/1, 32/5/1, 30/4/1), chapter name, why it is repeated or why it is hardest (plus common student trap for hardest questions), and a concise CBSE marking-scheme answer.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [...pdfParts, { text: prompt }],
    },
    config: {
      systemInstruction:
        'Extract authentic CBSE board exam questions accurately from the attached PDFs, preserve numerical values and chemical equations faithfully, and strictly filter to the CBSE 2026 Class X Board Syllabus.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Either "repeated" or "hardest"',
            },
            unit: { type: Type.STRING },
            chapter: { type: Type.STRING },
            marks: { type: Type.INTEGER },
            questionType: { type: Type.STRING },
            questionText: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            subQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            paperCode: { type: Type.STRING },
            repeatCount: { type: Type.INTEGER },
            difficultyReason: { type: Type.STRING },
            commonTrap: { type: Type.STRING },
            syllabus2026Status: { type: Type.STRING },
            markingSchemeAnswer: { type: Type.STRING },
          },
          required: [
            'category',
            'unit',
            'chapter',
            'marks',
            'questionType',
            'questionText',
            'paperCode',
            'syllabus2026Status',
            'markingSchemeAnswer',
          ],
        },
      },
    },
  });

  const rawText = (response.text ?? '[]').trim();
  const parsed = JSON.parse(rawText) as Array<{
    category: string;
    unit: string;
    chapter: string;
    marks: number;
    questionType: string;
    questionText: string;
    options?: string[];
    subQuestions?: string[];
    paperCode: string;
    repeatCount?: number;
    difficultyReason?: string;
    commonTrap?: string;
    syllabus2026Status: string;
    markingSchemeAnswer: string;
  }>;

  const subjectCode = subject === 'Science' ? '086' : subject === 'Social Science' ? '087' : '041 / 241';

  return parsed.map((q, idx) => ({
    id: `live-${subject.toLowerCase().replace(/\s+/g, '-')}-${year}-${Date.now()}-${idx}`,
    subject,
    subjectCode,
    category: q.category === 'hardest' ? 'hardest' : 'repeated',
    unit: q.unit,
    chapter: q.chapter,
    marks: Number(q.marks) || 3,
    questionType: q.questionType || 'Board Question',
    questionText: q.questionText,
    options: q.options && q.options.length > 0 ? q.options : undefined,
    subQuestions: q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions : undefined,
    yearsAppeared: [year],
    paperCodes: q.paperCode ? [q.paperCode] : ['Official PDF'],
    repeatCount: q.category === 'repeated' ? q.repeatCount || 3 : undefined,
    difficultyReason: q.difficultyReason,
    commonTrap: q.commonTrap,
    syllabus2026Status: q.syllabus2026Status || 'In 2026 Syllabus',
    markingSchemeAnswer: q.markingSchemeAnswer,
    source: 'live-cbse',
    sourceArchiveUrl: archiveUrl,
  }));
}

// ============================================================================
// PDFKit Publication-Grade Separate PDF Generator
// ============================================================================
function renderCompendiumPdf(params: {
  kind: 'repeated' | 'hardest';
  subjectFilter: 'All' | SubjectName;
  questions: QuestionItem[];
  includeAnswers: boolean;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 54, bottom: 54, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title:
          params.kind === 'repeated'
            ? 'CBSE Class X 2026 Boards — Repeated & High-Frequency Questions'
            : 'CBSE Class X 2026 Boards — Hardest & HOTS Questions',
        Author: 'CBSE 2026 Board Compendium',
        Subject: `Class X ${params.subjectFilter} (${params.kind})`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const hasDejaVu = fs.existsSync(FONT_PATHS.sans) && fs.existsSync(FONT_PATHS.serif);
    const fontSans = hasDejaVu ? 'DejaVuSans' : 'Helvetica';
    const fontSansBold = hasDejaVu ? 'DejaVuSansBold' : 'Helvetica-Bold';
    const fontSerif = hasDejaVu ? 'DejaVuSerif' : 'Times-Roman';
    const fontSerifBold = hasDejaVu ? 'DejaVuSerifBold' : 'Times-Bold';
    const fontMono = hasDejaVu && fs.existsSync(FONT_PATHS.mono) ? 'DejaVuMono' : 'Courier';

    if (hasDejaVu) {
      doc.registerFont('DejaVuSans', FONT_PATHS.sans);
      doc.registerFont('DejaVuSansBold', FONT_PATHS.sansBold);
      doc.registerFont('DejaVuSerif', FONT_PATHS.serif);
      doc.registerFont('DejaVuSerifBold', FONT_PATHS.serifBold);
      if (fs.existsSync(FONT_PATHS.mono)) {
        doc.registerFont('DejaVuMono', FONT_PATHS.mono);
      }
    }

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const isRepeated = params.kind === 'repeated';
    const accentHex = isRepeated ? '#1D4ED8' : '#B91C1C';
    const accentBgHex = isRepeated ? '#EFF6FF' : '#FEF2F2';

    // Header Banner
    doc
      .rect(doc.page.margins.left, doc.y, pageW, 84)
      .fill('#0F172A');

    const bannerTop = doc.y;
    doc
      .font(fontSansBold)
      .fontSize(8.5)
      .fillColor('#93C5FD')
      .text(
        `CBSE CLASS X · 2026 BOARD EXAMINATION SYLLABUS · ${params.subjectFilter.toUpperCase()}`,
        doc.page.margins.left + 18,
        bannerTop + 14,
        { width: pageW - 36 }
      );

    doc
      .font(fontSerifBold)
      .fontSize(18)
      .fillColor('#FFFFFF')
      .text(
        isRepeated
          ? 'Repeated & High-Frequency Board Questions'
          : 'Hardest, HOTS & Competency Board Questions',
        doc.page.margins.left + 18,
        bannerTop + 30,
        { width: pageW - 36 }
      );

    doc
      .font(fontSans)
      .fontSize(8.5)
      .fillColor('#CBD5E1')
      .text(
        `Source: cbse.gov.in/cbsenew/question-paper.html · Total Questions: ${params.questions.length} · ${
          params.includeAnswers ? 'Includes Full Answers & Marking Scheme' : 'Practice Paper Mode (Questions Only)'
        }`,
        doc.page.margins.left + 18,
        bannerTop + 58,
        { width: pageW - 36 }
      );

    doc.y = bannerTop + 98;

    const subjectsOrder: SubjectName[] = ['Science', 'Social Science', 'Mathematics'];
    let globalCounter = 1;

    for (const subj of subjectsOrder) {
      const subjItems = params.questions.filter((q) => q.subject === subj);
      if (subjItems.length === 0) continue;

      if (doc.y > doc.page.height - 140) {
        doc.addPage();
      }

      const code = subj === 'Science' ? '086' : subj === 'Social Science' ? '087' : '041 / 241';

      // Subject section header
      doc
        .font(fontSerifBold)
        .fontSize(14)
        .fillColor('#0F172A')
        .text(`${subj} (Code ${code}) — ${subjItems.length} Questions`, doc.page.margins.left, doc.y);

      doc
        .moveTo(doc.page.margins.left, doc.y + 4)
        .lineTo(doc.page.margins.left + pageW, doc.y + 4)
        .strokeColor('#CBD5E1')
        .lineWidth(1)
        .stroke();

      doc.moveDown(0.7);

      for (const item of subjItems) {
        if (doc.y > doc.page.height - 165) {
          doc.addPage();
        }

        const qNum = globalCounter++;
        const metaParts = [
          `Q${qNum}`,
          `${item.marks} Marks`,
          item.questionType,
          item.chapter,
          `Years: ${item.yearsAppeared.join(', ')}`,
          `Codes: ${item.paperCodes.join(', ')}`,
        ];
        if (isRepeated && item.repeatCount) {
          metaParts.push(`Repeated ${item.repeatCount}×`);
        }

        // Metadata line
        doc
          .font(fontMono)
          .fontSize(7.8)
          .fillColor(accentHex)
          .text(metaParts.join('  ·  '), doc.page.margins.left, doc.y, { width: pageW });

        doc.moveDown(0.25);

        // Question text
        doc
          .font(fontSansBold)
          .fontSize(10.2)
          .fillColor('#0F172A')
          .text(item.questionText, doc.page.margins.left, doc.y, {
            width: pageW,
            lineGap: 2.5,
          });

        if (item.options && item.options.length > 0) {
          doc.moveDown(0.2);
          for (const opt of item.options) {
            doc
              .font(fontSans)
              .fontSize(9.5)
              .fillColor('#334155')
              .text(`    ${opt}`, doc.page.margins.left, doc.y, { width: pageW - 12, lineGap: 2 });
          }
        }

        if (item.subQuestions && item.subQuestions.length > 0) {
          doc.moveDown(0.2);
          for (const sub of item.subQuestions) {
            doc
              .font(fontSans)
              .fontSize(9.5)
              .fillColor('#1E293B')
              .text(`    ${sub}`, doc.page.margins.left, doc.y, { width: pageW - 12, lineGap: 2 });
          }
        }

        // Syllabus / Trap / Difficulty reason line
        if (!isRepeated && (item.difficultyReason || item.commonTrap)) {
          doc.moveDown(0.25);
          if (item.difficultyReason) {
            doc
              .font(fontSans)
              .fontSize(8.5)
              .fillColor('#475569')
              .text(`Why it is Hard: ${item.difficultyReason}`, doc.page.margins.left, doc.y, {
                width: pageW,
                lineGap: 1.5,
              });
          }
          if (item.commonTrap) {
            doc
              .font(fontSans)
              .fontSize(8.5)
              .fillColor('#991B1B')
              .text(`Common Mistake Trap: ${item.commonTrap}`, doc.page.margins.left, doc.y, {
                width: pageW,
                lineGap: 1.5,
              });
          }
        }

        // Marking Scheme Solution box
        if (params.includeAnswers && item.markingSchemeAnswer) {
          doc.moveDown(0.3);
          const formattedAnswer = item.markingSchemeAnswer
            .replace(/\s+(\([a-d]\)\s)/g, '\n$1')
            .replace(/\s+(Case\s+\d+\s*\([^)]+\):)/g, '\n$1')
            .replace(/\s+(Theorem:|Rider:|Workers:|Muslim organisations:|Hugli Jute Basin:|Sugar shift[^:]*:)/g, '\n$1');
          const ansText = `Answer (CBSE Marking Scheme):\n${formattedAnswer}`;
          const textHeight = doc
            .font(fontSans)
            .fontSize(8.8)
            .heightOfString(ansText, { width: pageW - 20, lineGap: 2 });

          if (doc.y + textHeight + 18 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
          }

          const boxTop = doc.y;
          doc
            .rect(doc.page.margins.left, boxTop, pageW, textHeight + 14)
            .fill(accentBgHex);

          doc
            .font(fontSans)
            .fontSize(8.8)
            .fillColor('#1E293B')
            .text(ansText, doc.page.margins.left + 10, boxTop + 7, {
              width: pageW - 20,
              lineGap: 2,
            });

          doc.y = boxTop + textHeight + 18;
        } else {
          doc.moveDown(0.45);
        }

        // Subtle divider between questions
        doc
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageW, doc.y)
          .strokeColor('#E2E8F0')
          .lineWidth(0.5)
          .stroke();

        doc.moveDown(0.6);
      }

      doc.moveDown(0.5);
    }

    // Add page numbers on every buffered page
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .font(fontMono)
        .fontSize(7.5)
        .fillColor('#64748B')
        .text(
          `CBSE 2026 Board Compendium · ${isRepeated ? 'Repeated Questions' : 'Hardest Questions'} · Page ${i + 1} of ${range.count}`,
          doc.page.margins.left,
          doc.page.height - 34,
          { width: pageW, align: 'center' }
        );
    }

    doc.end();
  });
}

// ============================================================================
// Express App & Routes
// ============================================================================
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/cbse/catalog', async (_req, res) => {
    try {
      const catalog = await fetchCbseCatalog();
      res.json({
        sourceUrl: CBSE_SOURCE_URL,
        ...catalog,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load CBSE question paper catalog';
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/cbse/zip-entries', async (req, res) => {
    try {
      const url = typeof req.query.url === 'string' ? req.query.url : '';
      validateCbseUrl(url);
      if (url.toLowerCase().endsWith('.pdf')) {
        res.json({
          totalBytes: 0,
          entries: [
            {
              fileName: path.basename(url),
              compressedSize: 0,
              uncompressedSize: 0,
              compMethod: 0,
              lfhOffset: 0,
            },
          ],
        });
        return;
      }
      const data = await listZipPdfEntries(url);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read CBSE ZIP entries';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/cbse/analyze', async (req, res) => {
    try {
      const { subject, year, archiveUrl, selectedFileNames } = req.body as {
        subject?: SubjectName;
        year?: string;
        archiveUrl?: string;
        selectedFileNames?: string[];
      };

      if (!subject || !['Science', 'Social Science', 'Mathematics'].includes(subject)) {
        res.status(400).json({ error: 'Invalid subject specified.' });
        return;
      }
      if (!archiveUrl || typeof archiveUrl !== 'string') {
        res.status(400).json({ error: 'archiveUrl is required.' });
        return;
      }
      validateCbseUrl(archiveUrl);

      const pdfBuffers: { fileName: string; data: Buffer }[] = [];

      if (archiveUrl.toLowerCase().endsWith('.pdf')) {
        const pdfRes = await fetch(archiveUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!pdfRes.ok) {
          throw new Error(`Failed to fetch PDF (${pdfRes.status})`);
        }
        pdfBuffers.push({
          fileName: path.basename(archiveUrl),
          data: Buffer.from(await pdfRes.arrayBuffer()),
        });
      } else {
        const { entries } = await listZipPdfEntries(archiveUrl);
        if (entries.length === 0) {
          throw new Error('No PDF files found inside this CBSE ZIP archive.');
        }

        let chosenEntries: ZipPdfEntry[] = [];
        if (Array.isArray(selectedFileNames) && selectedFileNames.length > 0) {
          chosenEntries = entries.filter((e) => selectedFileNames.includes(e.fileName)).slice(0, 2);
        }

        if (chosenEntries.length === 0) {
          // Prefer distinct paper sets and under 2.5 MB each for crisp extraction
          const reasonable = entries.filter((e) => e.uncompressedSize < 3_500_000);
          const pool = reasonable.length > 0 ? reasonable : entries;
          chosenEntries = pool.slice(0, 2);
        }

        for (const entry of chosenEntries) {
          const data = await extractPdfFromCbseZip(archiveUrl, entry);
          pdfBuffers.push({ fileName: entry.fileName, data });
        }
      }

      const extractedQuestions = await analyzeCbsePdfsWithGemini(
        subject,
        year || '2026',
        archiveUrl,
        pdfBuffers
      );

      res.json({
        extractedQuestions,
        analyzedFiles: pdfBuffers.map((p) => p.fileName),
        archiveUrl,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CBSE PDF analysis failed';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/pdf/export', async (req, res) => {
    try {
      const { kind, subjectFilter, questions, includeAnswers } = req.body as {
        kind?: 'repeated' | 'hardest';
        subjectFilter?: 'All' | SubjectName;
        questions?: QuestionItem[];
        includeAnswers?: boolean;
      };

      if (kind !== 'repeated' && kind !== 'hardest') {
        res.status(400).json({ error: 'Export kind must be "repeated" or "hardest".' });
        return;
      }
      if (!Array.isArray(questions) || questions.length === 0) {
        res.status(400).json({ error: 'No questions supplied for PDF export.' });
        return;
      }

      const safeFilter: 'All' | SubjectName =
        subjectFilter === 'Science' || subjectFilter === 'Social Science' || subjectFilter === 'Mathematics'
          ? subjectFilter
          : 'All';

      const filtered = questions.filter((q) => {
        if (q.category !== kind) return false;
        if (safeFilter !== 'All' && q.subject !== safeFilter) return false;
        return true;
      });

      if (filtered.length === 0) {
        res.status(400).json({ error: 'No matching questions found for this PDF filter.' });
        return;
      }

      const pdfBuffer = await renderCompendiumPdf({
        kind,
        subjectFilter: safeFilter,
        questions: filtered,
        includeAnswers: includeAnswers !== false,
      });

      const subjSlug = safeFilter === 'All' ? 'All_Subjects' : safeFilter.replace(/\s+/g, '_');
      const fileName =
        kind === 'repeated'
          ? `CBSE_2026_Repeated_Questions_${subjSlug}.pdf`
          : `CBSE_2026_Hardest_Questions_${subjSlug}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.send(pdfBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF generation failed';
      res.status(500).json({ error: message });
    }
  });

  // Vite dev middleware vs Production static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CBSE 2026 Board Compendium server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
