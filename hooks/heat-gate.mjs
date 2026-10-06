const PANE = "heat-gate";
const TICK_MS = 4000;
const HISTORY = 90;
const SPARK = 24;
const GRACE_MS = 45_000;
const STALE_TICKET_MS = 2 * 60 * 60 * 1000;
const POLL_SECONDS = "3";
const DOCKER_MS = 2 * 60 * 1000;
const DOCKER_CLAIM_MS = 30_000;
const BARS = "▁▂▃▄▅▆▇█";

const COLOR = { cool: "#87d7ff", ok: "#afd7af", warm: "#ffd787", hot: "#ffaf5f", fire: "#ff5f5f", accent: "#d787ff", dim: "#8a8a8a" };

const DEFAULTS = { language: "en", hold_above: 80, release_below: 75, freeze_enabled: true, freeze_at: 98, thaw_below: 82, max_wait_minutes: 30, extra_build_pattern: "" };

const STRINGS = {
  en: {
    levels: ["Cool", "Warm", "Hot", "Very hot", "Danger"],
    commandDescription: "CPU temperature, running builds and the heat-gate queue",
    load: "load",
    turboOn: "turbo on",
    turboOff: "turbo off",
    builds: (n) => (n > 1 ? `${n} builds · ` : ""),
    queued: (n) => `${n} queued`,
    frozenBadge: "builds frozen",
    heldTitle: "Build queued",
    waitingFor: "Waiting   ",
    command: "Command   ",
    checking: "checking…",
    heldRule: (cool, max) => `Starts by itself once the CPU is below ${cool}°C and no other build runs. ${max} min at most.`,
    runNow: "Run now",
    cancel: "Cancel",
    reading: "Reading sensors…",
    critical: (c, load, n) => `hardware shutdown at ${c}°C · load ${load}/${n}`,
    runningBuilds: "Running builds",
    none: "  none",
    frozenSuffix: " · frozen",
    queueTitle: "Queue (all sessions)",
    hogsTitle: "Top CPU",
    turboHint: "\nTurbo is on: it is what pushes the temperature up the most.",
    freeze: "Freeze builds",
    thaw: "Resume builds",
    copyTurbo: "Copy the command that turns turbo off",
    rules: (c) => `Holds builds from ${c.hold_above}°C · releases below ${c.release_below}°C${c.freeze_enabled ? ` · freezes at ${c.freeze_at}°C and resumes below ${c.thaw_below}°C` : ""}`,
    lastMinutes: (m) => `last ${m} min`,
    chartAlt: (t) => `CPU temperature over the last minutes, now ${t} degrees`,
    reasonFrozen: "builds are frozen because of the temperature",
    reasonHot: (t) => `CPU at ${t}°C`,
    reasonBusy: (n, where) => `${n === 1 ? "another build" : `${n} builds`} running (${where})`,
    reasonJustStarted: "another build just started",
    reasonTurn: (i, n) => `turn ${i} of ${n} in the queue`,
    reasonAhead: (n) => `${n} queued ahead`,
    statusQueued: (label, why) => `queued: ${label} (${why})`,
    toastForced: (t) => `heat-gate: started without waiting (${t}°C)`,
    toastReleased: (t) => `heat-gate: your turn, starting at ${t}°C`,
    deny: (why, reason) => `heat-gate did not start this build: ${why}. It was waiting because: ${reason}. Do not start it again on your own: tell the user and wait until they ask.`,
    why: { cancel: "the user cancelled it in the heat-gate pane", timeout: "it waited too long while the CPU stayed busy or hot", interrupted: "the turn was interrupted while it waited", error: "heat-gate failed while holding it" },
    noDecision: "there was no decision",
    loadOrHeat: "load or temperature",
    froze: (n, t) => `heat-gate: froze ${n} build processes at ${t}°C to avoid a thermal shutdown`,
    frozeLog: (n, t, thaw) => `builds frozen at ${t}°C (${n} processes). They resume by themselves below ${thaw}°C.`,
    resumed: (t) => `heat-gate: builds resumed (${t}°C)`,
    memory: "Memory",
    threads: (load, n) => `load ${load} · ${n} threads`,
    swap: (used, total) => `swap ${used}/${total} GB`,
    noSwap: "no swap",
    containersRunning: (n) => `🐳 ${n} running`,
    nothingRunning: "nothing running",
    containersTitle: (n) => `Docker containers (${n})`,
    noContainers: "  none running",
    more: (n) => `  and ${n} more`,
    usageAlt: (cpu, mem) => `CPU and memory use over the last minutes, now CPU ${cpu} percent and memory ${mem} percent`,
  },
  es: {
    levels: ["Fresco", "Templado", "Caliente", "Muy caliente", "Peligro"],
    commandDescription: "Temperatura, builds en marcha y cola de heat-gate",
    load: "carga",
    turboOn: "turbo on",
    turboOff: "turbo off",
    builds: (n) => (n > 1 ? `${n} builds · ` : ""),
    queued: (n) => `${n} en cola`,
    frozenBadge: "builds congeladas",
    heldTitle: "Build en cola",
    waitingFor: "Espera    ",
    command: "Comando   ",
    checking: "comprobando…",
    heldRule: (cool, max) => `Se lanza sola cuando la CPU baje de ${cool}°C y no haya otra build. Máximo ${max} min.`,
    runNow: "Lanzar ya",
    cancel: "Cancelar",
    reading: "Leyendo sensores…",
    critical: (c, load, n) => `apagado del hardware a ${c}°C · carga ${load}/${n}`,
    runningBuilds: "Builds en marcha",
    none: "  ninguna",
    frozenSuffix: " · congelada",
    queueTitle: "En cola (todas las sesiones)",
    hogsTitle: "Lo que más CPU usa",
    turboHint: "\nTurbo activo: es lo que más dispara la temperatura.",
    freeze: "Congelar builds",
    thaw: "Reanudar builds",
    copyTurbo: "Copiar comando para quitar el turbo",
    rules: (c) => `Retiene builds desde ${c.hold_above}°C · las libera bajo ${c.release_below}°C${c.freeze_enabled ? ` · congela a ${c.freeze_at}°C y reanuda bajo ${c.thaw_below}°C` : ""}`,
    lastMinutes: (m) => `últimos ${m} min`,
    chartAlt: (t) => `Temperatura de la CPU en los últimos minutos, ahora ${t} grados`,
    reasonFrozen: "hay builds congeladas por temperatura",
    reasonHot: (t) => `CPU a ${t}°C`,
    reasonBusy: (n, where) => `${n === 1 ? "otra build" : `${n} builds`} en marcha (${where})`,
    reasonJustStarted: "otra build acaba de arrancar",
    reasonTurn: (i, n) => `turno ${i} de ${n} en la cola`,
    reasonAhead: (n) => `hay ${n} en cola antes`,
    statusQueued: (label, why) => `en cola: ${label} (${why})`,
    toastForced: (t) => `heat-gate: lanzada sin esperar (${t}°C)`,
    toastReleased: (t) => `heat-gate: turno libre, lanzando a ${t}°C`,
    deny: (why, reason) => `heat-gate no ha lanzado esta build: ${why}. Motivo de la espera: ${reason}. No la relances por tu cuenta: avisa al usuario y espera a que te lo pida.`,
    why: { cancel: "el usuario la canceló desde el panel de heat-gate", timeout: "esperó demasiado con la CPU ocupada o caliente", interrupted: "se interrumpió el turno mientras esperaba", error: "heat-gate falló mientras la retenía" },
    noDecision: "no hubo decisión",
    loadOrHeat: "carga o temperatura",
    froze: (n, t) => `heat-gate: ${n} procesos de build congelados a ${t}°C para evitar el apagado`,
    frozeLog: (n, t, thaw) => `builds congeladas a ${t}°C (${n} procesos). Se reanudan solas por debajo de ${thaw}°C.`,
    resumed: (t) => `heat-gate: builds reanudadas (${t}°C)`,
    memory: "Memoria",
    threads: (load, n) => `carga ${load} · ${n} hilos`,
    swap: (used, total) => `swap ${used}/${total} GB`,
    noSwap: "sin swap",
    containersRunning: (n) => `🐳 ${n} arrancados`,
    nothingRunning: "nada en marcha",
    containersTitle: (n) => `Contenedores Docker (${n})`,
    noContainers: "  ninguno arrancado",
    more: (n) => `  y ${n} más`,
    usageAlt: (cpu, mem) => `Uso de CPU y memoria en los últimos minutos, ahora CPU ${cpu} por ciento y memoria ${mem} por ciento`,
  },
};

