// Deliberately ambiguous fixture: a strict allowlist makes this dynamic import
// safe, but it exercises detectors that should not over-report it.
const modules: Record<'date', () => Promise<unknown>> = {
  date: () => import('node:util'),
};

export async function loadAllowedModule(name: 'date'): Promise<unknown> {
  return modules[name]();
}
