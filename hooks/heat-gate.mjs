const PANE = "heat-gate";
const TICK_MS = 4000;
const HISTORY = 90;
const SPARK = 24;
const GRACE_MS = 45_000;
const POLL_SECONDS = "3";
const DOCKER_MS = 2 * 60 * 1000;
const DOCKER_CLAIM_MS = 30_000;
const STALE_MS = 15_000;
const GUARD_SECONDS = 600;
const BARS = "▁▂▃▄▅▆▇█";

const COLOR = { cool: "#87d7ff", ok: "#afd7af", warm: "#ffd787", hot: "#ffaf5f", fire: "#ff5f5f", accent: "#d787ff", dim: "#8a8a8a" };

const PRESSURE_COLORS = [COLOR.ok, COLOR.warm, COLOR.hot, COLOR.fire, COLOR.fire];

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
    heldRule: (until, max) => `Starts by itself once ${until} and no other build runs. ${max} min at most.`,
    coolerThan: (t) => `the CPU is below ${t}°C`,
    pressureNormal: "the thermal pressure is back to normal",
    runNow: "Run now",
    cancel: "Cancel",
    reading: "Reading sensors…",
    critical: (c, load, n) => `hardware shutdown at ${c}°C · load ${load}/${n}`,
    criticalMac: (load, n) => `macOS thermal pressure · load ${load}/${n}`,
    pressure: ["normal", "moderate", "high", "critical", "critical"],
    pressureShort: (word) => `pressure ${word}`,
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
    rulesMac: (c) => `Holds builds while the macOS thermal pressure is above normal${c.freeze_enabled ? " · freezes them when it is high and resumes them when it is back to normal" : ""}`,
    lastMinutes: (m) => `last ${m} min`,
    chartAlt: (t) => `CPU temperature over the last minutes, now ${t} degrees`,
    reasonFrozen: "builds are frozen because of the temperature",
    reasonHot: (h) => `CPU at ${h}`,
    reasonPressure: (word) => `macOS thermal pressure ${word}`,
    reasonBusy: (n, where) => `${n === 1 ? "another build" : `${n} builds`} running (${where})`,
    reasonJustStarted: "another build just started",
    reasonTurn: (i, n) => `turn ${i} of ${n} in the queue`,
    reasonAhead: (n) => `${n} queued ahead`,
    statusQueued: (label, why) => `queued: ${label} (${why})`,
    toastForced: (h) => `heat-gate: started without waiting (${h})`,
    toastReleased: (h) => `heat-gate: your turn, starting (${h})`,
    deny: (why, reason) => `heat-gate did not start this build: ${why}. It was waiting because: ${reason}. Do not start it again on your own: tell the user and wait until they ask.`,
    why: { cancel: "the user cancelled it in the heat-gate pane", timeout: "it waited too long while the CPU stayed busy or hot", interrupted: "the turn was interrupted while it waited", error: "heat-gate failed while holding it" },
    noDecision: "there was no decision",
    loadOrHeat: "load or temperature",
    froze: (n, h) => `heat-gate: froze ${n} build processes (${h}) to avoid a thermal shutdown`,
    frozeLog: (n, h, until) => `builds frozen (${h}, ${n} processes). They resume by themselves once ${until}.`,
    resumed: (h) => `heat-gate: builds resumed (${h})`,
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
    heldRule: (until, max) => `Se lanza sola cuando ${until} y no haya otra build. Máximo ${max} min.`,
    coolerThan: (t) => `la CPU baje de ${t}°C`,
    pressureNormal: "la presión térmica vuelva a normal",
    runNow: "Lanzar ya",
    cancel: "Cancelar",
    reading: "Leyendo sensores…",
    critical: (c, load, n) => `apagado del hardware a ${c}°C · carga ${load}/${n}`,
    criticalMac: (load, n) => `presión térmica de macOS · carga ${load}/${n}`,
    pressure: ["normal", "moderada", "alta", "crítica", "crítica"],
    pressureShort: (word) => `presión ${word}`,
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
    rulesMac: (c) => `Retiene builds mientras la presión térmica de macOS no sea normal${c.freeze_enabled ? " · las congela cuando es alta y las reanuda cuando vuelve a normal" : ""}`,
    lastMinutes: (m) => `últimos ${m} min`,
    chartAlt: (t) => `Temperatura de la CPU en los últimos minutos, ahora ${t} grados`,
    reasonFrozen: "hay builds congeladas por temperatura",
    reasonHot: (h) => `CPU a ${h}`,
    reasonPressure: (word) => `presión térmica de macOS ${word}`,
    reasonBusy: (n, where) => `${n === 1 ? "otra build" : `${n} builds`} en marcha (${where})`,
    reasonJustStarted: "otra build acaba de arrancar",
    reasonTurn: (i, n) => `turno ${i} de ${n} en la cola`,
    reasonAhead: (n) => `hay ${n} en cola antes`,
    statusQueued: (label, why) => `en cola: ${label} (${why})`,
    toastForced: (h) => `heat-gate: lanzada sin esperar (${h})`,
    toastReleased: (h) => `heat-gate: turno libre, lanzando (${h})`,
    deny: (why, reason) => `heat-gate no ha lanzado esta build: ${why}. Motivo de la espera: ${reason}. No la relances por tu cuenta: avisa al usuario y espera a que te lo pida.`,
    why: { cancel: "el usuario la canceló desde el panel de heat-gate", timeout: "esperó demasiado con la CPU ocupada o caliente", interrupted: "se interrumpió el turno mientras esperaba", error: "heat-gate falló mientras la retenía" },
    noDecision: "no hubo decisión",
    loadOrHeat: "carga o temperatura",
    froze: (n, h) => `heat-gate: ${n} procesos de build congelados (${h}) para evitar el apagado`,
    frozeLog: (n, h, until) => `builds congeladas (${h}, ${n} procesos). Se reanudan solas cuando ${until}.`,
    resumed: (h) => `heat-gate: builds reanudadas (${h})`,
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

const JAVA_MAIN = "^([^ ]*/)?java( .*)? ";
const EXE = "^([^ ]*/)?";
// A Node or Bun script shows up as the interpreter followed by the path of the script.
const JS_SCRIPT = "^([^ ]*/)?(node|nodejs|bun)( -[^ ]+)* [^ ]*/";
const SCRIPT = "(build|test|e2e)([:.-][^ ]*)?( |$)";