const LEVEL_LIMITS = [60, 80, 90, 98, Infinity];
const LEVEL_COLORS = [COLOR.cool, COLOR.ok, COLOR.warm, COLOR.hot, COLOR.fire];

export const HEAVY =
  /(?:^|[\s;&|(])(?:\.\/)?(?:gradlew|gradle|mvnw|mvn)\b(?=[^;&|]*\b(?:build|test|check|integrationTest|assemble|install|verify|package|bootRun|run|compile\w*|jacoco\w*)\b)|\bcargo\s+(?:build|test|bench|run)\b|\bgo\s+(?:build|test)\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:build|test|e2e)\b|\bdocker(?:\s+buildx)?\s+build\b|\bdocker(?:-|\s+)compose\b[^;&|]*\bup\b|\bbazel\s+(?:build|test)\b/;

// Every alternative starts with a word and a parenthesis or an escaped dot, so the
// shell that receives the pattern as an argument never matches it with pgrep -f.
const BUILD_PATTERN =
  "org\\.gradle\\.wrapper\\.GradleWrapperMain|org\\.gradle\\.launcher\\.GradleMain|org\\.codehaus\\.plexus\\.classworlds\\.launcher\\.Launcher|cargo (build|test|bench|run)|go (build|test)|docker (buildx )?build|bazel(-real)? (build|test)";
const FREEZE_PATTERN = "GradleDaemon|GradleWorkerMain|Gradle Test Executor|gradle\\.internal\\.worker|plexus\\.classworlds\\.launcher|(^|/)rustc |(^|/)cargo (build|test|bench)";

const SENSE = `
pick=""
for d in /sys/class/hwmon/hwmon*; do
  case "$(cat "$d/name" 2>/dev/null)" in
    k10temp|zenpower) pick="$d"; break ;;
    coretemp) [ -z "$pick" ] && pick="$d" ;;
  esac
done
t=0; crit=0
if [ -n "$pick" ]; then
  t=$(cat "$pick/temp1_input" 2>/dev/null || echo 0)
  crit=$(cat "$pick/temp1_crit" 2>/dev/null || echo 0)
fi
a=0
for z in /sys/class/thermal/thermal_zone*; do
  v=$(cat "$z/temp" 2>/dev/null || echo 0)
  [ "$v" -gt "$a" ] 2>/dev/null && a=$v
  for tp in "$z"/trip_point_*_type; do
    [ "$(cat "$tp" 2>/dev/null)" = critical ] || continue
    c=$(cat "\${tp%_type}_temp" 2>/dev/null || echo 0)
    if [ "$c" -gt 0 ] 2>/dev/null && { [ "$crit" -eq 0 ] || [ "$c" -lt "$crit" ]; }; then crit=$c; fi
  done
done
bp=x; b=x
if [ -r /sys/devices/system/cpu/cpufreq/boost ]; then bp=/sys/devices/system/cpu/cpufreq/boost; b=$(cat $bp)
elif [ -r /sys/devices/system/cpu/intel_pstate/no_turbo ]; then bp=/sys/devices/system/cpu/intel_pstate/no_turbo; [ "$(cat $bp)" = 1 ] && b=0 || b=1
fi
read l1 _ < /proc/loadavg
echo "S $t $a $crit $b $l1 $(nproc) $bp"
read _ u n s i w q sq st _ < /proc/stat
echo "C $((u + n + s + q + sq + st)) $((i + w))"
echo "M $(awk '/^(MemTotal|MemAvailable|SwapTotal|SwapFree):/ { printf "%s ", $2 }' /proc/meminfo)"
for p in $(pgrep -f "$1"); do
  e=$(ps -o etimes= -p "$p" 2>/dev/null | tr -d ' '); [ -z "$e" ] && continue
  st=$(ps -o stat= -p "$p" 2>/dev/null | tr -d ' ')
  d=$(readlink "/proc/$p/cwd" 2>/dev/null)
  args=$(tr '\\0' ' ' < "/proc/$p/cmdline" 2>/dev/null)
  printf 'B\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "$p" "$e" "$st" "$d" "$args"
done
ps -eo pcpu=,comm= --sort=-pcpu | head -5 | awk '{printf "P\\t%s\\t%s\\n",$1,$2}'
`;

