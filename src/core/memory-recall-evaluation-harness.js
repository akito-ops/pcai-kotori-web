import { compareMemoryRecallOfflineShadow } from './memory-recall-diff-observer.js';

function freezeCaseResult(result){
  return Object.freeze({
    id: result.id,
    legacyLocalTopKey: result.legacyLocalTopKey,
    legacyModelTopKey: result.legacyModelTopKey,
    shadowTopKey: result.shadowTopKey,
    expectedTopKey: result.expectedTopKey,
    localMatchesExpected: result.localMatchesExpected,
    modelMatchesExpected: result.modelMatchesExpected,
    shadowMatchesExpected: result.shadowMatchesExpected,
    localMatchesShadow: result.localMatchesShadow,
    modelMatchesShadow: result.modelMatchesShadow
  });
}

function ratio(count,total){
  return total ? count / total : 0;
}

export function evaluateMemoryRecallCases({ cases = [], longTerm = {}, importanceAssessments = [], limit = 6 }){
  const safeCases = Array.isArray(cases) ? cases.slice(0, 100) : [];
  const results = safeCases.map((testCase, index) => {
    const id = String(testCase?.id || `case-${index + 1}`);
    const query = String(testCase?.query || '');
    const expectedTopKey = typeof testCase?.expectedTopKey === 'string' ? testCase.expectedTopKey : null;
    const diff = compareMemoryRecallOfflineShadow({
      longTerm,
      importanceAssessments,
      query,
      limit
    });
    return freezeCaseResult({
      id,
      legacyLocalTopKey: diff.legacyLocalTopKey,
      legacyModelTopKey: diff.legacyModelTopKey,
      shadowTopKey: diff.shadowTopKey,
      expectedTopKey,
      localMatchesExpected: expectedTopKey ? diff.legacyLocalTopKey === expectedTopKey : null,
      modelMatchesExpected: expectedTopKey ? diff.legacyModelTopKey === expectedTopKey : null,
      shadowMatchesExpected: expectedTopKey ? diff.shadowTopKey === expectedTopKey : null,
      localMatchesShadow: diff.localTopMatchesShadow,
      modelMatchesShadow: diff.modelTopMatchesShadow
    });
  });

  const labeled = results.filter(item => item.expectedTopKey);
  const summary = Object.freeze({
    totalCases: results.length,
    labeledCases: labeled.length,
    legacyLocalExpectedAccuracy: ratio(labeled.filter(item => item.localMatchesExpected).length, labeled.length),
    legacyModelExpectedAccuracy: ratio(labeled.filter(item => item.modelMatchesExpected).length, labeled.length),
    shadowExpectedAccuracy: ratio(labeled.filter(item => item.shadowMatchesExpected).length, labeled.length),
    localShadowAgreement: ratio(results.filter(item => item.localMatchesShadow).length, results.length),
    modelShadowAgreement: ratio(results.filter(item => item.modelMatchesShadow).length, results.length)
  });

  return Object.freeze({
    mode: 'offline-evaluation-harness',
    summary,
    results: Object.freeze(results),
    diagnosticOnly: true,
    affectsRuntime: false,
    changesRecall: false,
    sendsToModel: false,
    writesCanonicalMemory: false,
    exposesMemoryText: false
  });
}