// Every alternative is anchored to the executable at the start of the command line, so
// the shell that receives the pattern as an argument never matches itself with pgrep -f.
// The patterns are plain POSIX extended regular expressions, which JavaScript reads too.
export const BUILD_PATTERN = [
  `${JAVA_MAIN}org\\.gradle\\.wrapper\\.GradleWrapperMain( |$)`,
  `${JAVA_MAIN}org\\.gradle\\.launcher\\.GradleMain( |$)`,
  `${JAVA_MAIN}org\\.codehaus\\.plexus\\.classworlds\\.launcher\\.Launcher( |$)`,
  `${EXE}cargo( \\+[^ ]+)? (build|test|bench|run)( |$)`,
  `${EXE}go (build|test)( |$)`,
  `${EXE}docker(-buildx)? (buildx )?build( |$)`,
  `${EXE}(docker compose|docker-compose( compose)?)( -[^ ]+( [^ -][^ ]*)?)* build( |$)`,
  `${EXE}bazel(-real)? (build|test)( |$)`,
  `${EXE}g?make( |$)`,
  `${EXE}ninja( |$)`,
  `${EXE}cmake( [^ ]+)* --build( |$)`,
  `${EXE}xcodebuild( |$)`,
  `${EXE}swift(-build|-test| build| test)( |$)`,
  `${EXE}tsc( |$)`,
  `${JS_SCRIPT}tsc( |$)`,
  `${JS_SCRIPT}next build( |$)`,
  `${JS_SCRIPT}vite build( |$)`,
  `${EXE}(npm|pnpm|yarn|bun)( run| run-script)? ${SCRIPT}`,
  `${JS_SCRIPT}(npm-cli\\.js|npm|pnpm(\\.c?js)?|yarn(-[^ /]*)?(\\.c?js)?)( run| run-script)? ${SCRIPT}`,
].join("|");

export const FREEZE_PATTERN = [
  `${JAVA_MAIN}org\\.gradle\\.launcher\\.daemon\\.bootstrap\\.GradleDaemon( |$)`,
  `${JAVA_MAIN}worker\\.org\\.gradle\\.process\\.internal\\.worker\\.GradleWorkerMain( |$)`,
  `${JAVA_MAIN}org\\.codehaus\\.plexus\\.classworlds\\.launcher\\.Launcher( |$)`,
  "^([^ ]*/)?rustc( |$)",
  "^([^ ]*/)?cargo( \\+[^ ]+)? (build|test|bench)( |$)",
].join("|");

const PGREP_MINE = 'exec pgrep -u "$(id -u)" -f "$1"';

const GUARD = `
if command -v setsid >/dev/null 2>&1; then
  setsid sh -c 'sleep "$1"; shift; kill -CONT "$@"' "$0" "$@" </dev/null >/dev/null 2>&1 &
else
  nohup sh -c 'sleep "$1"; shift; kill -CONT "$@"' "$0" "$@" </dev/null >/dev/null 2>&1 &
fi
`;

const LOCK = `
d="\${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/data/heat-gate"
l="$d/admit.lock"
mkdir -p "$d" || exit 2
i=0
while [ "$i" -lt 30 ]; do
  mkdir "$l" 2>/dev/null && { echo "$l"; exit 0; }
  m=$(stat -c %Y "$l" 2>/dev/null || stat -f %m "$l" 2>/dev/null)
  if [ -n "$m" ] && [ $(( $(date +%s) - m )) -gt 10 ]; then
    mv "$l" "$l.$$" 2>/dev/null && rm -rf "$l.$$"
  else
    sleep 0.1
  fi
  i=$((i + 1))
done
[ -d "$l" ] && exit 1
exit 2
`;