let cfg = { ...DEFAULTS };
let L = STRINGS.en;
let extraHeavy = null;
let samples = [];
let builds = [];
let hogs = [];
let held = null;
let frozen = null;
let queue = [];
let stopTimer = null;
let sessionId = "";
let surface = "terminal";
let containers = null;
let cpuPrev = null;

export function configure(options) {
  cfg = { ...DEFAULTS, ...Object.fromEntries(Object.entries(options ?? {}).filter(([, v]) => v !== undefined && v !== "")) };
  L = STRINGS[cfg.language] ?? STRINGS.en;
  try {
    extraHeavy = cfg.extra_build_pattern ? new RegExp(cfg.extra_build_pattern) : null;
  } catch {
    extraHeavy = null;
  }
  return cfg;
}

export function isHeavy(command) {
  return HEAVY.test(command) || (extraHeavy !== null && extraHeavy.test(command));
}

export function register(on, options) {
  configure(options);

  on("session.start", async ($, e, next) => {
    const result = await next(e);
    surface = e.surface ?? surface;
    try {
      sessionId = await $.session.id();
    } catch {
      sessionId = String(Math.random()).slice(2);
    }
    await tick($);
    const timer = $.clock.every(TICK_MS, () => tick($));
    stopTimer = typeof timer === "function" ? timer : () => timer?.cancel?.();
    try {
      await $.command.register({ name: "heat", description: L.commandDescription, immediate: true });
    } catch {
      // the name is taken: the band still works
    }
    return result;
  });

  on("session.end", async ($, e, next) => {
    stopTimer?.();
    if (held !== null) {
      await dropTicket($, held.ticket);
    }
    return next(e);
  });

  on("command.run", { command: "heat" }, async ($) => {
    await $.ui.open({ id: PANE, title: "heat-gate", focus: true, closeOnEscape: true });
    $.ui.invalidate("ui.render");
    return {};
  });

  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const command = String(e.command ?? "");
    if (!isHeavy(command)) {
      return next(e);
    }
    await sense($);
    const now = await $.clock.now();
    const reason = await blocker($, now, null);
    if (reason === null) {
      await $.store.set("lastStart", now);
      return next(e);
    }

    const mine = { ticket: `${sessionId}-${now}`, command, label: labelOf(command), since: now, reason, decision: null };
    await addTicket($, mine);
    while (held !== null) {
      await $.process.run(["sleep", POLL_SECONDS], { timeoutMs: 10_000 });
    }
    held = mine;

    try {
      await $.ui.open({ id: PANE, title: "heat-gate", rows: 18 });
      $.ui.status(L.statusQueued(mine.label, mine.reason));
      $.ui.invalidate("ui.render");

      // A hook's own time is capped at 10 s, but time spent inside a $ call is not,
      // so the hold waits on short sleeps until the CPU cools or a button decides.
      while (mine.decision === null) {
        if (next.signal.aborted) {
          mine.decision = "interrupted";
          break;
        }
        const t = await $.clock.now();
        if (t - mine.since > cfg.max_wait_minutes * 60_000) {
          mine.decision = "timeout";
          break;
        }
        await $.process.run(["sleep", POLL_SECONDS], { timeoutMs: 10_000 });
        await sense($);
        mine.reason = await blocker($, t, mine.ticket);
        if (mine.reason === null) {
          mine.decision = "auto";
        }
        $.ui.invalidate("ui.render");
      }
    } catch {
      mine.decision = mine.decision ?? "error";
    } finally {
      await dropTicket($, mine.ticket);
      if (held === mine) {
        held = null;
      }
      $.ui.status(undefined);
      $.ui.invalidate("ui.render");
    }

    if (mine.decision === "auto" || mine.decision === "force") {
      await $.store.set("lastStart", await $.clock.now());
      const t = Math.round(last()?.tctl ?? 0);
      $.ui.toast(mine.decision === "force" ? L.toastForced(t) : L.toastReleased(t));
      return next(e);
    }
    return { deny: L.deny(L.why[mine.decision] ?? L.noDecision, mine.reason ?? L.loadOrHeat) };
  }).catch(($, e, next) => next(e));

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const props = e.props ?? {};
    if (props.hasSurvey || e.hasSurvey || samples.length === 0) {
      return next(e);
    }
    const t = $.ui.resolve(e);
    const theirs = await next(e);
    const mine = held !== null ? heldCard(t, held, true) : band(t, props.bodyColumns ?? 100);
    return t.Box({ flexDirection: "column", children: [mine, theirs].filter(Boolean) });
  });

  on("ui.render", { component: "Pane" }, ($, e, next) => {
    if (e.requestId !== PANE) {
      return next(e);
    }
    return pane($.ui.resolve(e), e.surface ?? surface, e.props?.bodyColumns ?? 80, $);
  });
}

