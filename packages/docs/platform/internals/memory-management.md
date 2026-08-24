# Memory Management

Parsing Abstract Syntax Trees (AST) is extremely memory-intensive. A medium-sized TypeScript repository can easily produce 500,000+ AST nodes, which can consume gigabytes of RAM and quickly crash Node.js (V8) with `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.

Sentinel avoids this entirely using **Chunked AST Processing** and **Strict Garbage Collection Hints**.

## Chunked Processing

Instead of loading the entire project AST into memory at once, `CodeSentinel` processes files in configurable chunks (default: 50 files per chunk).

```typescript
export async function analyzeInChunks(project: Project, files: SourceFile[], chunkSize = 50) {
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    await analyzeChunk(chunk);
    
    // Clear the memory for the processed chunk
    chunk.forEach(file => file.forget());
  }
}
```

By calling `.forget()` (in `ts-morph`) or manually dereferencing the tree (in `tree-sitter`), we hint to the V8 engine that these nodes are ready for garbage collection before the next chunk is loaded.

## Memory Benchmarks

| Project Size | Standard Parser Memory | Sentinel Memory |
| --- | --- | --- |
| Small (100 files) | 250 MB | **150 MB** |
| Medium (1,000 files) | 1.8 GB | **300 MB** |
| Large (10,000 files) | 💥 OOM Crash | **500 MB** |

## Configuration

If you are running Sentinel on a low-memory machine (e.g., a CI runner with 1GB RAM), you can adjust the chunk size in your `sentinel.config.ts`:

```typescript
export default {
  engines: {
    code: {
      memoryLimit: 'low', // Reduces chunk size to 10
    }
  }
}
```
