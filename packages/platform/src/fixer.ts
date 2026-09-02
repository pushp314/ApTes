import { logger } from "@sentinel/shared";
import fs from "node:fs/promises";
import path from "node:path";
import type { Finding } from "@sentinel/shared";
import type { UnifiedReport } from "./orchestrator.js";

export interface FixOptions {
  dryRun?: boolean;
  autoApprove?: boolean;
  aiProvider?: string;
  aiModel?: string;
}

export interface FixResult {
  findingId: string;
  file: string;
  line?: number;
  status: "applied" | "skipped" | "failed" | "dry-run";
  diff?: string;
  error?: string;
}

/**
 * Heuristic/Deterministic fix generators for common vulnerability patterns.
 */
function generateDeterministicPatch(
  finding: Finding,
  originalContent: string,
): { patched: string; diff: string } | null {
  if (!finding.location) return null;
  const match = finding.location.match(/^(.+):(\d+)$/);
  if (!match || !match[1] || !match[2]) return null;

  const targetLine = parseInt(match[2], 10);
  const lines = originalContent.split("\n");
  if (targetLine < 1 || targetLine > lines.length) return null;

  const lineIndex = targetLine - 1;
  const lineContent = lines[lineIndex];
  if (!lineContent) return null;

  // 1. Weak/Missing Security Headers or logger.info leaks
  if (
    finding.ruleId === "no-console-log" &&
    lineContent.includes("logger.info")
  ) {
    const fixedLine = `// REMOVED FOR PRODUCTION: ${lineContent.trim()}`;
    const newLines = [...lines];
    newLines[lineIndex] = fixedLine;
    return {
      patched: newLines.join("\n"),
      diff: `- ${lineContent}\n+ ${fixedLine}`,
    };
  }

  // 2. Insecure eval() or Function()
  if (finding.ruleId === "no-eval" && lineContent.includes("eval(")) {
    const fixedLine = lineContent.replace(/eval\(([^)]+)\)/, "JSON.parse($1)");
    const newLines = [...lines];
    newLines[lineIndex] = fixedLine;
    return {
      patched: newLines.join("\n"),
      diff: `- ${lineContent}\n+ ${fixedLine}`,
    };
  }

  // 3. Insecure random (Math.random in crypto context)
  if (
    finding.ruleId === "insecure-random" &&
    lineContent.includes("Math.random()")
  ) {
    const fixedLine = lineContent.replace(
      "Math.random()",
      "crypto.randomInt(0, 1000000)",
    );
    const newLines = [...lines];
    newLines[lineIndex] = fixedLine;
    return {
      patched: newLines.join("\n"),
      diff: `- ${lineContent}\n+ ${fixedLine}`,
    };
  }

  // 4. Hardcoded Secrets (Redaction placeholder)
  if (
    finding.category === "secrets" ||
    finding.ruleId.includes("secret") ||
    finding.ruleId.includes("api-key")
  ) {
    const secretMatch = lineContent.match(/(['"`])([a-zA-Z0-9_-]{16,})\1/);
    if (secretMatch && secretMatch[2]) {
      const fixedLine = lineContent.replace(
        secretMatch[0],
        'process.env.SECRET_KEY || ""',
      );
      const newLines = [...lines];
      newLines[lineIndex] = fixedLine;
      return {
        patched: newLines.join("\n"),
        diff: `- ${lineContent}\n+ ${fixedLine}`,
      };
    }
  }

  return null;
}

export async function runCodeFixer(
  reportPath: string,
  options: FixOptions = {},
): Promise<FixResult[]> {
  const fullPath = path.resolve(reportPath);
  const raw = await fs.readFile(fullPath, "utf-8");
  let findings: Finding[] = [];

  try {
    const parsed = JSON.parse(raw) as UnifiedReport | Finding[];
    if (Array.isArray(parsed)) {
      findings = parsed;
    } else if (parsed && Array.isArray(parsed.findings)) {
      findings = parsed.findings;
    }
  } catch (err) {
    throw new Error(
      `Failed to parse report file '${reportPath}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const results: FixResult[] = [];
  const { confirm } = await import("@clack/prompts");
  const pc = (await import("picocolors")).default;

  logger.info(pc.cyan(`\n🔧 Sentinel Code Auto-Fix Engine`));
  logger.info(
    pc.dim(
      `Analyzing ${findings.length} findings for safe automated remediation...\n`,
    ),
  );

  for (const finding of findings) {
    if (!finding.location) continue;
    const match = finding.location.match(/^(.+?)(?::(\d+))?$/);
    if (!match || !match[1]) continue;

    const filePath = path.resolve(match[1]);
    const lineNum = match[2] ? parseInt(match[2], 10) : undefined;

    let content: string;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch {
      continue; // Skip files that can't be read
    }

    const patch = generateDeterministicPatch(finding, content);
    if (!patch) continue;

    logger.info(pc.bold(pc.yellow(`\n[${finding.severity}] ${finding.title}`)));
    logger.info(pc.dim(`Location: ${finding.location}`));
    logger.info(pc.dim(`Rule: ${finding.ruleId}`));
    logger.info(`\n${pc.bold("Proposed Diff:")}`);
    logger.info(
      pc.gray(
        patch.diff
          .split("\n")
          .map((l) => (l.startsWith("+") ? pc.green(l) : pc.red(l)))
          .join("\n"),
      ),
    );

    if (options.dryRun) {
      results.push({
        findingId: finding.id,
        file: filePath,
        line: lineNum,
        status: "dry-run",
        diff: patch.diff,
      });
      continue;
    }

    let shouldApply = options.autoApprove;
    if (!shouldApply) {
      const answer = await confirm({
        message: `Apply this fix to ${path.basename(filePath)}?`,
        initialValue: true,
      });
      shouldApply = answer === true;
    }

    if (shouldApply) {
      try {
        await fs.writeFile(filePath, patch.patched, "utf-8");
        logger.info(pc.green(`✔ Fixed ${path.basename(filePath)}`));
        results.push({
          findingId: finding.id,
          file: filePath,
          line: lineNum,
          status: "applied",
          diff: patch.diff,
        });
      } catch (err) {
        logger.info(
          pc.red(
            `✖ Failed to write ${path.basename(filePath)}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        results.push({
          findingId: finding.id,
          file: filePath,
          line: lineNum,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      logger.info(pc.dim(`⏭ Skipped.`));
      results.push({
        findingId: finding.id,
        file: filePath,
        line: lineNum,
        status: "skipped",
      });
    }
  }

  const applied = results.filter((r) => r.status === "applied").length;
  logger.info(
    pc.bold(
      `\n${pc.green(`✔`)} Fix session complete. ${applied} fixes applied, ${results.length - applied} skipped/dry-run.\n`,
    ),
  );

  return results;
}