async function tick($) {
  await sharedSense($);
  await dockerSense($);
  await guardFreeze($);
  try {
    const stored = await $.store.get("queue");
    queue = Array.isArray(stored) ? stored : [];
  } catch {
    queue = [];
  }
  $.ui.invalidate("ui.render");
}

async function sense($) {
  let run;
  try {
    run = await $.process.run(["bash", "-c", SENSE, "heat-gate", BUILD_PATTERN], { timeoutMs: 8000 });
  } catch {
    return;
  }
  const parsed = parseSense(run.stdout);
  if (parsed.sample === null) {
    return;
  }
  parsed.sample.at = await $.clock.now();
  parsed.sample.cpu = cpuPrev !== null && parsed.cpu !== null ? cpuPercent(cpuPrev, parsed.cpu) : null;
  cpuPrev = parsed.cpu ?? cpuPrev;
  adopt({ sample: parsed.sample, builds: parsed.builds, hogs: parsed.hogs, cpu: cpuPrev });
  try {
    await $.store.set("sense", { at: parsed.sample.at, sample: parsed.sample, builds, hogs, cpu: cpuPrev });
  } catch {
    // the next tick publishes again
  }
}

function adopt(reading) {
  if (samples.length === 0 || samples[samples.length - 1].at !== reading.sample.at) {
    samples.push(reading.sample);
    if (samples.length > HISTORY) {
      samples = samples.slice(-HISTORY);
    }
  }
  builds = reading.builds ?? [];
  hogs = reading.hogs ?? [];
  cpuPrev = reading.cpu ?? cpuPrev;
}

// Every session shows the same machine, so one of them reads the sensors each tick
// and publishes the reading; the others reuse it while it is fresh.
async function sharedSense($) {
  const now = await $.clock.now();
  let shared = null;
  try {
    shared = await $.store.get("sense");
  } catch {
    shared = null;
  }
  if (shared?.sample && now - shared.at < TICK_MS - 500) {
    adopt(shared);
    return;
  }
  await sense($);
}

export function cpuPercent(before, after) {
  const busy = after.busy - before.busy;
  const total = busy + after.idle - before.idle;
  return total > 0 ? Math.max(0, Math.min(100, (busy / total) * 100)) : null;
}

// One read every two minutes for every session together: the first session past the
// deadline claims the turn in the shared store and the others reuse its result.
async function dockerSense($) {
  const now = await $.clock.now();
  let shared = null;
  try {
    shared = await $.store.get("docker");
  } catch {
    shared = null;
  }
  if (shared && "list" in shared) {
    containers = shared.list;
  }
  if (shared && (now - (shared.at ?? 0) < DOCKER_MS || now - (shared.claim ?? 0) < DOCKER_CLAIM_MS)) {
    return;
  }
  await $.store.set("docker", { ...(shared ?? {}), claim: now });
  try {
    const run = await $.process.run(["docker", "stats", "--no-stream", "--format", "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}"], { timeoutMs: 8000 });
    containers = run.exitCode === 0 ? parseDocker(run.stdout) : null;
  } catch {
    containers = null;
  }
  await $.store.set("docker", { at: now, list: containers });
}

const UNITS = { B: 1, KB: 1e3, KIB: 1024, MB: 1e6, MIB: 1024 ** 2, GB: 1e9, GIB: 1024 ** 3, TB: 1e12, TIB: 1024 ** 4 };

export function bytesOf(text) {
  const m = String(text).trim().match(/^([\d.]+)\s*([KMGT]?i?B)$/i);
  return m ? Number(m[1]) * (UNITS[m[2].toUpperCase()] ?? 1) : 0;
}

export function parseDocker(stdout) {
  return String(stdout)
    .split("\n")
    .filter((l) => l.includes("|"))
    .map((l) => {
      const [name, cpu, usage] = l.split("|");
      return { name: name.trim(), cpu: Number.parseFloat(cpu) || 0, mem: bytesOf(String(usage).split("/")[0]) };
    })
    .sort((a, b) => b.cpu - a.cpu || b.mem - a.mem);
}

export function parseSense(stdout) {
  let sample = null;
  let cpu = null;
  let mem = null;
  const found = [];
  const top = [];
  for (const line of String(stdout).split("\n")) {
    if (line.startsWith("S ")) {
      const [, t, a, c, b, l1, n, bp] = line.split(" ");
      const tctl = Number(t) / 1000;
      const zone = Number(a) / 1000;
      sample = {
        tctl: tctl > 0 ? tctl : zone,
        zone,
        crit: Number(c) / 1000 || 100,
        boost: b === "1" ? true : b === "0" ? false : null,
        boostPath: bp && bp !== "x" ? bp : null,
        load: Number(l1) || 0,
        ncpu: Number(n) || 1,
      };
    } else if (line.startsWith("C ")) {
      const [, busy, idle] = line.split(" ").map(Number);
      cpu = Number.isFinite(busy) && Number.isFinite(idle) ? { busy, idle } : null;
    } else if (line.startsWith("M ")) {
      const [total, avail, swapTotal, swapFree] = line.slice(2).trim().split(/\s+/).map((v) => Number(v) * 1024);
      mem = total > 0 ? { used: total - avail, total, swapUsed: (swapTotal || 0) - (swapFree || 0), swapTotal: swapTotal || 0 } : null;
    } else if (line.startsWith("B\t")) {
      const [, pid, etimes, stat, cwd, args] = line.split("\t");
      found.push({ pid: Number(pid), seconds: Number(etimes) || 0, stopped: /T/.test(stat ?? ""), cwd: cwd ?? "", tasks: tasksOf(args ?? "") });
    } else if (line.startsWith("P\t")) {
      const [, pcpu, comm] = line.split("\t");
      top.push({ pcpu: Number(pcpu) || 0, comm: comm ?? "" });
    }
  }
  if (sample !== null) {
    sample.mem = mem;
  }
  return { sample, builds: found, hogs: top, cpu };
}

