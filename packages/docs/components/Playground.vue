<template>
  <div class="playground-container">
    <div class="terminal-window">
      <div class="terminal-header">
        <div class="mac-buttons">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </div>
        <div class="terminal-title">bash - sentinel-cli</div>
      </div>
      <div class="terminal-body" ref="terminalBody">
        <div class="line" v-for="(line, index) in lines" :key="index" v-html="line"></div>
        <div class="cursor" v-if="isRunning">_</div>
      </div>
    </div>
    
    <div class="controls">
      <button class="run-btn" @click="runSimulation" :disabled="isRunning">
        {{ isRunning ? 'Scanning...' : '▶ Run Interactive Demo' }}
      </button>
      <button class="reset-btn" @click="resetSimulation" :disabled="isRunning">
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const isRunning = ref(false);
const lines = ref<string[]>([]);
const terminalBody = ref<HTMLElement | null>(null);

const defaultPrompt = `<span class="prompt">user@dev:~/project$</span> sentinel scan https://example.com -y`;

const simulationSequence = [
  { text: defaultPrompt, delay: 500 },
  { text: `<br/>┌   <span class="brand">Sentinel Tri-Boundary Orchestrator</span>  v0.1.0<br/>│`, delay: 800 },
  { text: `◇  Authorization Check ─────────────────────────`, delay: 400 },
  { text: `│  <span class="success">✔</span> Target authorization verified via -y flag`, delay: 600 },
  { text: `│`, delay: 100 },
  { text: `◇  Initializing Analysis Engines ──────────────────`, delay: 500 },
  { text: `│  <span class="success">✔</span> WebSentinel (Playwright) Engine Ready`, delay: 400 },
  { text: `│  <span class="success">✔</span> CodeSentinel (AST) Engine Ready`, delay: 300 },
  { text: `│  <span class="dim">●</span> MCPSentinel Skipped (Web-only mode)`, delay: 300 },
  { text: `│`, delay: 100 },
  { text: `◒ Starting Web Engine scan for target: https://example.com`, delay: 1500, replaceLine: true },
  { text: `◑ Extracting DOM structure and network requests...`, delay: 1200, replaceLine: true },
  { text: `◓ Analyzing security headers and CORS configurations...`, delay: 1500, replaceLine: true },
  { text: `│  <span class="success">✔</span> Web Engine Scan Complete (10s)`, delay: 200 },
  { text: `│`, delay: 100 },
  { text: `◒ Starting Correlation Engine...`, delay: 1000, replaceLine: true },
  { text: `│  <span class="success">✔</span> Correlation Complete (0.5s)`, delay: 200 },
  { text: `│`, delay: 100 },
  { text: `◇  Scan Report ───────────────────────────────────`, delay: 500 },
  { text: `│  <span class="warning">⚠ Missing strict-transport-security header</span> (Medium)`, delay: 400 },
  { text: `│  <span class="warning">⚠ X-Powered-By reveals framework version</span> (Low)`, delay: 400 },
  { text: `│  <span class="success">✔ No CRITICAL vulnerabilities found.</span>`, delay: 500 },
  { text: `└  <span class="success">Completed successfully.</span>`, delay: 500 },
  { text: `<br/><span class="prompt">user@dev:~/project$</span> `, delay: 0 }
];

const scrollToBottom = async () => {
  await nextTick();
  if (terminalBody.value) {
    terminalBody.value.scrollTop = terminalBody.value.scrollHeight;
  }
};

const runSimulation = async () => {
  if (isRunning.value) return;
  isRunning.value = true;
  lines.value = [];
  
  for (const step of simulationSequence) {
    if (!isRunning.value) break; // Allow early exit
    
    await new Promise(r => setTimeout(r, step.delay));
    
    if (step.replaceLine && lines.value.length > 0) {
      lines.value[lines.value.length - 1] = step.text;
    } else {
      lines.value.push(step.text);
    }
    await scrollToBottom();
  }
  
  isRunning.value = false;
};

const resetSimulation = () => {
  isRunning.value = false;
  lines.value = [defaultPrompt];
};

onMounted(() => {
  resetSimulation();
});
</script>

<style scoped>
.playground-container {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.terminal-window {
  background-color: #0d1117;
  border-radius: 8px;
  border: 1px solid #30363d;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  overflow: hidden;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #c9d1d9;
  font-size: 14px;
  line-height: 1.5;
}

.terminal-header {
  background-color: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 8px 16px;
  display: flex;
  align-items: center;
}

.mac-buttons {
  display: flex;
  gap: 6px;
  margin-right: 16px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.dot.red { background-color: #ff5f56; }
.dot.yellow { background-color: #ffbd2e; }
.dot.green { background-color: #27c93f; }

.terminal-title {
  color: #8b949e;
  font-size: 12px;
  text-align: center;
  flex: 1;
  margin-right: 48px; /* Counter-balance buttons */
}

.terminal-body {
  padding: 16px;
  height: 400px;
  overflow-y: auto;
  position: relative;
}

.cursor {
  display: inline-block;
  width: 8px;
  background-color: #c9d1d9;
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

button {
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.run-btn {
  background-color: #2ea043;
  color: white;
}
.run-btn:hover:not(:disabled) {
  background-color: #2c974b;
}
.run-btn:disabled {
  background-color: #2ea04380;
  cursor: not-allowed;
}

.reset-btn {
  background-color: transparent;
  border: 1px solid #30363d;
  color: #c9d1d9;
}
.reset-btn:hover:not(:disabled) {
  background-color: #30363d;
}

:deep(.prompt) { color: #58a6ff; font-weight: bold; }
:deep(.brand) { color: #d2a8ff; font-weight: bold; }
:deep(.success) { color: #3fb950; }
:deep(.warning) { color: #d29922; }
:deep(.dim) { color: #8b949e; }
</style>