const SENSE = `
if [ "$(uname -s)" = Darwin ]; then
  t=x
  if command -v macmon >/dev/null 2>&1; then
    t=$(macmon pipe -s 1 -i 300 2>/dev/null | grep -o '"cpu_temp_avg":[0-9.]*' | head -1 | cut -d: -f2)
  fi
  pr=$(notifyutil -g com.apple.system.thermalpressurelevel 2>/dev/null | awk '{print $2}')
  n=$(sysctl -n hw.logicalcpu)
  echo "D \${t:-x} \${pr:-x} $(sysctl -n vm.loadavg | awk '{print $2}') $n"
  echo "U $(ps -A -o %cpu= | awk -v n="$n" '{s += $1} END {printf "%.1f", s / n}')"
  pg=$(sysctl -n hw.pagesize)
  avail=$(vm_stat | awk -v pg="$pg" '/^Pages (free|inactive|speculative):/ {gsub(/\\./, "", $NF); s += $NF} END {printf "%.0f", s * pg / 1024}')
  swap=$(sysctl -n vm.swapusage | awk 'function kb(v) {u = substr(v, length(v)); x = v + 0; return u == "G" ? x * 1048576 : u == "M" ? x * 1024 : x} {printf "%.0f %.0f", kb($3), kb($9)}')
  echo "M $(( $(sysctl -n hw.memsize) / 1024 )) $avail $swap"
  for p in $(pgrep -f "$1"); do
    e=$(ps -o etime= -p "$p" 2>/dev/null | tr -d ' '); [ -z "$e" ] && continue
    st=$(ps -o stat= -p "$p" 2>/dev/null | tr -d ' ')
    d=$(lsof -a -p "$p" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)
    args=$(ps -ww -o command= -p "$p" 2>/dev/null)
    printf 'B\\t%s\\t%s\\t%s\\t%s\\t%s\\n' "$p" "$e" "$st" "$d" "$args"
  done
  ps -Ao pcpu=,comm= -r | head -5 | awk '{p = $1; $1 = ""; sub(/^ +/, ""); n = split($0, a, "/"); printf "P\\t%s\\t%s\\n", p, a[n]}'
  exit 0
fi
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
let ticking = false;
let gate = Promise.resolve();
let serial = 0;
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
  return segmentsOf(command).some((words) => jobIn(words) !== null) || (extraHeavy !== null && extraHeavy.test(command));
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
    stopTimer?.();
    const timer = $.clock.every(TICK_MS, () => tick($));
    stopTimer = typeof timer === "function" ? timer : () => timer?.cancel?.();
    try {
      await $.command.register({ name: "heat", description: L.commandDescription, immediate: true });
    } catch {}
    return result;
  });

  on("session.end", async ($, e, next) => {
    if (e.reason !== "clear" && e.reason !== "resume") {
      stopTimer?.();
      stopTimer = null;
    }
    const ending = new Set([e.sessionId, sessionId].filter(Boolean));
    try {
      await dropTickets($, (x) => ending.has(x.owner));
    } catch {}
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
    const reason = await admit($, now, null);
    if (reason === null) {
      return next(e);
    }

    sessionId = await currentSession($);
    serial += 1;
    const mine = { ticket: `${sessionId}-${now}-${serial}`, owner: sessionId, command, label: labelOf(command), since: now, reason, decision: null };
    try {
      await beat($, mine);
      while (held !== null && !next.signal.aborted) {
        await $.process.run(["sleep", POLL_SECONDS], { timeoutMs: 10_000 });
        await beat($, mine);
      }
      if (!next.signal.aborted) {
        held = mine;
        await $.ui.open({ id: PANE, title: "heat-gate", rows: 18 });
        $.ui.status(L.statusQueued(mine.label, mine.reason));
        $.ui.invalidate("ui.render");
      }

      // A hook's own time is capped at 10 s, but time spent inside a $ call is not,
      // so the hold waits on short sleeps until the CPU cools or a button decides.
      while (mine.decision === null) {
        if (next.signal.aborted) {
          mine.decision = "interrupted";
          break;
        }
        if ((await $.clock.now()) - mine.since > cfg.max_wait_minutes * 60_000) {
          mine.decision = "timeout";
          break;
        }
        await $.process.run(["sleep", POLL_SECONDS], { timeoutMs: 10_000 });
        if (mine.decision !== null) {
          break;
        }
        await sense($);
        mine.reason = await admit($, await $.clock.now(), mine);
        if (mine.reason === null) {
          mine.decision = "auto";
        } else {
          await beat($, mine);
        }
        $.ui.invalidate("ui.render");
      }
      if (mine.decision === "force") {
        await $.store.set("lastStart", await $.clock.now());
      }
    } catch {
      mine.decision = mine.decision ?? (next.signal.aborted ? "interrupted" : "error");
    } finally {
      if (held === mine) {
        held = null;
      }
      try {
        await dropTickets($, (x) => x.id === mine.ticket);
      } catch {}
      $.ui.status(undefined);
      $.ui.invalidate("ui.render");
    }

    if (mine.decision === "auto" || mine.decision === "force") {
      const h = heatLabel(last());
      $.ui.toast(mine.decision === "force" ? L.toastForced(h) : L.toastReleased(h));
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
    const mine = held !== null ? heldCard(t, held, true) : band(t, props.bodyColumns ?? 100, e.surface);
    return t.Box({ flexDirection: "column", children: [theirs, mine].filter(Boolean) });
  });

  on("ui.render", { component: "Pane" }, ($, e, next) => {
    if (e.requestId !== PANE) {
      return next(e);
    }
    return pane($.ui.resolve(e), e.surface ?? surface, e.props?.bodyColumns ?? 80, $);
  });
}

async function tick($) {
  if (ticking) {
    return;
  }
  ticking = true;
  try {
    await sharedSense($);
    await dockerSense($);
    await guardFreeze($);
    queue = await liveTickets($, await $.clock.now());
    $.ui.invalidate("ui.render");
  } finally {
    ticking = false;
  }
}

async function currentSession($) {
  try {
    return (await $.session.id()) || sessionId;
  } catch {
    return sessionId;
  }
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
  parsed.sample.cpu = parsed.usage ?? (cpuPrev !== null && parsed.cpu !== null ? cpuPercent(cpuPrev, parsed.cpu) : null);
  cpuPrev = parsed.cpu ?? cpuPrev;
  adopt({ sample: parsed.sample, builds: parsed.builds, hogs: parsed.hogs, cpu: cpuPrev });
  try {
    await $.store.set("sense", { at: parsed.sample.at, sample: parsed.sample, builds, hogs, cpu: cpuPrev });
  } catch {}
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

export function pressureOf(raw) {
  const v = Number(raw);
  if (raw === undefined || raw === "x" || raw === "" || !Number.isFinite(v)) {
    return null;
  }
  return v >= 10 ? Math.max(0, Math.min(4, Math.round(v / 10) - 1)) : Math.max(0, Math.min(4, Math.round(v)));
}

export function secondsOf(text) {
  const t = String(text ?? "").trim();
  if (/^\d+$/.test(t)) {
    return Number(t);
  }
  const m = t.match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
  return m ? ((Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 60 + Number(m[3])) * 60 + Number(m[4]) : 0;
}

export function parseSense(stdout) {
  let sample = null;
  let usage = null;
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
    } else if (line.startsWith("D ")) {
      const [, t, p, l1, n] = line.split(" ");
      const temp = Number(t);
      sample = {
        tctl: Number.isFinite(temp) && temp > 0 ? temp : null,
        zone: null,
        crit: null,
        boost: null,
        boostPath: null,
        load: Number(l1) || 0,
        ncpu: Number(n) || 1,
        pressure: pressureOf(p),
      };
    } else if (line.startsWith("U ")) {
      const v = Number(line.slice(2));
      usage = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : null;
    } else if (line.startsWith("C ")) {
      const [, busy, idle] = line.split(" ").map(Number);
      cpu = Number.isFinite(busy) && Number.isFinite(idle) ? { busy, idle } : null;
    } else if (line.startsWith("M ")) {
      const [total, avail, swapTotal, swapFree] = line.slice(2).trim().split(/\s+/).map((v) => Number(v) * 1024);
      mem = total > 0 ? { used: total - avail, total, swapUsed: (swapTotal || 0) - (swapFree || 0), swapTotal: swapTotal || 0 } : null;
    } else if (line.startsWith("B\t")) {
      const [, pid, etimes, stat, cwd, args] = line.split("\t");
      if (!isContinuous(args ?? "")) {
        found.push({ pid: Number(pid), seconds: secondsOf(etimes), stopped: /T/.test(stat ?? ""), cwd: cwd ?? "", job: jobOf(args ?? "") });
      }
    } else if (line.startsWith("P\t")) {
      const [, pcpu, comm] = line.split("\t");
      top.push({ pcpu: Number(pcpu) || 0, comm: comm ?? "" });
    }
  }
  if (sample !== null) {
    sample.mem = mem;
  }
  return { sample, builds: found, hogs: top, cpu, usage };
}

const VALUE_FLAGS = new Set(["-x", "--exclude-task", "-p", "--project-dir", "-b", "--build-file", "-c", "--settings-file", "-g", "--gradle-user-home", "-I", "--init-script", "--console", "--warning-mode", "-P", "-pl", "--projects", "-f", "--file", "-s", "--settings", "-T", "--threads", "-rf", "--resume-from"]);
const TASK_VALUE_FLAGS = new Set([...VALUE_FLAGS, "--tests", "--configuration", "--dependency"]);

function testClass(pattern) {
  const clean = String(pattern).replace(/['"]/g, "");
  const named = clean.split(".").filter((part) => /^[A-Z*]/.test(part));
  return named.length > 0 ? named.join(".") : clean.split(".").pop();
}

function tasksIn(rest) {
  const words = String(rest).trim().split(/\s+/);
  const tasks = [];
  const tests = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "--tests") tests.push(testClass(words[++i] ?? ""));
    else if (w.startsWith("--tests=")) tests.push(testClass(w.slice(8)));
    else if (w.startsWith("-Dtest=")) tests.push(testClass(w.slice(7)));
    else if (VALUE_FLAGS.has(w)) i++;
    else if (w && !w.startsWith("-") && !w.includes("=")) tasks.push(w.replace(/^:/, ""));
  }
  const picked = tests.filter(Boolean);
  const filter = picked.length > 0 ? ` ${picked[0]}${picked.length > 1 ? ` +${picked.length - 1}` : ""}` : "";
  return `${tasks.slice(0, 3).join(" ")}${filter}`.trim();
}

export function jobOf(args) {
  const text = String(args).trim();
  const jvm = text.match(/(GradleWrapperMain|GradleMain|classworlds\.launcher\.Launcher)(?:\s+(.*))?$/);
  if (jvm) {
    return `${jvm[1].endsWith("Launcher") ? "maven" : "gradle"} ${tasksIn(jvm[2] ?? "")}`.trim();
  }
  const other = text.match(/(?:^|\/)(cargo|go|bazel)(?:-real)?\s+(\w+)/) ?? text.match(/(?:^|\/)(docker)\s+(?:buildx\s+)?(build)\b/);
  if (other) {
    return `${other[1]} ${other[2]}`;
  }
  const p = procProgram(text);
  const job = p.tool ? jobIn([p.tool, ...p.args]) : null;
  if (job !== null) {
    return job;
  }
  return tasksIn(text.split(/\s+/).map((w, i) => (i === 0 ? w.split("/").pop() : w)).join(" "));
}

const CONTINUOUS = new Set(["run", "bootRun", "quarkusDev", "quarkus:dev"]);

// The program a process runs, looking past the interpreter of a Node or Bun script.
export function procProgram(args) {
  const words = String(args).trim().split(/\s+/).filter(Boolean);
  const base = (w) => String(w ?? "").split("/").pop();
  let i = 0;
  if (["node", "nodejs"].includes(base(words[0])) || (base(words[0]) === "bun" && String(words[1] ?? "").includes("/"))) {
    i = 1;
    while (i < words.length && words[i].startsWith("-")) i += 1;
  }
  const raw = base(words[i]);
  const rest = words.slice(i + 1);
  const swift = raw.match(/^swift-(build|test)$/);
  if (swift) {
    return { tool: "swift", args: [swift[1], ...rest] };
  }
  const tool = raw.replace(/\.[cm]?js$/, "").replace(/^npm-cli$/, "npm").replace(/^yarn-.*$/, "yarn");
  return { tool, args: rest };
}

export function isContinuous(args) {
  const text = String(args).trim();
  if (/(?:^|\/)cargo(?:\s+\+\S+)?\s+run(?:\s|$)/.test(text)) {
    return true;
  }
  const jvm = text.match(/(GradleWrapperMain|GradleMain|classworlds\.launcher\.Launcher)(?:\s+(.*))?$/);
  if (!jvm) {
    return false;
  }
  const gradle = !jvm[1].endsWith("Launcher");
  const words = String(jvm[2] ?? "").split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (gradle && (w === "-t" || w === "--continuous")) return true;
    if (TASK_VALUE_FLAGS.has(w)) i++;
    else if (!w.startsWith("-") && (CONTINUOUS.has(w) || CONTINUOUS.has(w.split(":").pop()))) return true;
  }
  return false;
}

export function projectOf(cwd) {
  const path = String(cwd);
  const worktree = path.match(/^(.*?)\/\.claude(?:-worktrees|\/worktrees)\//);
  return shortPath(worktree ? worktree[1] : path);
}

// macOS reports a thermal pressure level instead of a temperature the thresholds can trust.
export function isPressure(s) {
  return s?.pressure !== null && s?.pressure !== undefined;
}

export function tooHot(s, limit) {
  return isPressure(s) ? s.pressure >= 1 : s?.tctl !== null && s?.tctl !== undefined && s.tctl >= limit;
}

export function shouldFreeze(s) {
  return isPressure(s) ? s.pressure >= 2 : s.tctl !== null && s.tctl >= cfg.freeze_at;
}

export function canThaw(s) {
  return isPressure(s) ? s.pressure === 0 : s.tctl === null || s.tctl < cfg.thaw_below;
}

export function heatLabel(s) {
  if (s?.tctl !== null && s?.tctl !== undefined) {
    return `${Math.round(s.tctl)}°C`;
  }
  return isPressure(s) ? L.pressureShort(L.pressure[s.pressure]) : "–";
}

export function heatColor(s) {
  if (isPressure(s)) {
    return PRESSURE_COLORS[s.pressure];
  }
  return s?.tctl !== null && s?.tctl !== undefined ? levelOf(s.tctl).color : COLOR.dim;
}

export function heatBar(s) {
  if (isPressure(s)) {
    return BARS[[1, 3, 5, 7, 7][s.pressure]];
  }
  return bar(s.tctl ?? 0);
}

function hotReason(s) {
  return isPressure(s) ? L.reasonPressure(L.pressure[s.pressure]) : L.reasonHot(heatLabel(s));
}

function thawRule() {
  return isPressure(last()) ? L.pressureNormal : L.coolerThan(cfg.thaw_below);
}

async function blocker($, now, ticket) {
  const s = last();
  if (frozen !== null) {
    return L.reasonFrozen;
  }
  if (s && tooHot(s, ticket === null ? cfg.hold_above : cfg.release_below)) {
    return hotReason(s);
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
    const at = tickets.findIndex((x) => x.id === ticket);
    return at === -1 ? L.reasonAhead(tickets.length) : L.reasonTurn(at + 1, tickets.length);
  }
  if (ticket === null && tickets.length > 0) {
    return L.reasonAhead(tickets.length);
  }
  return null;
}

async function admit($, now, mine) {
  const ticket = mine === null ? null : mine.ticket;
  const reason = await blocker($, now, ticket);
  if (reason !== null) {
    return reason;
  }
  return exclusive($, L.reasonJustStarted, async () => {
    const still = await blocker($, now, ticket);
    if (still === null) {
      await $.store.set("lastStart", now);
      if (ticket !== null) {
        await dropTickets($, (x) => x.id === ticket);
      }
    }
    return still;
  });
}

function exclusive($, busy, fn) {
  const turn = gate.then(async () => {
    let lock = null;
    try {
      const run = await $.process.run(["sh", "-c", LOCK, "heat-gate"], { timeoutMs: 8000 });
      if (run.exitCode === 1) {
        return busy;
      }
      lock = run.exitCode === 0 ? run.stdout.trim() : null;
    } catch {
      lock = null;
    }
    try {
      return await fn();
    } finally {
      if (lock) {
        try {
          await $.process.run(["rmdir", lock], { timeoutMs: 5000 });
        } catch {}
      }
    }
  });
  gate = turn.catch(() => undefined);
  return turn;
}

async function liveTickets($, now) {
  let stored = [];
  try {
    stored = await $.store.get("queue");
  } catch {
    stored = [];
  }
  const live = (Array.isArray(stored) ? stored : []).filter((x) => now - (x.seen ?? x.since) < STALE_MS);
  return live.sort((a, b) => a.since - b.since);
}

async function beat($, mine) {
  const now = await $.clock.now();
  const live = (await liveTickets($, now)).filter((x) => x.id !== mine.ticket);
  live.push({ id: mine.ticket, owner: mine.owner, since: mine.since, seen: now, label: mine.label });
  queue = live.sort((a, b) => a.since - b.since);
  await $.store.set("queue", queue);
}

async function dropTickets($, drop) {
  const live = (await liveTickets($, await $.clock.now())).filter((x) => !drop(x));
  queue = live;
  await $.store.set("queue", live);
}

async function storedFreeze($) {
  let stored = null;
  try {
    stored = await $.store.get("frozen");
  } catch {
    stored = null;
  }
  return stored && Array.isArray(stored.pids) && stored.pids.length > 0 ? stored : null;
}

async function guardFreeze($) {
  const s = last();
  if (s === null) {
    return;
  }
  frozen = await storedFreeze($);
  if (frozen !== null && (await $.clock.now()) - frozen.at >= GUARD_SECONDS * 1000) {
    await thaw($, false);
  }
  if (frozen === null && cfg.freeze_enabled && shouldFreeze(s)) {
    await freeze($, "auto");
  } else if (frozen !== null && frozen.reason === "auto" && canThaw(s)) {
    await thaw($, true);
  }
}

async function freeze($, reason) {
  let run;
  try {
    run = await $.process.run(["sh", "-c", PGREP_MINE, "heat-gate", FREEZE_PATTERN], { timeoutMs: 5000 });
  } catch {
    return;
  }
  const pids = run.stdout.split("\n").map((x) => x.trim()).filter((x) => /^\d+$/.test(x));
  if (pids.length === 0) {
    return;
  }
  await $.process.run(["kill", "-STOP", ...pids], { timeoutMs: 5000 });
  const at = await $.clock.now();
  const guard = `heat-gate-guard-${at}`;
  try {
    await $.process.run(["sh", "-c", GUARD, guard, String(GUARD_SECONDS), ...pids], { timeoutMs: 5000 });
  } catch {}
  const before = await storedFreeze($);
  frozen = { pids: [...new Set([...(before?.pids ?? []), ...pids])], reason, at, heat: heatLabel(last()), guards: [...(before?.guards ?? []), guard] };
  await $.store.set("frozen", frozen);
  $.ui.toast(L.froze(pids.length, frozen.heat), { timeoutMs: 10_000 });
  $.ui.log(L.frozeLog(pids.length, frozen.heat, thawRule()));
}

async function thaw($, announce) {
  const current = await storedFreeze($);
  if (current === null) {
    frozen = null;
    return;
  }
  try {
    await $.process.run(["kill", "-CONT", ...current.pids], { timeoutMs: 5000 });
  } catch {}
  if (Array.isArray(current.guards) && current.guards.length > 0) {
    try {
      await $.process.run(["pkill", "-f", `^sh -c sleep .* (${current.guards.join("|")}) `], { timeoutMs: 5000 });
    } catch {}
  }
  const after = await storedFreeze($);
  if (after !== null && after.at !== current.at) {
    frozen = after;
    return;
  }
  frozen = null;
  await $.store.delete("frozen");
  if (announce) {
    $.ui.toast(L.resumed(heatLabel(last())));
  }
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

const SEPARATORS = new Set([";", "&", "|", "\n", "(", ")", "<", ">", "`"]);
const KEYWORDS = new Set(["if", "then", "else", "elif", "do", "while", "until", "!", "{", "}"]);
const WRAPPERS = new Set(["sudo", "env", "nice", "nohup", "timeout", "time", "exec", "command", "ionice", "stdbuf", "caffeinate"]);
const WRAPPER_VALUES = new Set(["-n", "-s", "-k", "-u", "-g", "-c", "-C", "-t", "-a", "--signal", "--kill-after", "--adjustment", "--unset", "--chdir", "--user"]);
const JVM_TOOLS = new Set(["gradlew", "gradle", "mvnw", "mvn"]);
const HEAVY_TASK = /^(?:build|test|check|integrationTest|assemble|install|verify|package|bootRun|run|compile\w*|jacoco\w*|codenarc\w*|e2e\w*)$/;
const JS_PACKAGERS = ["npm", "pnpm", "yarn", "bun"];
const JS_RUNNERS = new Set(["npx", "pnpx", "bunx"]);
const JS_TOOLS = new Set(["tsc", "next", "vite"]);
const MAKE_VALUES = new Set(["-C", "-f", "-I", "-o", "-W", "--directory", "--file", "--makefile", "--include-dir", "--old-file", "--assume-old", "--new-file", "--assume-new", "--what-if"]);
const MAKE_LIGHT_FLAGS = new Set(["-n", "--dry-run", "--just-print", "--recon", "-q", "--question", "-p", "--print-data-base", "-v", "--version", "-h", "--help"]);
const MAKE_LIGHT_TARGETS = new Set(["clean", "distclean", "mrproper", "clobber", "help"]);
const NINJA_LIGHT = new Set(["--version", "-n", "-h", "--help"]);
const TSC_LIGHT = new Set(["-v", "--version", "-h", "--help", "--all", "--init", "--showConfig", "--listFilesOnly"]);
const XCODE_ACTIONS = new Set(["build", "build-for-testing", "analyze", "archive", "test", "test-without-building", "docbuild", "installsrc", "install", "clean"]);
const XCODE_LIGHT = /^-(?:list|version|showsdks|showBuildSettings|showdestinations|showTestPlans|help|usage|license|checkFirstLaunchStatus|runFirstLaunch|showComponent|find-\w+)$/;
const COMPOSE_COMMANDS = new Set(["attach", "build", "config", "cp", "create", "down", "events", "exec", "images", "kill", "logs", "ls", "pause", "port", "ps", "pull", "push", "restart", "rm", "run", "scale", "start", "stats", "stop", "top", "unpause", "up", "version", "wait", "watch"]);

