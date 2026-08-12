export const companionUsecase = Object.freeze({
  id: 'companion',
  schemaVersion: 1,
  label: '日常会話・相棒',
  capabilities: Object.freeze({
    conversation: true,
    memoryRecall: true,
    memoryConsolidation: true,
    toolExecution: false,
    autonomousActions: false
  }),
  memoryPolicy: Object.freeze({
    shortTermLimit: 80,
    longTermLimitPerKind: 180,
    sendRecentTurnsToModel: 8,
    sendRelevantMemoriesToModel: 6,
    preserveUnknownLegacyMemory: true
  }),
  safety: Object.freeze({
    requireExplicitToolPermission: true,
    allowPaidFallback: false,
    keepAccessTokenInMemoryOnly: true
  })
});
