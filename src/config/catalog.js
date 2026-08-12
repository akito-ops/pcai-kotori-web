import { kotoriPersona } from './personas/kotori.js';
import { companionUsecase } from './usecases/companion.js';
import { cloudflareWorkersAI } from './models/cloudflare-workers-ai.js';

export const pcaiCatalog = Object.freeze({
  personas: Object.freeze({
    [kotoriPersona.id]: kotoriPersona
  }),
  usecases: Object.freeze({
    [companionUsecase.id]: companionUsecase
  }),
  models: Object.freeze({
    [cloudflareWorkersAI.id]: cloudflareWorkersAI
  })
});

export const defaultSelection = Object.freeze({
  personaId: kotoriPersona.id,
  usecaseId: companionUsecase.id,
  modelId: cloudflareWorkersAI.id
});