function makeJob(tool, args) {
  const targets = [];
  for (let i = 0; i < args.length; i++) {
    const w = args[i];
    if (MAKE_LIGHT_FLAGS.has(w)) return null;
    if (MAKE_VALUES.has(w)) i++;
    else if ((w === "-j" || w === "-l") && /^\d+(?:\.\d+)?$/.test(args[i + 1] ?? "")) i++;
    else if (!w.startsWith("-") && !w.includes("=")) targets.push(w);
  }
  if (targets.length > 0 && targets.every((t) => MAKE_LIGHT_TARGETS.has(t))) return null;
  return `${tool} ${targets.slice(0, 3).join(" ")}`.trim();
}

function xcodeJob(args) {
  if (args.some((w) => XCODE_LIGHT.test(w))) return null;
  const actions = args.filter((w) => XCODE_ACTIONS.has(w));
  if (actions.length > 0 && actions.every((a) => a === "clean")) return null;
  const action = actions.find((a) => a !== "clean");
  return action ? `xcodebuild ${action}` : "xcodebuild";
}

function segmentsOf(command) {
  const text = String(command);
  const segments = [];
  let words = [];
  let word = "";
  let open = false;
  let quote = null;
  const endWord = () => {
    if (open) words.push(word);
    word = "";
    open = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length > 0) segments.push(words);
    words = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote !== null) {
      if (ch === quote) quote = null;
      else if (ch === "\\" && quote === '"' && i + 1 < text.length) word += text[++i];
      else word += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      open = true;
    } else if (ch === "\\") {
      i += 1;
      if (i < text.length && text[i] !== "\n") {
        word += text[i];
        open = true;
      }
    } else if (SEPARATORS.has(ch)) {
      if ((ch === "<" || ch === ">") && /^\d+$/.test(word)) open = false;
      endSegment();
    } else if (/\s/.test(ch)) {
      endWord();
    } else {
      word += ch;
      open = true;
    }
  }
  endSegment();
  return segments;
}

