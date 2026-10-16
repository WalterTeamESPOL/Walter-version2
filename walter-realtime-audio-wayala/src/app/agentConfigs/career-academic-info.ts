// career-academic-info.ts
// Información de acreditaciones internacionales para Walter.
// Fuente de verdad separada de la matriz vocacional.
//
// Verificado contra páginas oficiales de ESPOL el 2026-08-19.
//
// IMPORTANTE:
// - Un arreglo `accreditations: []` NO significa "la carrera no tiene ninguna acreditación".
// - Significa que, en las fuentes oficiales cargadas en esta versión,
//   no tenemos una acreditación internacional específica confirmada para esa carrera.
// - Walter nunca debe inferir una acreditación por similitud con otra carrera.

export const ACCREDITATION_VERIFIED_AT = '2026-08-19';

export const accreditationSources = {
  espolQuality: {
    label: 'ESPOL - Calidad',
    url: 'https://www.espol.edu.ec/es/calidad'
  },
  abet: {
    label: 'ESPOL - 13 carreras acreditadas por ABET',
    url: 'https://www.espol.edu.ec/es/noticias/espol-cuenta-con-13-carreras-acreditadas-por-abet-la-mas-prestigiosa-acreditadora-mundial'
  },
  eurAce: {
    label: 'ESPOL - 20 ingenierías con sello EUR-ACE',
    url: 'https://www.espol.edu.ec/es/noticias/espol-cuenta-con-20-ingenierias-de-alta-calidad-con-sello-eur-ace'
  },
  rsb: {
    label: 'ESPOL - Calidad / Acreditación internacional RSB',
    url: 'https://www.espol.edu.ec/es/calidad'
  },
  acbsp: {
    label: 'FCSH ESPOL - Acreditación ACBSP',
    url: 'https://www.fcsh.espol.edu.ec/es/acreditacion-acbsp'
  }
} as const;

export type AccreditationAgency = 'ABET' | 'EUR-ACE' | 'RSB' | 'ACBSP';

export type Accreditation = {
  agency: AccreditationAgency;
  name: string;
  category:
    | 'international_program_accreditation'
    | 'international_engineering_quality_label';
  since?: string;
  sourceKey: keyof typeof accreditationSources;
};

export type AccreditationVerificationStatus =
  | 'verified_accreditation_available'
  | 'no_specific_accreditation_verified_in_loaded_sources';

export type CareerAcademicInfo = {
  id: string;
  name: string;
  faculty: 'FADCOM' | 'FCSH' | 'FCV' | 'FCNM' | 'FICT' | 'FIEC' | 'FIMCM' | 'FIMCP';
  accreditationVerification: {
    status: AccreditationVerificationStatus;
    verifiedAt: string;
  };
  accreditations: Accreditation[];

  // Preparados para la siguiente capa académica.
  // No rellenar con datos inferidos.
  description?: string;
  professionalFields?: string[];
  jobExamples?: string[];
};

const ABET = (
  since: string
): Accreditation => ({
  agency: 'ABET',
  name: 'ABET',
  category: 'international_program_accreditation',
  since,
  sourceKey: 'abet'
});

const EUR_ACE = (): Accreditation => ({
  agency: 'EUR-ACE',
  name: 'EUR-ACE',
  category: 'international_engineering_quality_label',
  since: '2023',
  sourceKey: 'eurAce'
});

const RSB = (): Accreditation => ({
  agency: 'RSB',
  name: 'Royal Society of Biology (RSB)',
  category: 'international_program_accreditation',
  since: '2024',
  sourceKey: 'rsb'
});

const ACBSP = (): Accreditation => ({
  agency: 'ACBSP',
  name: 'Accreditation Council for Business Schools and Programs (ACBSP)',
  category: 'international_program_accreditation',
  sourceKey: 'acbsp'
});

function career(
  id: string,
  name: string,
  faculty: CareerAcademicInfo['faculty'],
  accreditations: Accreditation[]
): CareerAcademicInfo {
  return {
    id,
    name,
    faculty,
    accreditationVerification: {
      status:
        accreditations.length > 0
          ? 'verified_accreditation_available'
          : 'no_specific_accreditation_verified_in_loaded_sources',
      verifiedAt: ACCREDITATION_VERIFIED_AT
    },
    accreditations
  };
}

