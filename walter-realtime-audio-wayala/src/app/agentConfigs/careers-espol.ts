// careers-espol.ts
// Matriz vocacional para Walter.
// Catálogo base: oferta académica oficial de ESPOL consultada en agosto de 2026.
// Nutrición y Dietética se incluye desde la oferta oficial de FCV.

export const VOCATIONAL_TAGS = [
  'technology',
  'programming',
  'software',
  'ai',
  'data',
  'mathematics',
  'statistics',
  'physics',
  'chemistry',
  'biology',
  'health',
  'nutrition',
  'food',
  'animals',
  'plants',
  'nature',
  'ocean',
  'agriculture',
  'sustainability',
  'research',
  'laboratory',
  'robotics',
  'electronics',
  'electricity',
  'automation',
  'mechanics',
  'machines',
  'energy',
  'construction',
  'geology',
  'mining',
  'petroleum',
  'ships',
  'design',
  'drawing',
  'creativity',
  'audiovisual',
  'photography',
  'animation',
  'videogames',
  'communication',
  'history',
  'culture',
  'travel',
  'business',
  'leadership',
  'entrepreneurship',
  'finance',
  'economics',
  'organization',
  'logistics',
  'problem_solving',
  'building',
  'experimenting',
  'analyzing',
  'planning',
  'helping_people',
  'working_with_people',
  'fieldwork',
  'office',
  'remote_work',
  'industry',
  'factory',
  'outdoors'
] as const;

export type VocationalTag = typeof VOCATIONAL_TAGS[number];

export type Career = {
  id: string;
  name: string;
  faculty: 'FADCOM' | 'FCSH' | 'FCV' | 'FCNM' | 'FICT' | 'FIEC' | 'FIMCM' | 'FIMCP';
  interests: VocationalTag[];
  activities: VocationalTag[];
  subjects: VocationalTag[];
  environments: VocationalTag[];
  avoidIf: VocationalTag[];
};

