/**
 * Scraper Runner
 * --------------
 * Launches business_scraper/main.py as a child process and tracks its state so
 * the dashboard can start a scrape, poll progress, and refresh the business
 * list when it finishes.
 *
 * Concurrency: exactly one scrape may run at a time. The scraper drives a real
 * browser and appends to shared output files, so two concurrent runs would
 * interleave writes and fight over the browser profile. A second request while
 * a job is running is rejected with 409 rather than queued.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const businessStore = require('./businessStore');

// <repo>/business_scraper — backend lives at <repo>/7kaam/backend/src/services
const SCRAPER_DIR = path.resolve(__dirname, '../../../../business_scraper');
const MAIN_SCRIPT = path.join(SCRAPER_DIR, 'main.py');

const MAX_LOG_LINES = 300;

/** @type {{status:string, startedAt:string, finishedAt:string|null, params:object, log:string[], error:string|null, recordsBefore:number, recordsAfter:number|null, exitCode:number|null}|null} */
let currentJob = null;
let currentProcess = null;

// Set by stopScrape() so the 'close' handler can tell a deliberate stop apart
// from a crash. Killing a process yields a non-zero exit code on every
// platform, which would otherwise be reported to the user as a failure.
let stopRequested = false;

/**
 * Find the Python interpreter. The scraper ships a venv with Playwright
 * installed; the system interpreter almost certainly lacks it, so the venv is
 * strongly preferred.
 */
function resolvePython() {
  if (process.env.SCRAPER_PYTHON && fs.existsSync(process.env.SCRAPER_PYTHON)) {
    return process.env.SCRAPER_PYTHON;
  }

  const candidates = process.platform === 'win32'
    ? [path.join(SCRAPER_DIR, 'venv', 'Scripts', 'python.exe')]
    : [path.join(SCRAPER_DIR, 'venv', 'bin', 'python')];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Kill the scraper and everything it started.
 *
 * A plain child.kill() only terminates the Python process; the Chromium
 * instance Playwright launched is a grandchild and would survive as an
 * orphan, holding its temp profile directory open. Windows needs taskkill /T
 * to walk the tree; POSIX can signal the whole process group.
 */
function killProcessTree(child) {
  if (!child || child.killed || child.pid == null) return;

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      return;
    } catch {
      // Fall through to the plain kill below.
    }
  }

  try {
    child.kill();
  } catch {
    // Process already gone.
  }
}

function isRunning() {
  if (currentJob?.status !== 'running') return false;

  // Safety net. The 'close' handler is what normally ends a job, but if it
  // never fires — the process was killed from Task Manager, or the handler
  // threw — the job would stay 'running' forever and every future scrape would
  // be rejected with 409 until the server was restarted. Reconcile against the
  // real process state rather than trusting the status flag on its own.
  const processGone = !currentProcess
    || currentProcess.exitCode !== null
    || currentProcess.signalCode !== null;

  if (processGone) {
    currentJob.status = 'failed';
    currentJob.finishedAt = currentJob.finishedAt || new Date().toISOString();
    currentJob.error = currentJob.error || 'The scraper process ended unexpectedly.';
    currentProcess = null;
    return false;
  }

  return true;
}

function getStatus() {
  if (!currentJob) {
    return { status: 'idle', message: 'No scrape has been started yet.' };
  }
  return { ...currentJob, log: currentJob.log.slice(-40) };
}

function pushLog(line) {
  if (!currentJob || !line) return;
  currentJob.log.push(line);
  if (currentJob.log.length > MAX_LOG_LINES) {
    currentJob.log.splice(0, currentJob.log.length - MAX_LOG_LINES);
  }
}

/**
 * Validate and normalise the scrape parameters supplied by the user.
 * Returns { ok: true, params } or { ok: false, error }.
 */
