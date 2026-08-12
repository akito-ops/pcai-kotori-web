import { kotoriPersona } from './personas/kotori.js';
import { companionUsecase } from './usecases/companion.js';
import { cloudflareWorkersAI } from './models/cloudflare-workers-ai.js';
import { createRuntimeProfile } from '../core/runtime-profile.js';

export const runtime = createRuntimeProfile({
  persona: kotoriPersona,
  usecase: companionUsecase,
  model: cloudflareWorkersAI
});
