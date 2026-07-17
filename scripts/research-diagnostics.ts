import { loadLocalEnv } from "./load-local-env";
import { researchRuntimeDiagnostics } from "../src/lib/research/runtime";

loadLocalEnv();
console.log(JSON.stringify(researchRuntimeDiagnostics(), null, 2));
