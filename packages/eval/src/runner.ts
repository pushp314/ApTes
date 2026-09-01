
import * as fs from 'fs';
import * as path from 'path';
import { calculateMetrics, GroundTruth } from './metrics.js';
import { generateCsvReport, generateMarkdownReport } from './reporters/csv-reporter.js';

async function run() {
  console.log('--- Sentinel Empirical Evaluation Harness ---');
  
  const gtPath = path.resolve('juice-shop-ground-truth.json');
  if (!fs.existsSync(gtPath)) {
    console.error(`Ground truth file not found at ${gtPath}`);
    process.exit(1);
  }
  
  const groundTruth: GroundTruth = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
  console.log(`Loaded ground truth for: ${groundTruth.target} (${groundTruth.findings.length} findings)`);

  // To run this properly, we'd need a cloned Juice Shop and it running on localhost:3000.
  // For the sake of scaffolding, we will simulate reading a Sentinel JSON report.
  // We will assume the user has run `node packages/platform/dist/cli.js scan ... --format json > report.json`
  
  const reportPath = path.resolve('report.json');
  if (!fs.existsSync(reportPath)) {
    console.error(`Sentinel report.json not found. Please run Sentinel against Juice Shop first and save output to report.json.`);
    console.log(`Example: node packages/platform/dist/cli.js scan --web http://localhost:3000 --code /path/to/juice-shop --format json > report.json`);
    process.exit(1);
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const allFindings = report.findings || [];
  
  // A naive matching function for scaffolding purposes
  const matchFn = (reported: any, truth: any) => {
    return reported.category === truth.expectedCategory || reported.title?.toLowerCase().includes(truth.id.split('-')[0]);
  };
  
  const codeFindings = allFindings.filter((f: any) => f.engine === 'code');
  const webFindings = allFindings.filter((f: any) => f.engine === 'web');
  const platformFindings = allFindings.filter((f: any) => f.engine === 'platform');
  
  const codeMetrics = calculateMetrics(codeFindings, groundTruth, matchFn);
  const webMetrics = calculateMetrics(webFindings, groundTruth, matchFn);
  const platformMetrics = calculateMetrics(platformFindings, groundTruth, matchFn);
  
  const results = {
    'Code Engine (Static)': codeMetrics,
    'Web Engine (Dynamic)': webMetrics,
    'Correlated (Platform)': platformMetrics,
  };

  console.log('\n--- Results ---');
  console.table(results);

  console.log('\n--- Markdown Table ---');
  console.log(generateMarkdownReport(results));

  console.log('\n--- CSV Output ---');
  console.log(generateCsvReport(results));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