export function tasksOf(args) {
  const text = String(args).trim();
  const jvm = text.match(/(?:GradleWrapperMain|GradleMain|classworlds\.launcher\.Launcher)\s+(.*)$/);
  const rest = jvm ? jvm[1] : text.split(/\s+/).map((w, i) => (i === 0 ? w.split("/").pop() : w)).join(" ");
  return rest
    .split(/\s+/)
    .filter((w) => w && !w.startsWith("-") && !w.includes("="))
    .slice(0, 4)
    .join(" ");
}

async function blocker($, now, ticket) {
  const s = last();
  if (frozen !== null) {
    return L.reasonFrozen;
  }
  if (s && s.tctl >= (ticket === null ? cfg.hold_above : cfg.release_below)) {
    return L.reasonHot(Math.round(s.tctl));
  }
  const running = builds.filter((b) => !b.stopped);
  if (running.length > 0) {
    return L.reasonBusy(running.length, shortPath(running[0].cwd));
  }
  let lastStart = 0;
  try {
    lastStart = Number(await $.store.get("lastStart")) || 0;
  } catch {
    lastStart = 0;
  }
  if (now - lastStart < GRACE_MS) {
    return L.reasonJustStarted;
  }
  const tickets = await liveTickets($, now);
  if (ticket !== null && tickets.length > 0 && tickets[0].id !== ticket) {
    return L.reasonTurn(tickets.findIndex((x) => x.id === ticket) + 1, tickets.length);
  }
  if (ticket === null && tickets.length > 0) {
    return L.reasonAhead(tickets.length);
  }
  return null;
}

async function liveTickets($, now) {
  let stored = [];
  try {
    stored = await $.store.get("queue");
  } catch {
    stored = [];
  }
  const live = (Array.isArray(stored) ? stored : []).filter((x) => now - x.since < STALE_TICKET_MS);
  return live.sort((a, b) => a.since - b.since);
}

async function addTicket($, mine) {
  const now = await $.clock.now();
  const live = await liveTickets($, now);
  live.push({ id: mine.ticket, since: mine.since, label: mine.label });
  queue = live;
  await $.store.set("queue", live);
}

async function dropTicket($, id) {
  const now = await $.clock.now();
  const live = (await liveTickets($, now)).filter((x) => x.id !== id);
  queue = live;
  await $.store.set("queue", live);
}

async function guardFreeze($) {
  const s = last();
  if (s === null) {
    return;
  }
  let stored = null;
  try {
    stored = await $.store.get("frozen");
  } catch {
    stored = null;
  }
  frozen = stored && Array.isArray(stored.pids) && stored.pids.length > 0 ? stored : null;
  if (frozen === null && cfg.freeze_enabled && s.tctl >= cfg.freeze_at) {
    await freeze($, "auto");
  } else if (frozen !== null && frozen.reason === "auto" && s.tctl < cfg.thaw_below) {
    await thaw($);
  }
}

async function freeze($, reason) {
  let run;
  try {
    run = await $.process.run(["pgrep", "-f", FREEZE_PATTERN], { timeoutMs: 5000 });
  } catch {
    return;
  }
  const pids = run.stdout.split("\n").map((x) => x.trim()).filter((x) => /^\d+$/.test(x));
  if (pids.length === 0) {
    return;
  }
  await $.process.run(["kill", "-STOP", ...pids], { timeoutMs: 5000 });
  frozen = { pids, reason, at: await $.clock.now(), temp: Math.round(last()?.tctl ?? 0) };
  await $.store.set("frozen", frozen);
  $.ui.toast(L.froze(pids.length, frozen.temp), { timeoutMs: 10_000 });
  $.ui.log(L.frozeLog(pids.length, frozen.temp, cfg.thaw_below));
}

async function thaw($) {
  if (frozen === null) {
    return;
  }
  const pids = frozen.pids;
  try {
    await $.process.run(["kill", "-CONT", ...pids], { timeoutMs: 5000 });
  } catch {
    // some pids already exited
  }
  frozen = null;
  await $.store.delete("frozen");
  $.ui.toast(L.resumed(Math.round(last()?.tctl ?? 0)));
}

function last() {
  return samples.length > 0 ? samples[samples.length - 1] : null;
}

export function levelOf(temp) {
  const i = LEVEL_LIMITS.findIndex((limit) => temp < limit);
  return { word: L.levels[i], color: LEVEL_COLORS[i] };
}

export function bar(temp) {
  const ratio = Math.max(0, Math.min(1, (temp - 40) / (110 - 40)));
  return BARS[Math.min(BARS.length - 1, Math.floor(ratio * BARS.length))];
}

function spark(t, count) {
  return samples.slice(-count).map((s, i) => t.Text({ key: `sp${i}`, color: levelOf(s.tctl).color, children: bar(s.tctl) }));
}

export function usageColor(percent) {
  return percent >= 85 ? COLOR.fire : percent >= 70 ? COLOR.hot : percent >= 50 ? COLOR.warm : COLOR.ok;
}

export function pctBar(percent) {
  const ratio = Math.max(0, Math.min(1, percent / 100));
  return BARS[Math.min(BARS.length - 1, Math.floor(ratio * BARS.length))];
}

function usageSpark(t, key, count, pick) {
  return samples
    .slice(-count)
    .filter((s) => pick(s) !== null)
    .map((s, i) => t.Text({ key: `${key}${i}`, color: usageColor(pick(s)), children: pctBar(pick(s)) }));
}

export function memPercent(mem) {
  return mem && mem.total > 0 ? (mem.used / mem.total) * 100 : null;
}

