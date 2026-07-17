import { loadLocalEnv } from "./load-local-env";
import { runResearch } from "../src/lib/research/run";
import { researchRuntimeDiagnostics } from "../src/lib/research/runtime";

loadLocalEnv();

async function main() {
  const diagnostics = researchRuntimeDiagnostics();
  if (!diagnostics.canRunPipeline) {
    console.log(JSON.stringify({ ok: false, error: "Research runtime is not configured.", diagnostics }, null, 2));
    process.exit(1);
  }

  const result = await runResearch();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
