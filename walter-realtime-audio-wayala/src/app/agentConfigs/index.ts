import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';
import { walterScenario } from './walter';
import { walterScenario1 } from './walterfiec';
import { financialScenario } from './financialAgent';
import { walterCtiScenario } from './waltercti';
import { walterScenarioParesNones } from './walter_pares_nones';

import type { RealtimeAgent } from '@openai/agents/realtime';

export const allAgentSets: Record<string, RealtimeAgent[]> = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
  walter: walterScenario,
  walterfiec: walterScenario1,
  financial: financialScenario,
  waltercti: walterCtiScenario,
  walter_pares_nones: walterScenarioParesNones,
};

export const defaultAgentSetKey = 'waltercti';