export function meter(percent, width) {
  const full = Math.round((Math.max(0, Math.min(100, percent)) / 100) * width);
  return "▰".repeat(full) + "▱".repeat(width - full);
}

export function gb(bytes) {
  const g = bytes / 1024 ** 3;
  return g >= 10 ? g.toFixed(0) : g.toFixed(1);
}

function human(bytes) {
  return bytes >= 1024 ** 3 ? `${gb(bytes)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

export function labelOf(command) {
  const jvm = command.match(/(?:\.\/)?(gradlew|gradle|mvnw|mvn)\b([^;&|]*)/);
  if (jvm) {
    const tasks = jvm[2].split(/\s+/).filter((w) => w && !w.startsWith("-") && !w.includes("=")).slice(0, 3).join(" ");
    return `${jvm[1]} ${tasks}`.trim();
  }
  const other = command.match(/\b(cargo\s+\w+|go\s+(?:build|test)|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?\w+|docker(?:\s+buildx)?\s+build|docker(?:-|\s+)compose\b[^;&|]*\bup|bazel\s+\w+)/);
  return other ? other[1].replace(/\s+/g, " ").replace(/^docker(-| )compose.*\bup$/, "docker compose up") : command.slice(0, 40);
}

function shortPath(path) {
  return String(path).split("/").filter(Boolean).pop() ?? path;
}

function ago(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}m${String(seconds % 60).padStart(2, "0")}s` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
}

function band(t, columns) {
  const { Box, Text } = t;
  const s = last();
  const lv = levelOf(s.tctl);
  const wide = columns >= 110;
  const width = wide ? 16 : 8;
  const sep = (k) => Text({ key: k, dimColor: true, children: "  │  " });
  const metrics = [Text({ key: "temp", color: lv.color, bold: true, children: `● ${Math.round(s.tctl)}°C ` }), ...spark(t, width)];
  if (s.cpu !== null && s.cpu !== undefined) {
    metrics.push(sep("s1"), Text({ key: "cpu-l", dimColor: true, children: "CPU " }), Text({ key: "cpu", color: usageColor(s.cpu), bold: true, children: `${String(Math.round(s.cpu)).padStart(2)}% ` }), ...usageSpark(t, "cs", width, (x) => x.cpu ?? null));
  }
  const mp = memPercent(s.mem);
  if (mp !== null) {
    metrics.push(sep("s2"), Text({ key: "ram-l", dimColor: true, children: "RAM " }), Text({ key: "ram", color: usageColor(mp), bold: true, children: `${gb(s.mem.used)}/${gb(s.mem.total)}G ` }), Text({ key: "ram-m", color: usageColor(mp), children: meter(mp, wide ? 8 : 5) }));
  }
  if (containers !== null) {
    const total = containers.reduce((sum, c) => sum + c.mem, 0);
    metrics.push(sep("s3"), Text({ key: "dk", color: containers.length > 0 ? COLOR.cool : COLOR.dim, children: `🐳 ${containers.length}${containers.length > 0 && wide ? ` · ${human(total)}` : ""}` }));
  }
  metrics.push(sep("s4"), Text({ key: "load", dimColor: true, children: `${L.load} ${s.load.toFixed(1)}/${s.ncpu}` }));
  if (s.boost !== null) {
    metrics.push(Text({ key: "boost", color: s.boost ? COLOR.warm : COLOR.dim, children: ` · ${s.boost ? L.turboOn : L.turboOff}` }));
  }

  const activity = [];
  const running = builds.filter((b) => !b.stopped);
  if (running.length > 0) {
    const first = running[0];
    activity.push(Text({ key: "builds", color: COLOR.accent, children: `⚙ ${L.builds(running.length)}${shortPath(first.cwd)} ${first.tasks} ${ago(first.seconds)}  ` }));
  }
  if (queue.length > 0) {
    activity.push(Text({ key: "queue", color: COLOR.warm, children: `⏸ ${L.queued(queue.length)}  ` }));
  }
  if (frozen !== null) {
    activity.push(Text({ key: "frozen", color: COLOR.cool, bold: true, children: `❄ ${L.frozenBadge}` }));
  }
  const rows = [Box({ key: "metrics", flexDirection: "row", children: metrics })];
  if (activity.length > 0) {
    rows.push(Box({ key: "activity", flexDirection: "row", children: activity }));
  }
  return Box({ key: "heat-band", flexDirection: "column", paddingX: 1, children: rows });
}

function heldCard(t, state, inBand) {
  const { Box, Text, Button } = t;
  const decide = (choice) => () => {
    if (state.decision === null) {
      state.decision = choice;
    }
  };
  return Box({
    key: "held",
    flexDirection: "column",
    borderStyle: "round",
    borderColor: COLOR.warm,
    paddingX: 1,
    children: [
      Text({ key: "h-title", bold: true, color: COLOR.warm, children: `⏸ ${L.heldTitle} · ${state.label}` }),
      Text({ key: "h-why", children: [Text({ dimColor: true, children: L.waitingFor }), Text({ children: state.reason ?? L.checking })] }),
      Text({ key: "h-cmd", wrap: "truncate-end", children: [Text({ dimColor: true, children: L.command }), Text({ children: state.command })] }),
      Text({ key: "h-rule", dimColor: true, children: L.heldRule(cfg.release_below, cfg.max_wait_minutes) }),
      Box({
        key: "h-buttons",
        marginTop: inBand ? 0 : 1,
        gap: 2,
        children: [
          Button({ key: "force", label: L.runNow, hotkey: "1", plain: true, onPress: decide("force") }),
          Button({ key: "cancel", label: L.cancel, hotkey: "2", plain: true, onPress: decide("cancel") }),
        ],
      }),
    ],
  });
}

export function turboCommand(path) {
  return path && path.endsWith("no_turbo") ? `echo 1 | sudo tee ${path}` : `echo 0 | sudo tee ${path ?? "/sys/devices/system/cpu/cpufreq/boost"}`;
}

