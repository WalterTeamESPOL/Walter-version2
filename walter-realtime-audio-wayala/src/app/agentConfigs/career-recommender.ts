// career-recommender.ts
// Tool que Walter puede usar para convertir señales vocacionales en recomendaciones.

import { tool } from '@openai/agents';
import { z } from 'zod';
import {
  VOCATIONAL_TAGS,
  recommendCareers,
  type VocationalTag
} from './careers-espol';

const Tag = z.enum(VOCATIONAL_TAGS);

export const recommendEspolCareers = tool({
  name: 'recommend_espol_careers',
  description:
    'Recomienda hasta dos carreras de ESPOL a partir de señales vocacionales recogidas durante la conversación. Úsala solo después de obtener al menos dos señales significativas del estudiante.',
  parameters: z.object({
    interests: z.array(Tag).default([]),
    activities: z.array(Tag).default([]),
    subjects: z.array(Tag).default([]),
    environments: z.array(Tag).default([]),
    dislikes: z.array(Tag).default([])
  }),
  execute: async ({
    interests,
    activities,
    subjects,
    environments,
    dislikes
  }) => {
    const results = recommendCareers(
      {
        interests: interests as VocationalTag[],
        activities: activities as VocationalTag[],
        subjects: subjects as VocationalTag[],
        environments: environments as VocationalTag[],
        dislikes: dislikes as VocationalTag[]
      },
      2
    );

    return results.map(({ career, score, evidence }) => ({
      id: career.id,
      career: career.name,
      faculty: career.faculty,
      score,
      evidence
    }));
  }
});