function programOf(words) {
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (KEYWORDS.has(w) || /^[A-Za-z_]\w*=/.test(w)) {
      i += 1;
    } else if (WRAPPERS.has(w)) {
      i += 1;
      while (i < words.length && words[i].startsWith("-")) i += WRAPPER_VALUES.has(words[i]) ? 2 : 1;
      if (w === "timeout") i += 1;
    } else {
      return { tool: w.split("/").pop(), args: words.slice(i + 1) };
    }
  }
  return null;
}

function jobIn(words) {
  const found = programOf(words);
  if (found === null) {
    return null;
  }
  const { tool, args } = found;
  if (JVM_TOOLS.has(tool)) {
    const tasks = [];
    for (let i = 0; i < args.length; i++) {
      if (TASK_VALUE_FLAGS.has(args[i])) i++;
      else if (!args[i].startsWith("-") && !args[i].includes("=")) tasks.push(args[i]);
    }
    return tasks.some((t) => t.split(/[:-]/).some((part) => HEAVY_TASK.test(part))) ? `${tool} ${tasks.slice(0, 3).join(" ")}` : null;
  }
  const subs = args.filter((w) => !w.startsWith("-") && !w.startsWith("+"));
  const [first, second] = subs;
  if (JS_RUNNERS.has(tool) || (JS_PACKAGERS.includes(tool) && ["exec", "dlx", "x"].includes(args[0]))) {
    const rest = JS_RUNNERS.has(tool) ? args : args.slice(1);
    let k = 0;
    while (k < rest.length && rest[k].startsWith("-")) k += rest[k] === "-p" || rest[k] === "--package" ? 2 : 1;
    return k < rest.length ? jobIn(rest.slice(k)) : null;
  }
  if (tool === "cargo" && ["build", "test", "bench", "run"].includes(first)) return `cargo ${first}`;
  if (tool === "go" && ["build", "test"].includes(first)) return `go ${first}`;
  if (JS_PACKAGERS.includes(tool)) {
    if (tool !== "npm" && JS_TOOLS.has(first)) return jobIn(args.slice(args.indexOf(first)));
    const script = first === "run" || first === "run-script" ? second : first;
    return /^(?:build|test|e2e)\b/.test(script ?? "") ? `${tool} ${script === first ? "" : `${first} `}${script}` : null;
  }
  if (tool === "docker" && first === "build") return "docker build";
  if (tool === "docker" && first === "buildx" && second === "build") return "docker buildx build";
  if ((tool === "docker" && first === "compose") || tool === "docker-compose") {
    const action = subs.slice(tool === "docker" ? 1 : 0).find((w) => COMPOSE_COMMANDS.has(w));
    return action === "up" || action === "build" ? `docker compose ${action}` : null;
  }
  if (["bazel", "bazelisk"].includes(tool) && ["build", "test"].includes(first)) return `bazel ${first}`;
  if (tool === "make" || tool === "gmake") return makeJob(tool, args);
  if (tool === "ninja") return args.some((w) => NINJA_LIGHT.has(w) || w.startsWith("-t")) ? null : "ninja";
  if (tool === "cmake") return args.includes("--build") ? "cmake --build" : null;
  if (tool === "xcodebuild") return xcodeJob(args);
  if (tool === "swift" && ["build", "test"].includes(first)) return `swift ${first}`;
  if (tool === "tsc") return args.some((w) => TSC_LIGHT.has(w)) ? null : "tsc";
  if ((tool === "next" || tool === "vite") && first === "build") return `${tool} build`;
  return null;
}