export const careers: Career[] = [
  {
    id: 'acuicultura',
    name: 'Acuicultura',
    faculty: 'FIMCM',
    interests: ['biology', 'animals', 'ocean', 'nature', 'sustainability'],
    activities: ['research', 'experimenting', 'problem_solving'],
    subjects: ['biology', 'chemistry'],
    environments: ['laboratory', 'fieldwork', 'outdoors'],
    avoidIf: ['animals', 'biology', 'fieldwork']
  },
  {
    id: 'administracion-empresas',
    name: 'Administración de Empresas',
    faculty: 'FCSH',
    interests: ['business', 'leadership', 'entrepreneurship', 'organization'],
    activities: ['planning', 'working_with_people', 'problem_solving'],
    subjects: ['economics', 'mathematics'],
    environments: ['office'],
    avoidIf: ['business', 'working_with_people', 'organization']
  },
  {
    id: 'alimentos',
    name: 'Alimentos',
    faculty: 'FIMCP',
    interests: ['chemistry', 'biology', 'food', 'industry', 'sustainability'] as VocationalTag[],
    activities: ['experimenting', 'research', 'problem_solving'],
    subjects: ['chemistry', 'biology', 'mathematics'],
    environments: ['laboratory', 'factory', 'industry'],
    avoidIf: ['chemistry', 'laboratory', 'factory']
  },
  {
    id: 'animacion-videojuegos',
    name: 'Animación Digital y Videojuegos',
    faculty: 'FADCOM',
    interests: ['animation', 'videogames', 'design', 'creativity', 'technology'],
    activities: ['drawing', 'design', 'building', 'problem_solving'],
    subjects: ['technology'],
    environments: ['office', 'remote_work'],
    avoidIf: ['animation', 'design', 'videogames']
  },
  {
    id: 'arqueologia',
    name: 'Arqueología',
    faculty: 'FCSH',
    interests: ['history', 'culture', 'research', 'nature'],
    activities: ['research', 'analyzing', 'fieldwork'],
    subjects: ['history'],
    environments: ['fieldwork', 'outdoors', 'laboratory'],
    avoidIf: ['history', 'fieldwork', 'research']
  },
  {
    id: 'auditoria-control',
    name: 'Auditoría y Control de Gestión',
    faculty: 'FCSH',
    interests: ['business', 'finance', 'data', 'organization'],
    activities: ['analyzing', 'planning', 'problem_solving'],
    subjects: ['mathematics', 'statistics', 'economics'],
    environments: ['office'],
    avoidIf: ['finance', 'analyzing', 'office']
  },
  {
    id: 'biologia',
    name: 'Biología',
    faculty: 'FCV',
    interests: ['biology', 'animals', 'plants', 'nature', 'research', 'sustainability'],
    activities: ['research', 'experimenting', 'analyzing'],
    subjects: ['biology', 'chemistry'],
    environments: ['laboratory', 'fieldwork', 'outdoors'],
    avoidIf: ['biology', 'laboratory', 'fieldwork']
  },
  {
    id: 'ciencia-datos-ia',
    name: 'Ciencia de Datos e Inteligencia Artificial',
    faculty: 'FIEC',
    interests: ['ai', 'data', 'programming', 'technology', 'mathematics', 'statistics'],
    activities: ['analyzing', 'problem_solving', 'programming'],
    subjects: ['mathematics', 'statistics', 'technology'],
    environments: ['office', 'remote_work'],
    avoidIf: ['programming', 'mathematics', 'data']
  },
  {
    id: 'computacion',
    name: 'Computación',
    faculty: 'FIEC',
    interests: ['programming', 'software', 'technology', 'ai', 'videogames'],
    activities: ['programming', 'building', 'problem_solving'],
    subjects: ['mathematics', 'technology'],
    environments: ['office', 'remote_work'],
    avoidIf: ['programming', 'technology']
  },
  {
    id: 'diseno-productos',
    name: 'Diseño de Productos',
    faculty: 'FADCOM',
    interests: ['design', 'creativity', 'building', 'technology'],
    activities: ['design', 'building', 'problem_solving'],
    subjects: ['technology'],
    environments: ['office', 'laboratory'],
    avoidIf: ['design', 'building']
  },
  {
    id: 'diseno-grafico',
    name: 'Diseño Gráfico',
    faculty: 'FADCOM',
    interests: ['design', 'drawing', 'creativity', 'communication'],
    activities: ['drawing', 'design', 'building'],
    subjects: [],
    environments: ['office', 'remote_work'],
    avoidIf: ['design', 'drawing', 'communication']
  },
  {
    id: 'economia',
    name: 'Economía',
    faculty: 'FCSH',
    interests: ['economics', 'mathematics', 'data', 'finance', 'business'],
    activities: ['analyzing', 'research', 'problem_solving'],
    subjects: ['mathematics', 'statistics', 'economics'],
    environments: ['office', 'remote_work'],
    avoidIf: ['mathematics', 'economics', 'analyzing']
  },
  {
    id: 'electricidad',
    name: 'Electricidad',
    faculty: 'FIEC',
    interests: ['electricity', 'energy', 'physics', 'technology', 'sustainability'],
    activities: ['problem_solving', 'building', 'analyzing'],
    subjects: ['physics', 'mathematics'],
    environments: ['industry', 'fieldwork', 'office'],
    avoidIf: ['physics', 'electricity', 'mathematics']
  },
  {
    id: 'electronica-automatizacion',
    name: 'Electrónica y Automatización',
    faculty: 'FIEC',
    interests: ['electronics', 'automation', 'robotics', 'technology', 'programming'],
    activities: ['building', 'experimenting', 'problem_solving', 'programming'],
    subjects: ['physics', 'mathematics', 'technology'],
    environments: ['laboratory', 'industry', 'factory'],
    avoidIf: ['electronics', 'physics', 'automation']
  },
  {
    id: 'estadistica',
    name: 'Estadística',
    faculty: 'FCNM',
    interests: ['statistics', 'data', 'mathematics', 'research'],
    activities: ['analyzing', 'research', 'problem_solving'],
    subjects: ['mathematics', 'statistics'],
    environments: ['office', 'remote_work'],
    avoidIf: ['mathematics', 'statistics', 'data']
  },
  {
    id: 'geologia',
    name: 'Geología',
    faculty: 'FICT',
    interests: ['geology', 'nature', 'research', 'outdoors'],
    activities: ['fieldwork', 'research', 'analyzing'],
    subjects: ['physics', 'chemistry'],
    environments: ['fieldwork', 'outdoors', 'laboratory'],
    avoidIf: ['fieldwork', 'geology', 'outdoors']
  },
  {
    id: 'ingenieria-agricola-biologica',
    name: 'Ingeniería Agrícola y Biológica',
    faculty: 'FCV',
    interests: ['plants', 'agriculture', 'biology', 'technology', 'sustainability'],
    activities: ['fieldwork', 'problem_solving', 'experimenting'],
    subjects: ['biology', 'chemistry', 'mathematics'],
    environments: ['outdoors', 'fieldwork', 'laboratory'],
    avoidIf: ['agriculture', 'fieldwork', 'plants']
  },
  {
    id: 'ingenieria-civil',
    name: 'Ingeniería Civil',
    faculty: 'FICT',
    interests: ['construction', 'building', 'physics', 'mathematics'],
    activities: ['building', 'planning', 'problem_solving'],
    subjects: ['mathematics', 'physics'],
    environments: ['fieldwork', 'outdoors', 'office'],
    avoidIf: ['construction', 'fieldwork', 'mathematics']
  },
  {
    id: 'ingenieria-industrial',
    name: 'Ingeniería Industrial',
    faculty: 'FIMCP',
    interests: ['industry', 'organization', 'business', 'data', 'leadership'],
    activities: ['planning', 'analyzing', 'problem_solving'],
    subjects: ['mathematics', 'statistics'],
    environments: ['industry', 'factory', 'office'],
    avoidIf: ['organization', 'industry', 'planning']
  },
  {
    id: 'ingenieria-naval',
    name: 'Ingeniería Naval',
    faculty: 'FIMCM',
    interests: ['ships', 'ocean', 'mechanics', 'physics', 'design'],
    activities: ['design', 'building', 'problem_solving'],
    subjects: ['mathematics', 'physics'],
    environments: ['industry', 'fieldwork', 'outdoors'],
    avoidIf: ['ships', 'mechanics', 'physics']
  },
  {
    id: 'ingenieria-quimica',
    name: 'Ingeniería Química',
    faculty: 'FCNM',
    interests: ['chemistry', 'industry', 'research', 'sustainability'],
    activities: ['experimenting', 'analyzing', 'problem_solving'],
    subjects: ['chemistry', 'mathematics', 'physics'],
    environments: ['laboratory', 'factory', 'industry'],
    avoidIf: ['chemistry', 'laboratory', 'factory']
  },
  {
    id: 'logistica-transporte',
    name: 'Logística y Transporte',
    faculty: 'FCNM',
    interests: ['logistics', 'organization', 'data', 'business'],
    activities: ['planning', 'analyzing', 'problem_solving'],
    subjects: ['mathematics', 'statistics'],
    environments: ['office', 'industry'],
    avoidIf: ['logistics', 'planning', 'organization']
  },
  {
    id: 'matematica',
    name: 'Matemática',
    faculty: 'FCNM',
    interests: ['mathematics', 'research', 'data', 'problem_solving'],
    activities: ['analyzing', 'research', 'problem_solving'],
    subjects: ['mathematics'],
    environments: ['office', 'remote_work', 'research'] as VocationalTag[],
    avoidIf: ['mathematics']
  },
  {
    id: 'materiales',
    name: 'Materiales',
    faculty: 'FIMCP',
    interests: ['chemistry', 'physics', 'research', 'industry', 'sustainability'],
    activities: ['experimenting', 'research', 'analyzing'],
    subjects: ['chemistry', 'physics', 'mathematics'],
    environments: ['laboratory', 'industry', 'factory'],
    avoidIf: ['laboratory', 'chemistry', 'physics']
  },
  {
    id: 'mecanica',
    name: 'Mecánica',
    faculty: 'FIMCP',
    interests: ['mechanics', 'machines', 'physics', 'design', 'energy'],
    activities: ['building', 'design', 'problem_solving'],
    subjects: ['physics', 'mathematics'],
    environments: ['industry', 'factory', 'laboratory'],
    avoidIf: ['mechanics', 'machines', 'physics']
  },
  {
    id: 'mecatronica',
    name: 'Mecatrónica',
    faculty: 'FIMCP',
    interests: ['robotics', 'mechanics', 'electronics', 'automation', 'programming', 'technology'],
    activities: ['building', 'programming', 'experimenting', 'problem_solving'],
    subjects: ['physics', 'mathematics', 'technology'],
    environments: ['laboratory', 'industry', 'factory'],
    avoidIf: ['mechanics', 'electronics', 'physics']
  },
  {
    id: 'minas',
    name: 'Minas',
    faculty: 'FICT',
    interests: ['mining', 'geology', 'machines', 'industry', 'outdoors'],
    activities: ['fieldwork', 'planning', 'problem_solving'],
    subjects: ['mathematics', 'physics', 'chemistry'],
    environments: ['fieldwork', 'outdoors', 'industry'],
    avoidIf: ['mining', 'fieldwork', 'industry']
  },
  {
    id: 'nutricion-dietetica',
    name: 'Nutrición y Dietética',
    faculty: 'FCV',
    interests: ['nutrition', 'health', 'biology', 'helping_people'],
    activities: ['helping_people', 'analyzing', 'planning'],
    subjects: ['biology', 'chemistry'],
    environments: ['office', 'laboratory'],
    avoidIf: ['health', 'nutrition', 'working_with_people']
  },
  {
    id: 'oceanografia',
    name: 'Oceanografía',
    faculty: 'FIMCM',
    interests: ['ocean', 'nature', 'research', 'physics', 'sustainability'],
    activities: ['research', 'fieldwork', 'analyzing'],
    subjects: ['physics', 'mathematics', 'chemistry'],
    environments: ['fieldwork', 'outdoors', 'laboratory'],
    avoidIf: ['ocean', 'fieldwork', 'research']
  },
  {
    id: 'petroleos',
    name: 'Petróleos',
    faculty: 'FICT',
    interests: ['petroleum', 'energy', 'geology', 'industry'],
    activities: ['fieldwork', 'planning', 'problem_solving'],
    subjects: ['mathematics', 'physics', 'chemistry'],
    environments: ['fieldwork', 'industry', 'outdoors'],
    avoidIf: ['petroleum', 'fieldwork', 'industry']
  },
  {
    id: 'produccion-medios',
    name: 'Producción para Medios de Comunicación',
    faculty: 'FADCOM',
    interests: ['audiovisual', 'photography', 'communication', 'creativity'],
    activities: ['building', 'planning', 'design'],
    subjects: [],
    environments: ['office', 'outdoors'],
    avoidIf: ['audiovisual', 'communication']
  },
  {
    id: 'telecomunicaciones',
    name: 'Telecomunicaciones',
    faculty: 'FIEC',
    interests: ['technology', 'electronics', 'communication', 'physics'],
    activities: ['problem_solving', 'analyzing', 'building'],
    subjects: ['physics', 'mathematics'],
    environments: ['office', 'fieldwork', 'industry'],
    avoidIf: ['physics', 'electronics']
  },
  {
    id: 'telematica',
    name: 'Telemática',
    faculty: 'FIEC',
    interests: ['technology', 'programming', 'software', 'communication'],
    activities: ['programming', 'problem_solving', 'building'],
    subjects: ['mathematics', 'technology'],
    environments: ['office', 'remote_work'],
    avoidIf: ['programming', 'technology']
  },
  {
    id: 'turismo',
    name: 'Turismo',
    faculty: 'FCSH',
    interests: ['travel', 'culture', 'business', 'working_with_people'],
    activities: ['planning', 'working_with_people', 'communication'] as VocationalTag[],
    subjects: ['history'],
    environments: ['office', 'outdoors'],
    avoidIf: ['travel', 'working_with_people']
  }
];