function validateParams(body = {}) {
  // Values reach the scraper as a comma-joined --area/--category argument and
  // are split on commas again there, so commas must be expanded here too.
  // Otherwise ["A,B,C"] counts as one item against the task cap but runs three.
  const toList = (value) => {
    const raw = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
    return raw
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const areas = toList(body.areas ?? body.area);
  const categories = toList(body.categories ?? body.category);
  const city = String(body.city ?? 'Bangalore').trim();
  const site = String(body.site ?? 'google_maps').trim();

  if (!areas.length) {
    return { ok: false, error: 'At least one area is required (e.g. "Jayanagar").' };
  }
  if (!categories.length) {
    return { ok: false, error: 'At least one category is required (e.g. "Electrician").' };
  }
  if (!city) {
    return { ok: false, error: 'City is required.' };
  }

  // A value beginning with '-' is read by argparse as the next flag rather than
  // as the argument's value, so the scraper would exit 2 with an opaque error.
  // There is no injection risk (spawn runs without a shell), just a bad message.
  const leadingDash = [...areas, ...categories, city].find((v) => v.startsWith('-'));
  if (leadingDash) {
    return {
      ok: false,
      error: `"${leadingDash}" cannot start with "-". Please remove the leading dash.`,
    };
  }
  if (!['google_maps', 'justdial', 'all'].includes(site)) {
    return { ok: false, error: 'site must be one of: google_maps, justdial, all.' };
  }

  // Guard against a request that would take hours: areas x categories tasks.
  const taskCount = areas.length * categories.length;
  if (taskCount > 60) {
    return {
      ok: false,
      error: `That request would run ${taskCount} searches. Please narrow it to 60 or fewer (areas x categories).`,
    };
  }

  const headless = body.headless === undefined ? true : Boolean(body.headless);

  return { ok: true, params: { areas, categories, city, site, headless } };
}

/**
 * Start a scrape. Resolves immediately with the job descriptor; the process
 * runs in the background and updates the job as it goes.
 */
function startScrape(body) {
  if (isRunning()) {
    return { ok: false, status: 409, error: 'A scrape is already running. Wait for it to finish.' };
  }

  if (!fs.existsSync(MAIN_SCRIPT)) {
    return { ok: false, status: 500, error: `Scraper not found at ${MAIN_SCRIPT}` };
  }

  const validation = validateParams(body);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  const { areas, categories, city, site, headless } = validation.params;
  const python = resolvePython();
  const dataDir = businessStore.getDataDir();

  stopRequested = false;

  const args = [
    MAIN_SCRIPT,
    '--site', site,
    '--city', city,
    '--area', areas.join(','),
    '--category', categories.join(','),
    '--output-dir', dataDir,
  ];
  if (headless) args.push('--headless');

  currentJob = {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    params: { areas, categories, city, site, headless },
    log: [],
    error: null,
    recordsBefore: businessStore.getBusinesses().records.length,
    recordsAfter: null,
    exitCode: null,
  };

  try {
    currentProcess = spawn(python, args, {
      cwd: SCRAPER_DIR,
      env: {
        ...process.env,
        SCRAPER_OUTPUT_DIR: dataDir,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1',
        // Rich wraps to 80 columns when stdout is a pipe, which shreds every
        // log line into fragments in the dashboard's log panel.
        COLUMNS: '200',
      },
      windowsHide: true,
    });
  } catch (err) {
    currentJob.status = 'failed';
    currentJob.error = `Could not launch Python (${python}): ${err.message}`;
    currentJob.finishedAt = new Date().toISOString();
    currentProcess = null;
    return { ok: false, status: 500, error: currentJob.error };
  }

  pushLog(`Launching: ${path.basename(python)} main.py --site ${site} --city ${city}`);
  pushLog(`Areas: ${areas.join(', ')}`);
  pushLog(`Categories: ${categories.join(', ')}`);

  const onData = (chunk) => {
    String(chunk)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach(pushLog);
  };

  currentProcess.stdout?.on('data', onData);
  currentProcess.stderr?.on('data', onData);

  currentProcess.on('error', (err) => {
    if (!currentJob) return;
    currentJob.status = 'failed';
    currentJob.error = `Scraper process error: ${err.message}`;
    currentJob.finishedAt = new Date().toISOString();
    currentProcess = null;
  });

  currentProcess.on('close', (code) => {
    if (!currentJob) return;
    currentJob.exitCode = code;
    currentJob.finishedAt = new Date().toISOString();

    // Force a reload so newly written records are visible immediately, even if
    // the filesystem mtime resolution would have hidden the change.
    const refreshed = businessStore.getBusinesses({ force: true });
    currentJob.recordsAfter = refreshed.records.length;

    const added = Math.max(0, currentJob.recordsAfter - currentJob.recordsBefore);

    if (stopRequested) {
      // A stopped run still checkpointed everything it collected before the
      // kill, so it is a partial success, not a failure.
      currentJob.status = 'stopped';
      pushLog(`Stopped. ${added} business record(s) were saved before stopping.`);
    } else if (code === 0) {
      currentJob.status = 'completed';
      pushLog(`Finished. ${added} new business record(s) added.`);
    } else {
      currentJob.status = 'failed';
      currentJob.error = currentJob.error || `Scraper exited with code ${code}.`;
      if (added) pushLog(`${added} business record(s) were saved before the failure.`);
    }
    currentProcess = null;
  });

  return { ok: true, job: getStatus() };
}

/** Stop a running scrape. */
function stopScrape() {
  if (!isRunning() || !currentProcess) {
    return { ok: false, status: 409, error: 'No scrape is currently running.' };
  }
  stopRequested = true;
  pushLog('Stop requested by user.');
  killProcessTree(currentProcess);
  return { ok: true };
}

module.exports = {
  startScrape,
  stopScrape,
  getStatus,
  isRunning,
  resolvePython,
  SCRAPER_DIR,
  // Exposed for unit tests — validation is the guard between user input and a
  // spawned browser process, so it is worth pinning independently.
  __internals: { validateParams },
};
