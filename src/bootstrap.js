import { runtime } from './config/runtime.js';

function assertSafeRuntime(profile){
  const failures = [];

  if(!profile?.persona?.id) failures.push('persona is missing');
  if(!profile?.usecase?.id) failures.push('usecase is missing');
  if(!profile?.model?.id) failures.push('model is missing');
  if(!profile?.storage?.memoryNamespace) failures.push('memory namespace is missing');

  if(profile.persona?.boundaries?.mayRewritePersonaCore !== false){
    failures.push('persona core rewrite must stay disabled');
  }
  if(profile.persona?.boundaries?.mayInventMemories !== false){
    failures.push('memory invention must stay disabled');
  }
  if(profile.usecase?.capabilities?.autonomousActions !== false){
    failures.push('autonomous actions must stay disabled');
  }
  if(profile.usecase?.capabilities?.toolExecution !== false){
    failures.push('tool execution must stay disabled');
  }
  if(profile.usecase?.safety?.allowPaidFallback !== false){
    failures.push('paid fallback must stay disabled');
  }
  if(profile.model?.policy?.paidFallback !== false){
    failures.push('model paid fallback must stay disabled');
  }
  if(profile.model?.policy?.tokenPersistence !== 'memory-only'){
    failures.push('access token persistence must be memory-only');
  }

  if(failures.length){
    throw new Error(`Unsafe PCAI runtime: ${failures.join('; ')}`);
  }
}

try{
  assertSafeRuntime(runtime);
  // Expose read-only configuration for diagnostics and the next migration step.
  // Secrets and user memories are never placed here.
  Object.defineProperty(window, 'PCAIRuntime', {
    value: runtime,
    writable: false,
    configurable: false,
    enumerable: false
  });
  await import('../app.js');
}catch(error){
  console.error(error);
  const target = document.getElementById('chat');
  if(target){
    const message = document.createElement('div');
    message.className = 'message system';
    message.textContent = '安全設定の確認に失敗したため、PCAIの起動を停止しました。';
    target.replaceChildren(message);
  }
}