export const careerAcademicInfo: CareerAcademicInfo[] = [
  career('acuicultura', 'Acuicultura', 'FIMCM', [EUR_ACE()]),
  career('administracion-empresas', 'Administración de Empresas', 'FCSH', [ACBSP()]),
  career('alimentos', 'Alimentos', 'FIMCP', [ABET('2020'), EUR_ACE()]),
  career('animacion-videojuegos', 'Animación Digital y Videojuegos', 'FADCOM', []),
  career('arqueologia', 'Arqueología', 'FCSH', []),
  career('auditoria-control', 'Auditoría y Control de Gestión', 'FCSH', [ACBSP()]),
  career('biologia', 'Biología', 'FCV', [RSB()]),
  career('ciencia-datos-ia', 'Ciencia de Datos e Inteligencia Artificial', 'FIEC', []),
  career('computacion', 'Computación', 'FIEC', [ABET('2012'), EUR_ACE()]),
  career('diseno-productos', 'Diseño de Productos', 'FADCOM', []),
  career('diseno-grafico', 'Diseño Gráfico', 'FADCOM', []),
  career('economia', 'Economía', 'FCSH', [ACBSP()]),
  career('electricidad', 'Electricidad', 'FIEC', [ABET('2015'), EUR_ACE()]),
  career('electronica-automatizacion', 'Electrónica y Automatización', 'FIEC', [
    ABET('2020'),
    EUR_ACE()
  ]),
  career('estadistica', 'Estadística', 'FCNM', []),
  career('geologia', 'Geología', 'FICT', [ABET('2020'), EUR_ACE()]),
  career('ingenieria-agricola-biologica', 'Ingeniería Agrícola y Biológica', 'FCV', [
    EUR_ACE()
  ]),
  career('ingenieria-civil', 'Ingeniería Civil', 'FICT', [ABET('2015'), EUR_ACE()]),
  career('ingenieria-industrial', 'Ingeniería Industrial', 'FIMCP', [
    ABET('2015'),
    EUR_ACE()
  ]),
  career('ingenieria-naval', 'Ingeniería Naval', 'FIMCM', [ABET('2015'), EUR_ACE()]),
  career('ingenieria-quimica', 'Ingeniería Química', 'FCNM', [EUR_ACE()]),
  career('logistica-transporte', 'Logística y Transporte', 'FCNM', [EUR_ACE()]),
  career('matematica', 'Matemática', 'FCNM', []),
  career('materiales', 'Materiales', 'FIMCP', [EUR_ACE()]),
  career('mecanica', 'Mecánica', 'FIMCP', [ABET('2012'), EUR_ACE()]),
  career('mecatronica', 'Mecatrónica', 'FIMCP', [EUR_ACE()]),
  career('minas', 'Minas', 'FICT', [ABET('2020'), EUR_ACE()]),
  career('nutricion-dietetica', 'Nutrición y Dietética', 'FCV', []),
  career('oceanografia', 'Oceanografía', 'FIMCM', [ABET('2020'), EUR_ACE()]),
  career('petroleos', 'Petróleos', 'FICT', [EUR_ACE()]),
  career('produccion-medios', 'Producción para Medios de Comunicación', 'FADCOM', []),
  career('telecomunicaciones', 'Telecomunicaciones', 'FIEC', [ABET('2020'), EUR_ACE()]),
  career('telematica', 'Telemática', 'FIEC', [ABET('2020'), EUR_ACE()]),
  career('turismo', 'Turismo', 'FCSH', [ACBSP()])
];

export function getCareerAcademicInfoById(id: string) {
  return careerAcademicInfo.find(item => item.id === id);
}

export function getCareerAcademicInfoByName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return careerAcademicInfo.find(item => {
    const careerName = item.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    return careerName === normalized;
  });
}

export function getAccreditationSources(info: CareerAcademicInfo) {
  return [...new Set(info.accreditations.map(a => a.sourceKey))].map(
    sourceKey => accreditationSources[sourceKey]
  );
}
