export function createRuntimeBindings(runtime){
  if(!runtime?.persona || !runtime?.usecase || !runtime?.model || !runtime?.storage){
    throw new TypeError('complete runtime profile is required');
  }

  const transport = runtime.model.transport || {};
  const facts = runtime.persona.facts || {};
  const voice = runtime.persona.voice || {};
  const memoryPolicy = runtime.usecase.memoryPolicy || {};

  return Object.freeze({
    identity: Object.freeze({
      personaId: runtime.persona.id,
      personaName: runtime.persona.display?.name || runtime.persona.id,
      shortName: runtime.persona.display?.shortName || runtime.persona.display?.name || runtime.persona.id,
      usecaseId: runtime.usecase.id,
      modelId: runtime.model.id
    }),
    storageKey: runtime.storage.memoryNamespace,
    backend: Object.freeze({
      baseUrl: transport.baseUrl || '',
      chatPath: transport.chatPath || '/api/chat',
      authHeader: transport.authHeader || 'authorization'
    }),
    personaFacts: Object.freeze({
      birthday: facts.birthday || '',
      height: facts.height || '',
      likes: facts.likes || Object.freeze([]),
      foods: facts.foods || Object.freeze([]),
      drinks: facts.drinks || Object.freeze([])
    }),
    voice: Object.freeze({
      language: voice.language || 'ja-JP',
      day: voice.day || Object.freeze({ rate: 1, pitch: 1 }),
      night: voice.night || Object.freeze({ rate: 1, pitch: 1 })
    }),
    memory: Object.freeze({
      shortTermLimit: memoryPolicy.shortTermLimit ?? 80,
      longTermLimitPerKind: memoryPolicy.longTermLimitPerKind ?? 180,
      sendRecentTurnsToModel: memoryPolicy.sendRecentTurnsToModel ?? 8,
      sendRelevantMemoriesToModel: memoryPolicy.sendRelevantMemoriesToModel ?? 6
    })
  });
}
