// career-academic-tool.ts
// Tool para que Walter consulte acreditaciones verificadas de una carrera.

import { tool } from '@openai/agents';
import { z } from 'zod';
import {
  careerAcademicInfo,
  getCareerAcademicInfoById,
  getAccreditationSources
} from './career-academic-info';

const careerIds = careerAcademicInfo.map(item => item.id) as [
  string,
  ...string[]
];

export const getEspolCareerAcademicInfo = tool({
  name: 'get_espol_career_academic_info',
  description:
    'Consulta información académica verificada de una carrera de ESPOL, especialmente sus acreditaciones internacionales. Debe usarse antes de afirmar que una carrera tiene ABET, EUR-ACE, RSB o ACBSP.',
  parameters: z.object({
    careerId: z.enum(careerIds)
  }),
  execute: async ({ careerId }) => {
    const info = getCareerAcademicInfoById(careerId);

    if (!info) {
      return {
        found: false,
        message: 'No existe información académica verificada para ese identificador.'
      };
    }

    return {
      found: true,
      career: {
        id: info.id,
        name: info.name,
        faculty: info.faculty
      },
      accreditationVerification: info.accreditationVerification,
      accreditations: info.accreditations,
      sources: getAccreditationSources(info)
    };
  }
});
