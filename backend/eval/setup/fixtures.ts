import type { FarmAgentContext } from '../../src/modules/chat/chat.repository';
import { SEED_IDS } from '../../src/seed/santa-clara';

export const SANTA_CLARA: FarmAgentContext = {
  name: 'Fazenda Santa Clara',
  totalAreaHa: '840.00',
  primaryActivity: 'Pecuária de corte',
  location: 'Camapuã, MS',
  mainCrops: 'Milho safrinha',
  approximateAnimalCount: 920,
  onboardingCompleted: true,
  agentContext: [
    '# Fazenda Santa Clara',
    '',
    '- Pecuária de corte é a atividade principal; trabalham com Nelore.',
    '- Também plantam milho safrinha em dois talhões.',
    '- João é o gerente da propriedade e quem fala com o sistema.',
    '- O gado sai para o frigorífico de Campo Grande.',
  ].join('\n'),
  areas: [
    { id: SEED_IDS.areas.pasto4, name: 'Pasto 4', type: 'PASTURE' },
    { id: SEED_IDS.areas.pasto5, name: 'Pasto 5', type: 'PASTURE' },
    { id: SEED_IDS.areas.pasto6, name: 'Pasto 6', type: 'PASTURE' },
    { id: SEED_IDS.areas.talhao1, name: 'Talhão 1', type: 'CROP_FIELD' },
    { id: SEED_IDS.areas.talhao2, name: 'Talhão 2', type: 'CROP_FIELD' },
    { id: SEED_IDS.areas.sede, name: 'Sede', type: 'OTHER' },
  ],
};

export const FAZENDA_VAZIA: FarmAgentContext = {
  name: null,
  totalAreaHa: null,
  primaryActivity: null,
  location: null,
  mainCrops: null,
  approximateAnimalCount: null,
  onboardingCompleted: false,
  agentContext: null,
  areas: [],
};

export const FAZENDA_EM_ONBOARDING: FarmAgentContext = {
  ...FAZENDA_VAZIA,
  name: 'Sítio Boa Esperança',
  location: 'Rio Verde, GO',
  agentContext:
    '# Sítio Boa Esperança\n\n- Antônio toca a propriedade sozinho.',
};
