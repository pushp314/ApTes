import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Heuristically tries to detect the backend start command
 * by inspecting the workspace directory.
 */
export async function detectStartCommand(dir: string): Promise<string | undefined> {
  try {
    // 1. Check package.json for standard scripts
    const pkgPath = path.join(dir, 'package.json');
    try {
      const pkgRaw = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgRaw);
      
      if (pkg.scripts) {
        if (pkg.scripts.start) return 'npm start';
        if (pkg.scripts.dev) return 'npm run dev';
        if (pkg.scripts.server) return 'npm run server';
      }
    } catch {
      // Ignore if no package.json
    }

    // 2. Check for docker-compose
    try {
      await fs.access(path.join(dir, 'docker-compose.yml'));
      return 'docker-compose up';
    } catch {
      // Ignore
    }

    // 3. Check for common entry points directly
    const commonEntries = [
      { file: 'server.js', cmd: 'node server.js' },
      { file: 'main.py', cmd: 'python main.py' },
      { file: 'app.py', cmd: 'python app.py' },
      { file: 'index.js', cmd: 'node index.js' }
    ];

    for (const entry of commonEntries) {
      try {
        await fs.access(path.join(dir, entry.file));
        return entry.cmd;
      } catch {
        // Ignore
      }
    }

    return undefined;
  } catch (err) {
    return undefined;
  }
}