function pane(t, where, columns, $) {
  const { Box, Text, Button } = t;
  const s = last();
  if (s === null) {
    return Text({ children: L.reading });
  }
  const lv = levelOf(s.tctl);
  const rows = [];
  rows.push(
    Box({
      key: "head",
      flexDirection: "row",
      gap: 2,
      children: [
        Text({ key: "big", bold: true, color: lv.color, children: `● ${Math.round(s.tctl)}°C  ${lv.word}` }),
        Text({ key: "crit", dimColor: true, children: L.critical(Math.round(s.crit), s.load.toFixed(1), s.ncpu) }),
      ],
    }),
  );
  rows.push(stats(t, s));
  if (where === "desktop" && t.Svg) {
    rows.push(chartSvg(t, s.crit), usageSvg(t));
  } else {
    const width = Math.max(20, Math.min(HISTORY, columns - 8));
    rows.push(chartText(t, width), usageText(t, width));
  }
  if (held !== null) {
    rows.push(heldCard(t, held, false));
  }

  rows.push(section(t, "builds", L.runningBuilds));
  if (builds.length === 0) {
    rows.push(Text({ key: "nob", dimColor: true, children: L.none }));
  }
  for (const b of builds) {
    rows.push(
      Text({
        key: `b${b.pid}`,
        wrap: "truncate-end",
        children: [
          Text({ color: b.stopped ? COLOR.cool : COLOR.accent, children: b.stopped ? "  ❄ " : "  ⚙ " }),
          Text({ bold: true, children: shortPath(b.cwd) }),
          Text({ children: `  ${b.tasks}` }),
          Text({ dimColor: true, children: `  ${ago(b.seconds)}${b.stopped ? L.frozenSuffix : ""}` }),
        ],
      }),
    );
  }

  if (containers !== null) {
    rows.push(section(t, "docker", L.containersTitle(containers.length)));
    if (containers.length === 0) {
      rows.push(Text({ key: "nod", dimColor: true, children: L.noContainers }));
    }
    for (const c of containers.slice(0, 12)) {
      rows.push(
        Text({
          key: `dk-${c.name}`,
          wrap: "truncate-end",
          children: [
            Text({ color: usageColor(Math.min(100, c.cpu)), children: `  ${c.cpu.toFixed(1).padStart(6)}%  ` }),
            Text({ color: COLOR.cool, children: `${human(c.mem).padStart(7)}  ` }),
            Text({ children: c.name }),
          ],
        }),
      );
    }
    if (containers.length > 12) {
      rows.push(Text({ key: "dk-more", dimColor: true, children: L.more(containers.length - 12) }));
    }
  }

  if (queue.length > 0) {
    rows.push(section(t, "queue", L.queueTitle));
    queue.forEach((q, i) => rows.push(Text({ key: `q${q.id}`, children: [Text({ color: COLOR.warm, children: `  ${i + 1}. ` }), Text({ children: q.label })] })));
  }

  rows.push(section(t, "hogs", L.hogsTitle));
  for (const [i, h] of hogs.entries()) {
    rows.push(Text({ key: `hog${i}`, children: [Text({ color: h.pcpu > 100 ? COLOR.hot : COLOR.dim, children: `  ${String(Math.round(h.pcpu)).padStart(4)}%  ` }), Text({ children: h.comm })] }));
  }

  if (s.boost === true) {
    rows.push(Text({ key: "boost", color: COLOR.warm, children: L.turboHint }));
  }

  const buttons = [
    frozen === null
      ? Button({ key: "freeze", label: L.freeze, hotkey: "f", plain: true, onPress: () => freeze($, "manual") })
      : Button({ key: "thaw", label: L.thaw, hotkey: "r", plain: true, onPress: () => thaw($) }),
  ];
  if (s.boost === true) {
    buttons.push(Button({ key: "copy", label: L.copyTurbo, hotkey: "t", plain: true, onPress: () => $.ui.copy(turboCommand(s.boostPath)) }));
  }
  rows.push(Box({ key: "actions", marginTop: 1, gap: 3, children: buttons }));
  rows.push(Text({ key: "rules", dimColor: true, children: L.rules(cfg) }));

  return Box({ flexDirection: "column", paddingX: 1, children: rows });
}

function stats(t, s) {
  const { Box, Text } = t;
  const tile = (key, label, value, color, extra) =>
    Box({
      key,
      flexDirection: "column",
      borderStyle: "round",
      borderColor: COLOR.dim,
      paddingX: 1,
      children: [Text({ key: "l", dimColor: true, children: label }), Text({ key: "v", bold: true, color, children: value }), Text({ key: "x", dimColor: true, children: extra })],
    });
  const tiles = [];
  if (s.cpu !== null && s.cpu !== undefined) {
    tiles.push(tile("t-cpu", "CPU", `${Math.round(s.cpu)}%  ${meter(s.cpu, 10)}`, usageColor(s.cpu), L.threads(s.load.toFixed(1), s.ncpu)));
  }
  const mp = memPercent(s.mem);
  if (mp !== null) {
    tiles.push(tile("t-ram", L.memory, `${gb(s.mem.used)}/${gb(s.mem.total)} GB  ${meter(mp, 10)}`, usageColor(mp), s.mem.swapTotal > 0 ? L.swap(gb(s.mem.swapUsed), gb(s.mem.swapTotal)) : L.noSwap));
  }
  if (containers !== null) {
    const cpu = containers.reduce((sum, c) => sum + c.cpu, 0);
    const memory = containers.reduce((sum, c) => sum + c.mem, 0);
    tiles.push(tile("t-dk", "Docker", L.containersRunning(containers.length), COLOR.cool, containers.length > 0 ? `${cpu.toFixed(0)}% CPU · ${human(memory)}` : L.nothingRunning));
  }
  return Box({ key: "stats", flexDirection: "row", gap: 1, marginTop: 1, children: tiles });
}