export function labelOf(command) {
  for (const words of segmentsOf(command)) {
    const job = jobIn(words);
    if (job !== null) {
      return job;
    }
  }
  return command.slice(0, 40);
}

function shortPath(path) {
  return String(path).split("/").filter(Boolean).pop() ?? path;
}

function ago(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}m${String(seconds % 60).padStart(2, "0")}s` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
}

const WIDE_CHARS = /\p{Extended_Pictographic}/u;
const BLOCK_CHARS = /[▀-◿]/;

export function cellsOf(text, desktop) {
  let narrow = 0;
  let fixed = 0;
  for (const ch of String(text)) {
    if (WIDE_CHARS.test(ch)) fixed += 2;
    else if (BLOCK_CHARS.test(ch)) fixed += 1;
    else narrow += 1;
  }
  return Math.ceil(fixed + narrow * (desktop ? 0.88 : 1));
}

const WIDE_GAP = "  │  ";
const NARROW_GAP = " │ ";
const widthOf = (segment, desktop) => cellsOf(segment.parts.map((p) => p.text).join(""), desktop);
const rowWidth = (row, desktop, gap) => row.reduce((n, seg) => n + widthOf(seg, desktop), 0) + (row.length - 1) * cellsOf(gap, desktop);

export function packRows(segments, avail, desktop, gap = NARROW_GAP) {
  const rows = [];
  for (const seg of segments) {
    const row = rows[rows.length - 1];
    if (row && rowWidth([...row, seg], desktop, gap) <= avail) row.push(seg);
    else rows.push([seg]);
  }
  return rows;
}

export function metricSegments(s, history, docker, tier) {
  const sparkSize = { full: 16, medium: 8, lean: 0 }[tier];
  const segments = [];
  const temp = [{ key: "temp", color: heatColor(s), bold: true, text: `● ${heatLabel(s)}` }];
  if (sparkSize) {
    temp.push({ key: "temp-gap", text: " " }, ...history.slice(-sparkSize).map((x, i) => ({ key: `sp${i}`, color: heatColor(x), text: heatBar(x) })));
  }
  segments.push({ key: "temp", parts: temp });
  if (s.cpu !== null && s.cpu !== undefined) {
    const cpu = [
      { key: "cpu-l", dimColor: true, text: "CPU " },
      { key: "cpu", color: usageColor(s.cpu), bold: true, text: `${Math.round(s.cpu)}%` },
    ];
    if (sparkSize) {
      const seen = history.slice(-sparkSize).filter((x) => x.cpu !== null && x.cpu !== undefined);
      if (seen.length > 0) cpu.push({ key: "cpu-gap", text: " " }, ...seen.map((x, i) => ({ key: `cs${i}`, color: usageColor(x.cpu), text: pctBar(x.cpu) })));
    }
    segments.push({ key: "cpu", parts: cpu });
  }
  const mp = memPercent(s.mem);
  if (mp !== null) {
    const ram = [
      { key: "ram-l", dimColor: true, text: "RAM " },
      { key: "ram", color: usageColor(mp), bold: true, text: `${gb(s.mem.used)}/${gb(s.mem.total)}G` },
    ];
    if (tier !== "lean") ram.push({ key: "ram-m", color: usageColor(mp), text: ` ${meter(mp, tier === "full" ? 8 : 5)}` });
    segments.push({ key: "ram", parts: ram });
  }
  if (docker !== null && docker !== undefined) {
    const total = docker.reduce((sum, c) => sum + c.mem, 0);
    const extra = tier === "full" && docker.length > 0 ? ` · ${human(total)}` : "";
    segments.push({ key: "docker", parts: [{ key: "dk", color: docker.length > 0 ? COLOR.cool : COLOR.dim, text: `🐳 ${docker.length}${extra}` }] });
  }
  const load = [{ key: "load", dimColor: true, text: `${L.load} ${s.load.toFixed(1)}/${s.ncpu}` }];
  if (s.boost !== null && s.boost !== undefined && (tier !== "lean" || s.boost)) {
    load.push({ key: "boost", color: s.boost ? COLOR.warm : COLOR.dim, text: ` · ${s.boost ? L.turboOn : L.turboOff}` });
  }
  segments.push({ key: "load", parts: load });
  return segments;
}

export function bandPlan(s, history, docker, columns, desktop) {
  const avail = Math.max(10, columns - 4);
  for (const tier of ["full", "medium", "lean"]) {
    const segments = metricSegments(s, history, docker, tier);
    const gap = tier === "full" ? WIDE_GAP : NARROW_GAP;
    if (rowWidth(segments, desktop, gap) <= avail) return { tier, avail, gap, rows: [segments] };
  }
  const medium = packRows(metricSegments(s, history, docker, "medium"), avail, desktop);
  if (medium.length <= 2) return { tier: "stacked", avail, gap: NARROW_GAP, rows: medium };
  return { tier: "compact", avail, gap: NARROW_GAP, rows: packRows(metricSegments(s, history, docker, "lean"), avail, desktop) };
}

function clipCells(text, max, desktop) {
  if (cellsOf(text, desktop) <= max) return text;
  const chars = [...text];
  while (chars.length > 1 && cellsOf(chars.join("") + "…", desktop) > max) chars.pop();
  return chars.join("") + "…";
}

function activitySegments(avail, desktop) {
  const segments = [];
  const running = builds.filter((b) => !b.stopped);
  if (running.length > 0) {
    const first = running[0];
    const time = ` · ${ago(first.seconds)}`;
    const arrow = first.job ? " › " : "";
    const head = clipCells(`⚙ ${L.builds(running.length)}${projectOf(first.cwd)}`, avail - cellsOf(time, desktop), desktop);
    const job = clipCells(first.job, avail - cellsOf(head + arrow + time, desktop), desktop);
    const parts = [{ key: "builds", color: COLOR.accent, bold: true, text: head }];
    if (arrow && cellsOf(job, desktop) > 1) parts.push({ key: "builds-a", dimColor: true, text: arrow }, { key: "builds-j", color: COLOR.accent, text: job });
    parts.push({ key: "builds-t", dimColor: true, text: time });
    segments.push({ key: "builds", parts });
  }
  if (queue.length > 0) {
    segments.push({ key: "queue", parts: [{ key: "queue", color: COLOR.warm, text: `⏸ ${L.queued(queue.length)}` }] });
  }
  if (frozen !== null) {
    segments.push({ key: "frozen", parts: [{ key: "frozen", color: COLOR.cool, bold: true, text: `❄ ${L.frozenBadge}` }] });
  }
  return segments;
}

function drawRow(t, row, key, gap) {
  const { Box, Text } = t;
  const children = [];
  row.forEach((seg, i) => {
    if (i > 0) children.push(Text({ key: `sep-${seg.key}`, dimColor: true, children: gap }));
    children.push(Box({ key: seg.key, flexDirection: "row", flexShrink: 0, children: seg.parts.map(({ key: k, text, ...style }) => Text({ key: k, ...style, children: text })) }));
  });
  return Box({ key, flexDirection: "row", children });
}

function band(t, columns, surface) {
  const desktop = surface === "desktop";
  const plan = bandPlan(last(), samples, containers, columns, desktop);
  const rows = plan.rows.map((row, i) => drawRow(t, row, `metrics-${i}`, plan.gap));
  packRows(activitySegments(plan.avail, desktop), plan.avail, desktop, WIDE_GAP).forEach((row, i) => rows.push(drawRow(t, row, `activity-${i}`, WIDE_GAP)));
  return t.Box({ key: "heat-band", flexDirection: "column", paddingX: 1, children: rows });
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
      Text({ key: "h-rule", dimColor: true, children: L.heldRule(isPressure(last()) ? L.pressureNormal : L.coolerThan(cfg.release_below), cfg.max_wait_minutes) }),
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
  const word = isPressure(s) ? (s.tctl !== null ? `  ${L.pressureShort(L.pressure[s.pressure])}` : "") : `  ${levelOf(s.tctl).word}`;
  const temps = samples.some((x) => x.tctl !== null && x.tctl !== undefined);
  const rows = [];
  rows.push(
    Box({
      key: "head",
      flexDirection: "row",
      gap: 2,
      children: [
        Text({ key: "big", bold: true, color: heatColor(s), children: `● ${heatLabel(s)}${word}` }),
        Text({ key: "crit", dimColor: true, children: s.crit !== null ? L.critical(Math.round(s.crit), s.load.toFixed(1), s.ncpu) : L.criticalMac(s.load.toFixed(1), s.ncpu) }),
      ],
    }),
  );
  rows.push(stats(t, s));
  if (where === "desktop" && t.Svg) {
    rows.push(temps ? chartSvg(t, s.crit) : null, usageSvg(t));
  } else {
    const width = Math.max(20, Math.min(HISTORY, columns - 8));
    rows.push(temps ? chartText(t, width) : null, usageText(t, width));
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
          Text({ bold: true, children: projectOf(b.cwd) }),
          Text({ dimColor: true, children: b.job ? " › " : "" }),
          Text({ children: b.job }),
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
      : Button({ key: "thaw", label: L.thaw, hotkey: "r", plain: true, onPress: () => thaw($, true) }),
  ];
  if (s.boost === true) {
    buttons.push(Button({ key: "copy", label: L.copyTurbo, hotkey: "t", plain: true, onPress: () => $.ui.copy(turboCommand(s.boostPath)) }));
  }
  rows.push(Box({ key: "actions", marginTop: 1, gap: 3, children: buttons }));
  rows.push(Text({ key: "rules", dimColor: true, children: isPressure(s) ? L.rulesMac(cfg) : L.rules(cfg) }));

  return Box({ flexDirection: "column", paddingX: 1, children: rows.filter(Boolean) });
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
      const filled = (((s.tctl ?? 40) - 40) / 70) * height - row;
      const ch = filled >= 1 ? "█" : filled > 0 ? BARS[Math.max(0, Math.min(7, Math.floor(filled * 8)))] : " ";
      return Text({ key: `c${row}-${i}`, color: heatColor(s), children: ch });
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
  const data = samples.slice(-HISTORY).filter((s) => s.tctl !== null && s.tctl !== undefined);
  const y = (temp) => H - 18 - ((Math.max(40, Math.min(115, temp)) - 40) / 75) * (H - 30);
  const x = (i) => 36 + (i / Math.max(1, HISTORY - 1)) * (W - 44);
  const pts = data.map((s, i) => `${x(i + HISTORY - data.length).toFixed(1)},${y(s.tctl).toFixed(1)}`).join(" ");
  const first = x(HISTORY - data.length).toFixed(1);
  const lastX = x(HISTORY - 1).toFixed(1);
  const guide = (temp, color, label) =>
    `<line x1="36" x2="${W - 8}" y1="${y(temp)}" y2="${y(temp)}" stroke="${color}" stroke-dasharray="4 4" stroke-width="1" opacity="0.7"/><text x="4" y="${y(temp) + 4}" font-size="10" fill="${color}" font-family="sans-serif">${label}</text>`;
  const guides = isPressure(last()) ? "" : [guide(crit, COLOR.fire, `${Math.round(crit)}°`), cfg.freeze_enabled ? guide(cfg.freeze_at, COLOR.hot, `${cfg.freeze_at}°`) : "", guide(cfg.hold_above, COLOR.warm, `${cfg.hold_above}°`)].join("");
  const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${COLOR.fire}" stop-opacity="0.55"/><stop offset="45%" stop-color="${COLOR.warm}" stop-opacity="0.35"/><stop offset="100%" stop-color="${COLOR.cool}" stop-opacity="0.08"/></linearGradient></defs>
${guides}
${data.length > 1 ? `<polygon points="${first},${H - 18} ${pts} ${lastX},${H - 18}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="${heatColor(last())}" stroke-width="2.2" stroke-linejoin="round"/>` : ""}
<text x="${W - 8}" y="${H - 4}" font-size="10" text-anchor="end" fill="${COLOR.dim}" font-family="sans-serif">${L.lastMinutes(Math.round((HISTORY * TICK_MS) / 60000))}</text>
</svg>`;
  return t.Svg({ source, alt: L.chartAlt(Math.round(last().tctl ?? 0)), width: W, height: H });
}
