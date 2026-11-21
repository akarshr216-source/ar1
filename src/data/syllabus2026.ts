import type { SubjectSyllabusSpec } from '../types.ts';

export const CBSE_2026_SYLLABUS: SubjectSyllabusSpec[] = [
  {
    subject: 'Science',
    code: '086',
    totalTheoryMarks: 80,
    internalMarks: 20,
    units: [
      {
        name: 'Unit I: Chemical Substances — Nature and Behaviour',
        marks: 25,
        chapters: [
          'Ch. 1: Chemical Reactions and Equations',
          'Ch. 2: Acids, Bases and Salts',
          'Ch. 3: Metals and Non-metals',
          'Ch. 4: Carbon and its Compounds',
        ],
      },
      {
        name: 'Unit II: World of Living',
        marks: 25,
        chapters: [
          'Ch. 5: Life Processes',
          'Ch. 6: Control and Coordination',
          'Ch. 7: How do Organisms Reproduce?',
          'Ch. 8: Heredity',
        ],
      },
      {
        name: 'Unit III: Natural Phenomena',
        marks: 12,
        chapters: [
          'Ch. 9: Light — Reflection and Refraction',
          'Ch. 10: The Human Eye and the Colourful World',
        ],
      },
      {
        name: 'Unit IV: Effects of Current',
        marks: 13,
        chapters: [
          'Ch. 11: Electricity',
          'Ch. 12: Magnetic Effects of Electric Current (excluding Electric Motor, EMI & Electric Generator)',
        ],
      },
      {
        name: 'Unit V: Natural Resources',
        marks: 5,
        chapters: ['Ch. 13: Our Environment'],
      },
    ],
    excludedTopics2026: [
      { topic: 'Periodic Classification of Elements', reason: 'Removed from rationalized NCERT & CBSE 2026 board syllabus' },
      { topic: 'Evolution (Darwinism, Speciation, Tracing Evolutionary Relationships)', reason: 'Only Heredity is retained in Ch. 8' },
      { topic: 'Electric Motor, Electromagnetic Induction & Electric Generator', reason: 'Removed from Magnetic Effects of Electric Current' },
      { topic: 'Sources of Energy & Sustainable Management of Natural Resources', reason: 'Excluded from 80-mark board theory paper' },
      { topic: 'Colour of the Sun at Sunrise and Sunset', reason: 'Deleted from Ch. 10 Human Eye' },
    ],
  },
  {
    subject: 'Social Science',
    code: '087',
    totalTheoryMarks: 80,
    internalMarks: 20,
    units: [
      {
        name: 'Unit 1: India and the Contemporary World — II (History)',
        marks: 20,
        chapters: [
          'Ch. 1: The Rise of Nationalism in Europe',
          'Ch. 2: Nationalism in India (including 2-mark Map Work)',
          'Ch. 3: The Making of a Global World (Subtopics 1 to 1.3 only: Pre-modern world to Conquest, Disease and Trade)',
          'Ch. 5: Print Culture and the Modern World',
        ],
      },
      {
        name: 'Unit 2: Contemporary India — II (Geography)',
        marks: 20,
        chapters: [
          'Ch. 1: Resources and Development',
          'Ch. 2: Forest and Wildlife Resources',
          'Ch. 3: Water Resources',
          'Ch. 4: Agriculture',
          'Ch. 5: Minerals and Energy Resources',
          'Ch. 6: Manufacturing Industries',
          'Ch. 7: Lifelines of National Economy (Map Work only)',
        ],
      },
      {
        name: 'Unit 3: Democratic Politics — II (Political Science)',
        marks: 20,
        chapters: [
          'Ch. 1: Power-sharing',
          'Ch. 2: Federalism',
          'Ch. 3: Gender, Religion and Caste',
          'Ch. 4: Political Parties',
          'Ch. 5: Outcomes of Democracy',
        ],
      },
      {
        name: 'Unit 4: Understanding Economic Development (Economics)',
        marks: 20,
        chapters: [
          'Ch. 1: Development',
          'Ch. 2: Sectors of the Indian Economy',
          'Ch. 3: Money and Credit',
          'Ch. 4: Globalisation and the Indian Economy (What is Globalisation & Factors enabling it)',
        ],
      },
    ],
    excludedTopics2026: [
      { topic: 'The Age of Industrialisation (History Ch. 4)', reason: 'Assessed only in Periodic Assessment, not in 2026 Board Exam' },
      { topic: 'The Making of a Global World (Subtopics 2 to 4.2)', reason: '19th century, Inter-war economy & Post-war reconstruction excluded from Board Exam' },
      { topic: 'Democracy and Diversity, Popular Struggles & Movements, Challenges to Democracy', reason: 'Deleted from rationalized Political Science textbook' },
      { topic: 'Lifelines of National Economy (Theory)', reason: 'Only Map items (Major Ports & International Airports) are tested in Board Exam' },
      { topic: 'Consumer Rights (Economics Ch. 5)', reason: 'Project work only; not tested in theory board paper' },
    ],
  },
  {
    subject: 'Mathematics',
    code: '041 / 241',
    totalTheoryMarks: 80,
    internalMarks: 20,
    units: [
      {
        name: 'Unit I: Number Systems',
        marks: 6,
        chapters: ['Ch. 1: Real Numbers (Fundamental Theorem of Arithmetic, Irrationality proofs)'],
      },
      {
        name: 'Unit II: Algebra',
        marks: 20,
        chapters: [
          'Ch. 2: Polynomials (Zeroes & Coefficient relationship)',
          'Ch. 3: Pair of Linear Equations in Two Variables (Graphical & Algebraic: Substitution, Elimination)',
          'Ch. 4: Quadratic Equations (Standard form, Factorisation, Quadratic formula, Discriminant)',
          'Ch. 5: Arithmetic Progressions (nth term, Sum of n terms)',
        ],
      },
      {
        name: 'Unit III: Coordinate Geometry',
        marks: 6,
        chapters: ['Ch. 7: Coordinate Geometry (Distance formula, Section formula internal division)'],
      },
      {
        name: 'Unit IV: Geometry',
        marks: 15,
        chapters: [
          'Ch. 6: Triangles (BPT/Thales Theorem proof, Similarity criteria AA/SSS/SAS)',
          'Ch. 10: Circles (Tangent perpendicular to radius, Equal tangents from external point)',
        ],
      },
      {
        name: 'Unit V: Trigonometry',
        marks: 12,
        chapters: [
          'Ch. 8: Introduction to Trigonometry (Ratios, Standard angles, sin²A + cos²A = 1)',
          'Ch. 9: Some Applications of Trigonometry (Heights & Distances)',
        ],
      },
      {
        name: 'Unit VI: Mensuration',
        marks: 10,
        chapters: [
          'Ch. 11: Areas Related to Circles (Sector & Segment areas)',
          'Ch. 12: Surface Areas and Volumes (Combinations of Cubes, Cuboids, Spheres, Hemispheres, Cones, Cylinders)',
        ],
      },
      {
        name: 'Unit VII: Statistics & Probability',
        marks: 11,
        chapters: [
          'Ch. 13: Statistics (Mean, Median, Mode of grouped data)',
          'Ch. 14: Probability (Classical definition & single-event problems)',
        ],
      },
    ],
    excludedTopics2026: [
      { topic: "Euclid's Division Lemma & Decimal Expansions", reason: 'Deleted from Ch. 1 Real Numbers' },
      { topic: 'Division Algorithm for Polynomials & Cross-Multiplication Method', reason: 'Removed from Algebra (Ch. 2 & Ch. 3)' },
      { topic: 'Completing the Square Method & Reducible Equations', reason: 'Excluded from Quadratic Equations (Ch. 4)' },
      { topic: 'Areas of Similar Triangles & Pythagoras Theorem Proof', reason: 'Deleted from Ch. 6 Triangles (only BPT proof remains)' },
      { topic: 'Area of a Triangle (Coordinate Geometry) & Trigonometric Ratios of Complementary Angles', reason: 'Removed from Ch. 7 & Ch. 8' },
      { topic: 'Frustum of a Cone & Conversion of Solid from One Shape to Another', reason: 'Removed from Surface Areas and Volumes' },
    ],
  },
];