function usageText(t, width) {
  const { Box, Text } = t;
  const line = (key, label, pick) => Box({ key, flexDirection: "row", children: [Text({ key: "l", dimColor: true, children: label }), ...usageSpark(t, key, width, pick)] });
  return Box({ key: "usage", flexDirection: "column", marginTop: 1, children: [line("u-cpu", "CPU  ", (x) => x.cpu ?? null), line("u-ram", "RAM  ", (x) => memPercent(x.mem))] });
}

function usageSvg(t) {
  const W = 560;
  const H = 110;
  const data = samples.slice(-HISTORY);
  const y = (v) => H - 16 - (Math.max(0, Math.min(100, v)) / 100) * (H - 26);
  const x = (i) => 36 + ((i + HISTORY - data.length) / Math.max(1, HISTORY - 1)) * (W - 44);
  const path = (pick) =>
    data
      .map((s, i) => [i, pick(s)])
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");
  const cpu = path((s) => s.cpu);
  const ram = path((s) => memPercent(s.mem));
  const grid = [0, 50, 100].map((v) => `<line x1="36" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="${COLOR.dim}" stroke-width="0.5" opacity="0.4"/><text x="4" y="${y(v) + 4}" font-size="10" fill="${COLOR.dim}" font-family="sans-serif">${v}%</text>`).join("");
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${grid}
${ram ? `<polyline points="${ram}" fill="none" stroke="${COLOR.accent}" stroke-width="2" stroke-linejoin="round"/>` : ""}
${cpu ? `<polyline points="${cpu}" fill="none" stroke="${COLOR.cool}" stroke-width="2" stroke-linejoin="round"/>` : ""}
<circle cx="44" cy="${H - 4}" r="3" fill="${COLOR.cool}"/><text x="51" y="${H - 1}" font-size="10" fill="${COLOR.dim}" font-family="sans-serif">CPU</text>
<circle cx="90" cy="${H - 4}" r="3" fill="${COLOR.accent}"/><text x="97" y="${H - 1}" font-size="10" fill="${COLOR.dim}" font-family="sans-serif">RAM</text>
</svg>`;
  const now = last();
  return t.Svg({ source, alt: L.usageAlt(Math.round(now?.cpu ?? 0), Math.round(memPercent(now?.mem) ?? 0)), width: W, height: H });
}

function section(t, key, title) {
  return t.Text({ key: `sec-${key}`, bold: true, color: COLOR.dim, children: `\n${title}` });
}

function chartText(t, width) {
  const { Box, Text } = t;
  const data = samples.slice(-width);
  const height = 6;
  const lines = [];
  for (let row = height - 1; row >= 0; row -= 1) {
    const cells = data.map((s, i) => {
      const filled = ((s.tctl - 40) / 70) * height - row;
      const ch = filled >= 1 ? "█" : filled > 0 ? BARS[Math.max(0, Math.min(7, Math.floor(filled * 8)))] : " ";
      return Text({ key: `c${row}-${i}`, color: levelOf(s.tctl).color, children: ch });
    });
    const label = row === height - 1 ? "110° " : row === 0 ? " 40° " : "     ";
    lines.push(Box({ key: `row${row}`, flexDirection: "row", children: [Text({ key: `l${row}`, dimColor: true, children: label }), ...cells] }));
  }
  lines.push(Text({ key: "axis", dimColor: true, children: `     ${L.lastMinutes(Math.round((data.length * TICK_MS) / 60000))}` }));
  return Box({ key: "chart", flexDirection: "column", marginTop: 1, children: lines });
}

function chartSvg(t, crit) {
  const W = 560;
  const H = 150;
  const data = samples.slice(-HISTORY);
  const y = (temp) => H - 18 - ((Math.max(40, Math.min(115, temp)) - 40) / 75) * (H - 30);
  const x = (i) => 36 + (i / Math.max(1, HISTORY - 1)) * (W - 44);
  const pts = data.map((s, i) => `${x(i + HISTORY - data.length).toFixed(1)},${y(s.tctl).toFixed(1)}`).join(" ");
  const first = x(HISTORY - data.length).toFixed(1);
  const lastX = x(HISTORY - 1).toFixed(1);
  const guide = (temp, color, label) =>
    `<line x1="36" x2="${W - 8}" y1="${y(temp)}" y2="${y(temp)}" stroke="${color}" stroke-dasharray="4 4" stroke-width="1" opacity="0.7"/><text x="4" y="${y(temp) + 4}" font-size="10" fill="${color}" font-family="sans-serif">${label}</text>`;
  const guides = [guide(crit, COLOR.fire, `${Math.round(crit)}°`), cfg.freeze_enabled ? guide(cfg.freeze_at, COLOR.hot, `${cfg.freeze_at}°`) : "", guide(cfg.hold_above, COLOR.warm, `${cfg.hold_above}°`)].join("");
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${COLOR.fire}" stop-opacity="0.55"/><stop offset="45%" stop-color="${COLOR.warm}" stop-opacity="0.35"/><stop offset="100%" stop-color="${COLOR.cool}" stop-opacity="0.08"/></linearGradient></defs>
${guides}
${data.length > 1 ? `<polygon points="${first},${H - 18} ${pts} ${lastX},${H - 18}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="${levelOf(last().tctl).color}" stroke-width="2.2" stroke-linejoin="round"/>` : ""}
<text x="${W - 8}" y="${H - 4}" font-size="10" text-anchor="end" fill="${COLOR.dim}" font-family="sans-serif">${L.lastMinutes(Math.round((HISTORY * TICK_MS) / 60000))}</text>
</svg>`;
  return t.Svg({ source, alt: L.chartAlt(Math.round(last().tctl)), width: W, height: H });
}
