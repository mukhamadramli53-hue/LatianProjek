require("ts-node").register({ compilerOptions: { module: "CommonJS" } });
const {
  isPromptInjectionOrLeakAttempt,
  isAdministrativeActionAttempt,
  isActionExecutionClaimRequest,
  isSensitiveSecurityAttempt,
  isAmbiguousQuestion,
  isDatabaseQueryIntent,
} = require("../src/lib/ai/service.ts");

const q = "Berapa total pengajuan yang masuk bulan ini?";
console.log("isPromptInjection:", isPromptInjectionOrLeakAttempt(q));
console.log("isAdministrative:", isAdministrativeActionAttempt(q));
console.log("isActionExecution:", isActionExecutionClaimRequest(q));
console.log("isSensitiveSecurity:", isSensitiveSecurityAttempt(q));
console.log("isAmbiguous:", isAmbiguousQuestion(q, []));
console.log("isDatabaseQueryIntent:", isDatabaseQueryIntent(q));