export type StudentProfile = {
  interests: VocationalTag[];
  activities: VocationalTag[];
  subjects: VocationalTag[];
  environments: VocationalTag[];
  dislikes: VocationalTag[];
};

export const DEFAULT_WEIGHTS = {
  interests: 4,
  activities: 3,
  subjects: 2,
  environments: 2,
  dislikes: -5
} as const;

const intersectionCount = (a: VocationalTag[], b: VocationalTag[]) =>
  a.filter(tag => b.includes(tag)).length;

export function scoreCareer(profile: StudentProfile, career: Career) {
  const evidence = {
    interests: profile.interests.filter(tag => career.interests.includes(tag)),
    activities: profile.activities.filter(tag => career.activities.includes(tag)),
    subjects: profile.subjects.filter(tag => career.subjects.includes(tag)),
    environments: profile.environments.filter(tag => career.environments.includes(tag)),
    dislikes: profile.dislikes.filter(tag => career.avoidIf.includes(tag))
  };

  const score =
    intersectionCount(profile.interests, career.interests) * DEFAULT_WEIGHTS.interests +
    intersectionCount(profile.activities, career.activities) * DEFAULT_WEIGHTS.activities +
    intersectionCount(profile.subjects, career.subjects) * DEFAULT_WEIGHTS.subjects +
    intersectionCount(profile.environments, career.environments) * DEFAULT_WEIGHTS.environments +
    intersectionCount(profile.dislikes, career.avoidIf) * DEFAULT_WEIGHTS.dislikes;

  return { career, score, evidence };
}

export function recommendCareers(profile: StudentProfile, limit = 2) {
  return careers
    .map(career => scoreCareer(profile, career))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
