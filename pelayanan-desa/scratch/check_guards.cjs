require('ts-node').register({ compilerOptions: { module: 'CommonJS' } });
const s = require('../src/lib/ai/service.ts');

const q = 'Bagaimana status pengajuan PD-202610-0001?';
console.log('Q:', q);
console.log('isPromptInjectionOrLeakAttempt:', s.isPromptInjectionOrLeakAttempt(q));
console.log('isAdministrativeActionAttempt:', s.isAdministrativeActionAttempt(q));
console.log('isActionExecutionClaimRequest:', s.isActionExecutionClaimRequest(q));
console.log('isSensitiveSecurityAttempt:', s.isSensitiveSecurityAttempt(q));
console.log('isAmbiguousQuestion:', s.isAmbiguousQuestion(q));
