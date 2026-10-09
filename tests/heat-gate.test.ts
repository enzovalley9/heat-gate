import { expect, mock, test } from 'claude-code/testing'
import { BUILD_PATTERN, FREEZE_PATTERN, bandPlan, bytesOf, canThaw, cellsOf, configure, cpuPercent, heatLabel, isContinuous, isHeavy, labelOf, levelOf, meter, jobOf, parseDocker, parseSense, pressureOf, projectOf, secondsOf, shouldFreeze, tooHot, turboCommand } from '../hooks/heat-gate.mjs'

const sense = (tctl: number, builds = '') =>
  `S ${tctl * 1000} ${tctl * 1000} 105000 1 7.40 16 /sys/devices/system/cpu/cpufreq/boost\n${builds}P\t227\tjava\nP\t96\tnode\n`

test('spots heavy builds and lets everything else through', () => {
  configure({})
  for (const c of [
    './gradlew clean check integrationTest --continue',
    'cd app && ./gradlew --no-daemon -q compileJava',
    './gradlew codenarcMain',
    './gradlew e2eTest',
    'mvn -q verify',
    'cargo build --release',
    'go test ./...',
    'pnpm run build',
    'npm test',
    'docker build -t app .',
    'docker compose -f a.yml up -d',
    'bazel test //...',
  ]) expect(isHeavy(c)).toBe(true)
  for (const c of ['grep -n "test" build.gradle', './gradlew --version', 'docker compose ps', 'git status', 'npm install', 'go vet ./...']) expect(isHeavy(c)).toBe(false)
  configure({ extra_build_pattern: '\\bmake\\s+-j' })
  expect(isHeavy('make -j8')).toBe(true)
  configure({})
})

test('a heavy command is the program of a segment, never a word inside another command', () => {
  configure({})
  for (const c of [
    '/abs/repo/gradlew build',
    '../gradlew build',
    '"./gradlew" test',
    'FOO=1 timeout 600 ./gradlew test',
    'env JAVA_HOME=/opt/jdk nice -n 5 ./gradlew check',
    '(cd api && ./gradlew :api:test --tests com.acme.OrderTest)',
    'cd api; ./gradlew test 2>&1 | tail -50',
    './gradlew \\\n  build',
    './mvnw spring-boot:run',
    'mvn failsafe:integration-test',
    'docker-compose up -d',
    'docker buildx build .',
  ]) expect(isHeavy(c), c).toBe(true)
  for (const c of [
    'git commit -m "fix go test flakiness"',
    'git add gradle/build-logic/x.kts',
    './gradlew dependencies --configuration compileClasspath',
    './gradlew clean -x test',
    './gradlew dependencies > test',
    'echo "./gradlew build"',
    'ps aux | grep GradleDaemon',
    'pkill -f GradleDaemon',
    'command -v gradle',
  ]) expect(isHeavy(c), c).toBe(false)
  expect(labelOf('cd api; ./gradlew test 2>&1 | tail -50')).toBe('gradlew test')
  expect(labelOf('FOO=1 timeout 600 "./gradlew" -p app check')).toBe('gradlew check')
})

test('a dev server or a continuous build is not a running build', () => {
  const wrapper = 'java -cp /x/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain'
  const maven = 'java -cp /x/plexus-classworlds.jar org.codehaus.plexus.classworlds.launcher.Launcher'
  for (const args of [`${wrapper} bootRun`, `${wrapper} :app:run`, `${wrapper} quarkusDev`, `${wrapper} -t test`, `${wrapper} --continuous build`, `${maven} spring-boot:run`, `${maven} quarkus:dev`, '/home/u/.cargo/bin/cargo run --bin api']) {
    expect(isContinuous(args), args).toBe(true)
  }
  for (const args of [`${wrapper} build`, `${wrapper} test --tests RunnerTest`, `${maven} -t toolchains.xml verify`, '/home/u/.cargo/bin/cargo build']) {
    expect(isContinuous(args), args).toBe(false)
  }
  const out = parseSense(sense(60, `B\t1\t900\tSl\t/p/api\t${wrapper} bootRun\nB\t2\t30\tSl\t/p/web\t${wrapper} build\nB\t3\t600\tSl\t/p/rs\t/u/cargo run\n`))
  expect(out.builds.map((b: any) => b.pid)).toEqual([2])
})

test('the process patterns match the executable, never a shell that mentions it', () => {
  const build = new RegExp(BUILD_PATTERN)
  const freeze = new RegExp(FREEZE_PATTERN)
  expect(build.test('/usr/lib/jvm/bin/java -Xmx64m -classpath /x/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain build')).toBe(true)
  expect(build.test('java -classpath /x/plexus-classworlds.jar org.codehaus.plexus.classworlds.launcher.Launcher verify')).toBe(true)
  expect(build.test('/home/u/.rustup/toolchains/stable/bin/cargo build --release')).toBe(true)
  expect(build.test('/usr/local/go/bin/go test ./...')).toBe(true)
  for (const line of ['/bin/bash -c git commit -m "fix go test flake"', 'vim org.gradle.wrapper.GradleWrapperMain', `bash -c ... heat-gate ${BUILD_PATTERN}`]) {
    expect(build.test(line), line).toBe(false)
  }
  expect(freeze.test('/opt/jdk/bin/java --add-opens=a -cp /x/gradle-launcher.jar org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.12')).toBe(true)
  expect(freeze.test("/opt/jdk/bin/java -cp /x/w.jar worker.org.gradle.process.internal.worker.GradleWorkerMain 'Gradle Test Executor 3'")).toBe(true)
  expect(freeze.test('/home/u/.rustup/toolchains/stable/bin/rustc --crate-name api src/lib.rs')).toBe(true)
  for (const line of ['/usr/bin/zsh -c ps aux | grep GradleDaemon', 'pkill -f GradleDaemon', 'tail -f /tmp/GradleWorkerMain.log', `sh -c exec pgrep -u "$(id -u)" -f "$1" heat-gate ${FREEZE_PATTERN}`]) {
    expect(freeze.test(line), line).toBe(false)
  }
})

test('labels a build with its tool and tasks', () => {
  expect(labelOf('cd a && ./gradlew clean check integrationTest --continue')).toBe('gradlew clean check integrationTest')
  expect(labelOf('cargo test --all')).toBe('cargo test')
  expect(labelOf('docker compose -f x.yml up -d')).toBe('docker compose up')
  expect(jobOf('/usr/lib/jvm/bin/java -cp x org.gradle.wrapper.GradleWrapperMain clean build --continue')).toBe('gradle clean build')
  expect(jobOf('/home/u/.cargo/bin/cargo build --release')).toBe('cargo build')
})

test('a running build reads as project › tool and tasks, without JVM noise', () => {
  const wrapper = 'java -Xmx64m -Dorg.gradle.appname=gradlew -classpath /x/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain'
  expect(jobOf(`${wrapper} test --tests com.acme.billing.InvoiceServiceTest -x integrationTest`)).toBe('gradle test InvoiceServiceTest')
  expect(jobOf(`${wrapper} :api:test --tests 'com.acme.*OrderTest.refunds' --tests com.acme.CartTest`)).toBe('gradle api:test *OrderTest +1')
  expect(jobOf(`${wrapper} --no-daemon -q clean build`)).toBe('gradle clean build')
  expect(jobOf(`${wrapper}`)).toBe('gradle')
  expect(jobOf('java -classpath /x/plexus-classworlds.jar org.codehaus.plexus.classworlds.launcher.Launcher -pl api clean verify -Dtest=OrderTest')).toBe('maven clean verify OrderTest')
  expect(jobOf('/usr/bin/docker buildx build -t app .')).toBe('docker build')
  expect(projectOf('/home/u/code/payments-api')).toBe('payments-api')
  expect(projectOf('/home/u/code/payments-api/.claude-worktrees/fix-retry')).toBe('payments-api')
  expect(projectOf('/home/u/code/payments-api/.claude/worktrees/fix-retry')).toBe('payments-api')
})

test('reads sensors, builds and processes', () => {
  const r = parseSense(sense(72, 'B\t123\t95\tSl\t/home/u/code/api\tjava org.gradle.wrapper.GradleWrapperMain clean check\n'))
  expect(r.sample).toMatchObject({ tctl: 72, crit: 105, boost: true, load: 7.4, ncpu: 16 })
  expect(r.builds).toEqual([{ pid: 123, seconds: 95, stopped: false, cwd: '/home/u/code/api', job: 'gradle clean check' }])
  expect(r.hogs[0]).toEqual({ pcpu: 227, comm: 'java' })
  expect(levelOf(72).word).toBe('Warm')
  expect(levelOf(99).word).toBe('Danger')
  expect(turboCommand('/sys/devices/system/cpu/intel_pstate/no_turbo')).toBe('echo 1 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo')
  configure({ language: 'es' })
  expect(levelOf(72).word).toBe('Templado')
  configure({})
})

test('reads CPU, memory and containers', () => {
  const out = parseSense('S 50000 50000 105000 0 1.0 16 x\nC 1000 3000\nM 32000000 12000000 8000000 6000000\n')
  expect(out.cpu).toEqual({ busy: 1000, idle: 3000 })
  expect(out.sample.mem).toEqual({ used: 20000000 * 1024, total: 32000000 * 1024, swapUsed: 2000000 * 1024, swapTotal: 8000000 * 1024 })
  expect(cpuPercent({ busy: 1000, idle: 3000 }, { busy: 1400, idle: 3600 })).toBe(40)
  expect(cpuPercent({ busy: 1, idle: 1 }, { busy: 1, idle: 1 })).toBe(null)
  expect(bytesOf('1.5GiB')).toBe(1.5 * 1024 ** 3)
  expect(bytesOf('300kB')).toBe(300_000)
  expect(parseDocker('a|1.0%|10MiB / 1GiB\nb|80.2%|2GiB / 30GiB\n').map((c: any) => c.name)).toEqual(['b', 'a'])
  expect(parseDocker('')).toEqual([])
  expect(meter(50, 6)).toBe('▰▰▰▱▱▱')
})

test('reads a Mac: thermal pressure, degrees when macmon is there, BSD elapsed times', () => {
  const out = parseSense('D x 2 3.20 10\nU 35.5\nM 16777216 6291456 2097152 1048576\nB\t812\t01:02:03\tS\t/Users/alex/payments-api\tjava -cp gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain test\nP\t180.2\tjava\n')
  expect(out.sample).toMatchObject({ tctl: null, crit: null, boost: null, pressure: 2, load: 3.2, ncpu: 10 })
  expect(out.usage).toBe(35.5)
  expect(out.sample.mem.total).toBe(16 * 1024 ** 3)
  expect(out.builds[0]).toMatchObject({ pid: 812, seconds: 3723, cwd: '/Users/alex/payments-api', job: 'gradle test' })
  expect(parseSense('D 64.5 0 1.0 8\n').sample).toMatchObject({ tctl: 64.5, pressure: 0 })
  expect(secondsOf('2-03:04:05')).toBe(2 * 86400 + 3 * 3600 + 4 * 60 + 5)
  expect(secondsOf('04:05')).toBe(245)
  expect(secondsOf('97')).toBe(97)
  expect([pressureOf('0'), pressureOf('3'), pressureOf('30'), pressureOf('x'), pressureOf(undefined)]).toEqual([0, 3, 2, null, null])
})

test('on a Mac the thermal pressure decides, not the degrees', () => {
  configure({ language: 'es' })
  const mac = (pressure: number, tctl: number | null = null) => ({ tctl, pressure, crit: null })
  expect(tooHot(mac(0, 95), 80)).toBe(false)
  expect(tooHot(mac(1), 80)).toBe(true)
  expect(shouldFreeze(mac(1))).toBe(false)
  expect(shouldFreeze(mac(2))).toBe(true)
  expect(canThaw(mac(1))).toBe(false)
  expect(canThaw(mac(0))).toBe(true)
  expect(heatLabel(mac(2))).toBe('presión alta')
  expect(heatLabel(mac(0, 64.4))).toBe('64°C')
  expect(tooHot({ tctl: 85, crit: 105 }, 80)).toBe(true)
  configure({})
})

type State = {
  tctl: number
  builds: string
  saved: Map<string, unknown>
  ran: string[]
  docker?: number
  sensed?: number
  pressure?: number
  calls?: string[][]
  writes?: [string, unknown][]
  pgrep?: string
  lockBusy?: boolean
  abort?: boolean
  onCont?: () => void
}

function stubs(on: any, state: State) {
  const clock = mock.clock(on, { now: 1_000_000 })
  let busy = 1000
  on('process.run', async ($: any, e: any) => {
    state.calls?.push([...e.argv])
    const script = String(e.argv[2] ?? '')
    if (e.argv[0] === 'sh' && script.includes('admit.lock')) {
      return { value: { exitCode: state.lockBusy ? 1 : 0, stdout: state.lockBusy ? '' : '/data/heat-gate/admit.lock\n', stderr: '' } }
    }
    if (e.argv[0] === 'sh' && script.includes('pgrep')) {
      return { value: { exitCode: 0, stdout: state.pgrep ?? '', stderr: '' } }
    }
    if (e.argv[0] === 'kill' && e.argv[1] === '-CONT') state.onCont?.()
    if (e.argv[0] === 'bash') {
      state.sensed = (state.sensed ?? 0) + 1
      busy += 400
      if (state.pressure !== undefined) {
        return { value: { exitCode: 0, stdout: `D x ${state.pressure} 3.20 10\nU 35.0\nM 16777216 6291456 2097152 1048576\n${state.builds}P\t180\tjava\n`, stderr: '' } }
      }
      return { value: { exitCode: 0, stdout: `${sense(state.tctl, state.builds)}C ${busy} ${busy + 600}\nM 32000000 12000000 8000000 6000000\n`, stderr: '' } }
    }
    if (e.argv[0] === 'docker') {
      state.docker = (state.docker ?? 0) + 1
      return { value: { exitCode: 0, stdout: 'postgres|12.5%|512MiB / 30GiB\nrabbitmq|3.1%|1.5GiB / 30GiB\n', stderr: '' } }
    }
    if (e.argv[0] === 'sleep') {
      await clock.sleep(Number(e.argv[1]) * 1000)
      if (state.abort) throw new Error('the dispatch was aborted')
    }
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })
  on('store.get', ($: any, e: any) => ({ value: state.saved.get(e.key) }))
  on('store.set', ($: any, e: any) => {
    state.writes?.push([e.key, e.value])
    state.saved.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', ($: any, e: any) => {
    state.saved.delete(e.key)
    return { value: undefined }
  })
  for (const name of ['ui.open', 'ui.status', 'ui.toast', 'ui.log']) on(name, () => ({ value: undefined }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  on('tool.call', ($: any, e: any) => {
    state.ran.push(e.command)
    return { result: 'ok' }
  })
  return clock
}

const BAND = { plugin: 'heat-gate', component: 'AbovePrompt', surface: 'terminal', requestId: 'band', viewport: { columns: 120, rows: 40 }, props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 110, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as any

async function waitFor(clock: any, ui: any, text: RegExp) {
  for (let i = 0; i < 50; i += 1) {
    const found = await ui.find({ type: 'Text', text })
    if (found) return found
    await clock.settle()
  }
  return undefined
}

test('a cool, idle machine runs the build at once', async ($, on) => {
  const state = { tctl: 62, builds: '', saved: new Map(), ran: [] as string[] }
  stubs(on, state)
  expect(await $.tool.call({ tool: 'Bash', command: './gradlew build' })).toEqual({ result: 'ok' })
  expect(state.ran).toEqual(['./gradlew build'])
  expect(state.saved.get('lastStart')).toBe(1_000_000)
})

test('a hot CPU holds the build and "Run now" lets it go', async ($, on) => {
  const state = { tctl: 91, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew clean check' })
  const ui = await $.ui.mount(BAND)
  expect(await waitFor(clock, ui, /Build queued/)).toBeDefined()
  expect(state.ran).toEqual([])
  await ui.press({ key: 'force' })
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
  expect(state.saved.get('queue')).toEqual([])
})

test('the queued build starts by itself once the CPU cools down', async ($, on) => {
  const state = { tctl: 85, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: 'cargo build' })
  await clock.settle()
  expect(state.ran).toEqual([])
  state.tctl = 70
  await clock.advance(3000)
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
})

test('on a Mac a moderate pressure holds the build until it is back to normal', async ($, on) => {
  const state = { tctl: 0, builds: '', saved: new Map(), ran: [] as string[], pressure: 1 }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew test' })
  await clock.settle()
  expect(state.ran).toEqual([])
  state.pressure = 0
  await clock.advance(3000)
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
})

test('on a Mac the band and the pane show the pressure, never a made-up temperature', { options: { language: 'es' } }, async ($, on) => {
  const state = { tctl: 0, builds: '', saved: new Map(), ran: [] as string[], pressure: 2 }
  const clock = stubs(on, state)
  startStubs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    await $.session.start({ surface, isInteractive: true, cwd: '/work' } as any)
    await clock.advance(9000)
    const band = await $.ui.mount({ ...BAND, surface })
    expect(await band.find({ type: 'Text', text: /presión alta/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /°C/ })).toBeUndefined()
    const pane = await $.ui.mount({ plugin: 'heat-gate', component: 'Pane', surface, requestId: 'heat-gate', viewport: { columns: 160, rows: 50 }, props: { title: 'heat-gate', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } } as any)
    expect(await pane.find({ type: 'Text', text: /presión térmica de macOS · carga 3.2\/10/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /mientras la presión térmica de macOS no sea normal/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /°C/ })).toBeUndefined()
  }
})

test('another running build makes it wait and "Cancel" refuses it', async ($, on) => {
  const state = { tctl: 65, builds: 'B\t9\t30\tSl\t/p/api\tjava org.gradle.wrapper.GradleWrapperMain build\n', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew test' })
  const ui = await $.ui.mount(BAND)
  expect(await waitFor(clock, ui, /another build running/)).toBeDefined()
  await ui.press({ key: 'cancel' })
  await clock.advance(3000)
  const r: any = await pending
  expect(r.deny).toMatch(/cancelled/)
  expect(state.ran).toEqual([])
})

const PANE = { plugin: 'heat-gate', component: 'Pane', surface: 'terminal', requestId: 'heat-gate', viewport: { columns: 160, rows: 50 }, props: { title: 'heat-gate', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } } as any

test('a dev server that is running does not hold the next build', async ($, on) => {
  const state = { tctl: 62, builds: 'B\t9\t900\tSl\t/p/api\tjava -cp x org.gradle.wrapper.GradleWrapperMain bootRun\n', saved: new Map(), ran: [] as string[] }
  stubs(on, state)
  expect(await $.tool.call({ tool: 'Bash', command: './gradlew build' })).toEqual({ result: 'ok' })
  expect(state.ran).toEqual(['./gradlew build'])
})

test('at 77°C a new build starts at once', async ($, on) => {
  const state = { tctl: 77, builds: '', saved: new Map(), ran: [] as string[] }
  stubs(on, state)
  expect(await $.tool.call({ tool: 'Bash', command: './gradlew build' })).toEqual({ result: 'ok' })
})

test('at 77°C a queued build stays held until the CPU is below 75°C', async ($, on) => {
  const state = { tctl: 85, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew test' })
  await clock.settle()
  state.tctl = 77
  for (let i = 0; i < 5; i += 1) await clock.advance(3000)
  expect(state.ran).toEqual([])
  state.tctl = 74
  await clock.advance(3000)
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
  expect(state.ran).toEqual(['./gradlew test'])
})

test('a build that waits longer than max_wait_minutes is refused', { options: { max_wait_minutes: 1 } }, async ($, on) => {
  const state = { tctl: 90, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew check' })
  await clock.advance(70_000)
  const r: any = await pending
  expect(r.deny).toMatch(/waited too long/)
  expect(state.ran).toEqual([])
  expect(state.saved.get('queue')).toEqual([])
})

test('an interrupted wait gives its turn back, also for a second build of the same session', async ($, on) => {
  const state: State = { tctl: 90, builds: '', saved: new Map(), ran: [] }
  const clock = stubs(on, state)
  const first = $.tool.call({ tool: 'Bash', command: './gradlew build' })
  await clock.settle()
  const second = $.tool.call({ tool: 'Bash', command: 'cargo test' })
  await clock.settle()
  expect((state.saved.get('queue') as any[]).length).toBe(2)
  state.abort = true
  await clock.advance(3000)
  expect(((await first) as any).deny).toBeDefined()
  expect(((await second) as any).deny).toBeDefined()
  expect(state.saved.get('queue')).toEqual([])
  expect(state.ran).toEqual([])
})

test('a ticket without a heartbeat stops holding the queue', async ($, on) => {
  const state = { tctl: 62, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  state.saved.set('queue', [{ id: 'gone', owner: 'other', since: 1_000_000 - 60_000, seen: 1_000_000 - 20_000, label: 'gradlew build' }])
  expect(await $.tool.call({ tool: 'Bash', command: './gradlew build' })).toEqual({ result: 'ok' })
  state.saved.set('lastStart', 0)
  state.saved.set('queue', [{ id: 'quiet', owner: 'other', since: 1_000_000 - 60_000, seen: clock.now() - 5000, label: 'gradlew build' }])
  const pending = $.tool.call({ tool: 'Bash', command: 'cargo build' })
  const ui = await $.ui.mount(BAND)
  expect(await waitFor(clock, ui, /1 queued ahead/)).toBeDefined()
  expect(state.ran).toEqual(['./gradlew build'])
  for (let i = 0; i < 5; i += 1) await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
})

test('a waiting build renews its ticket on every check', async ($, on) => {
  const state = { tctl: 90, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew build' })
  await clock.advance(21_000)
  const [ticket] = state.saved.get('queue') as any[]
  expect(ticket.since).toBe(1_000_000)
  expect(ticket.seen).toBeGreaterThanOrEqual(1_000_000 + 18_000)
  state.tctl = 70
  await clock.advance(3000)
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
})

test('the turn is handed over under a lock, writing lastStart before the ticket goes', async ($, on) => {
  const state: State = { tctl: 85, builds: '', saved: new Map(), ran: [], calls: [], writes: [] }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew build' })
  await clock.settle()
  state.tctl = 70
  await clock.advance(3000)
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
  const writes = state.writes!
  const started = writes.findIndex(([key]) => key === 'lastStart')
  const dropped = writes.findIndex(([key, value]) => key === 'queue' && (value as any[]).length === 0)
  expect(started).toBeGreaterThan(-1)
  expect(started).toBeLessThan(dropped)
  const calls = state.calls!
  const locked = calls.findIndex((argv) => argv[0] === 'sh' && argv[2].includes('admit.lock'))
  const unlocked = calls.findIndex((argv) => argv[0] === 'rmdir')
  expect(locked).toBeGreaterThan(-1)
  expect(calls[unlocked]).toEqual(['rmdir', '/data/heat-gate/admit.lock'])
  expect(locked).toBeLessThan(unlocked)
})

test('while another session holds the admission lock the build waits its turn', async ($, on) => {
  const state: State = { tctl: 62, builds: '', saved: new Map(), ran: [], lockBusy: true }
  const clock = stubs(on, state)
  const pending = $.tool.call({ tool: 'Bash', command: './gradlew build' })
  await clock.settle()
  expect(state.ran).toEqual([])
  expect((state.saved.get('queue') as any[]).length).toBe(1)
  state.lockBusy = false
  await clock.advance(3000)
  expect(await pending).toEqual({ result: 'ok' })
})

test('ending the session drops its tickets, and after /clear the band keeps refreshing', async ($, on) => {
  const state = { tctl: 55, builds: '', saved: new Map(), ran: [] as string[], sensed: 0 }
  const clock = stubs(on, state)
  startStubs(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  state.saved.set('queue', [
    { id: 'mine', owner: 's1', since: 1_000_000, seen: 1_000_000, label: 'gradlew build' },
    { id: 'theirs', owner: 's2', since: 1_000_000, seen: 1_000_000, label: 'cargo build' },
  ])
  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } } as any)
  expect((state.saved.get('queue') as any[]).map((x) => x.id)).toEqual(['theirs'])
  const before = state.sensed
  await clock.advance(8000)
  expect(state.sensed).toBeGreaterThan(before)
  await $.session.end({ reason: 'prompt_input_exit', sessionId: 's1', resume: { id: 's1' } } as any)
  const after = state.sensed
  await clock.advance(8000)
  expect(state.sensed).toBe(after)
})

test('at 98°C the builds freeze with a 10 minute guard, and they resume below 82°C', async ($, on) => {
  const state: State = { tctl: 98, builds: '', saved: new Map(), ran: [], calls: [], pgrep: '4242\n4243\n' }
  const clock = stubs(on, state)
  startStubs(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  const calls = state.calls!
  const pgrep = calls.find((argv) => argv[0] === 'sh' && argv[2].includes('pgrep'))!
  expect(pgrep[2]).toContain('pgrep -u "$(id -u)" -f')
  expect(pgrep[4]).toBe(FREEZE_PATTERN)
  expect(calls).toContainEqual(['kill', '-STOP', '4242', '4243'])
  const guard = calls.find((argv) => argv[0] === 'sh' && argv[2].includes('setsid'))!
  expect(guard[2]).toContain('nohup')
  expect(guard.slice(3)).toEqual(['heat-gate-guard-1000000', '600', '4242', '4243'])
  expect(state.saved.get('frozen')).toMatchObject({ pids: ['4242', '4243'], reason: 'auto', at: 1_000_000, guards: ['heat-gate-guard-1000000'] })
  state.tctl = 83
  await clock.advance(4000)
  expect(calls.some((argv) => argv[1] === '-CONT')).toBe(false)
  state.tctl = 81
  await clock.advance(4000)
  expect(calls).toContainEqual(['kill', '-CONT', '4242', '4243'])
  expect(calls).toContainEqual(['pkill', '-f', '^sh -c sleep .* (heat-gate-guard-1000000) '])
  expect(state.saved.has('frozen')).toBe(false)
})

test('a freeze lasts 10 minutes at most and a CPU still hot freezes again', async ($, on) => {
  const state: State = { tctl: 99, builds: '', saved: new Map(), ran: [], calls: [], pgrep: '4242\n' }
  const clock = stubs(on, state)
  startStubs(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  const stops = () => state.calls!.filter((argv) => argv[1] === '-STOP').length
  expect(stops()).toBe(1)
  await clock.advance(596_000)
  expect(stops()).toBe(1)
  await clock.advance(8000)
  expect(state.calls).toContainEqual(['kill', '-CONT', '4242'])
  expect(stops()).toBe(2)
  expect((state.saved.get('frozen') as any).at).toBeGreaterThanOrEqual(1_600_000)
})

test('a second freeze keeps the pids of the first, and resuming never drops a newer freeze', async ($, on) => {
  const state: State = { tctl: 60, builds: '', saved: new Map(), ran: [], calls: [], pgrep: '4242\n' }
  const clock = stubs(on, state)
  startStubs(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  state.saved.set('frozen', { pids: ['7'], reason: 'auto', at: 999_000, heat: '99°C', guards: ['heat-gate-guard-999000'] })
  const pane = await $.ui.mount(PANE)
  await pane.press({ key: 'freeze' })
  expect(state.saved.get('frozen')).toMatchObject({ pids: ['7', '4242'], reason: 'manual', guards: ['heat-gate-guard-999000', 'heat-gate-guard-1000000'] })
  const newer = { pids: ['4242', '8'], reason: 'auto', at: 1_002_000, heat: '99°C', guards: ['heat-gate-guard-1002000'] }
  state.onCont = () => {
    state.onCont = undefined
    state.saved.set('frozen', newer)
  }
  await clock.advance(4000)
  await pane.press({ key: 'thaw' })
  expect(state.calls).toContainEqual(['kill', '-CONT', '7', '4242'])
  expect(state.saved.get('frozen')).toEqual(newer)
})

function startStubs(on: any) {
  on('session.start', () => ({ cwd: '/work' }))
  on('session.end', () => ({ sessionId: 's1' }))
  on('session.id', () => ({ value: 's1' }))
  on('command.register', () => ({ value: undefined }))
}

test('the band shows CPU, RAM and containers', async ($, on) => {
  configure({})
  const state = { tctl: 55, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  startStubs(on)
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  await clock.advance(9000)
  expect(state.saved.get('docker')).toMatchObject({ list: [{ name: 'postgres' }, { name: 'rabbitmq' }] })
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 140 } })
  expect(await waitFor(clock, ui, /CPU/)).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /50%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /19\/31G/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /🐳 2 · 2\.0 GB/ })).toBeDefined()
})

test('docker is read once every 2 minutes across all sessions', async ($, on) => {
  configure({})
  const state = { tctl: 55, builds: '', saved: new Map(), ran: [] as string[], docker: 0 }
  const clock = stubs(on, state)
  startStubs(on)
  state.saved.set('docker', { at: 1_000_000 - 30_000, list: [{ name: 'other-session', cpu: 1, mem: 1 }] })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  await clock.advance(60_000)
  expect(state.docker).toBe(0)
  await clock.advance(40_000)
  expect(state.docker).toBe(1)
  await clock.advance(60_000)
  expect(state.docker).toBe(1)
})

test('sessions share one sensor reading', async ($, on) => {
  configure({})
  const state = { tctl: 55, builds: '', saved: new Map(), ran: [] as string[], sensed: 0 }
  const clock = stubs(on, state)
  startStubs(on)
  state.saved.set('sense', { at: 1_000_000, sample: { tctl: 61, zone: 61, crit: 105, boost: false, boostPath: null, load: 1, ncpu: 16, at: 1_000_000, cpu: 12, mem: null }, builds: [], hogs: [], cpu: { busy: 1, idle: 1 } })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' } as any)
  expect(state.sensed).toBe(0)
  const ui = await $.ui.mount(BAND)
  expect(await ui.find({ type: 'Text', text: /61°C/ })).toBeDefined()
  await clock.advance(4000)
  expect(state.sensed).toBe(1)
})

test('the desktop band and pane render', async ($, on) => {
  configure({})
  const state = { tctl: 55, builds: '', saved: new Map(), ran: [] as string[] }
  const clock = stubs(on, state)
  startStubs(on)
  await $.session.start({ surface: 'desktop', isInteractive: true, cwd: '/work' } as any)
  await clock.advance(9000)
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Text', text: /CPU/ })).toBeDefined()
  const pane = await $.ui.mount({ plugin: 'heat-gate', component: 'Pane', surface: 'desktop', requestId: 'heat-gate', viewport: { columns: 160, rows: 50 }, props: { title: 'heat-gate', isFocused: true, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} } } as any)
  expect(await pane.find({ type: 'Text', text: /postgres/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /Docker containers \(2\)/ })).toBeDefined()
})

const SAMPLE = { tctl: 61, cpu: 42, mem: { used: 19 * 1024 ** 3, total: 31 * 1024 ** 3 }, load: 2.5, ncpu: 16, boost: true }
const HISTORY = Array.from({ length: 20 }, (_, i) => ({ tctl: 50 + i, cpu: 30 + i }))
const DOCKER = [{ name: 'postgres', cpu: 3, mem: 1024 ** 3 }, { name: 'redis', cpu: 1, mem: 512 * 1024 ** 2 }]
const textOf = (row: any[], gap: string) => row.map((seg) => seg.parts.map((p: any) => p.text).join('')).join(gap)

test('the band picks the richest layout that fits the width, like responsive design', () => {
  configure({})
  const tier = (columns: number, desktop: boolean) => bandPlan(SAMPLE, HISTORY, DOCKER, columns, desktop).tier
  expect([140, 100, 75, 60, 35].map((c) => tier(c, false))).toEqual(['full', 'medium', 'lean', 'stacked', 'compact'])
  expect([140, 90, 75, 50, 35].map((c) => tier(c, true))).toEqual(['full', 'medium', 'lean', 'stacked', 'compact'])
  const full = bandPlan(SAMPLE, HISTORY, DOCKER, 140, false)
  expect(textOf(full.rows[0], full.gap)).toContain('🐳 2 · 1.5 GB')
  const lean = bandPlan(SAMPLE, HISTORY, DOCKER, 75, false)
  expect(textOf(lean.rows[0], lean.gap)).not.toMatch(/[▁▂▃▄▅▆▇█▰]/)
  expect(textOf(lean.rows[0], lean.gap)).toContain('turbo on')
})

test('no row of the band is wider than the space it gets, and no metric is split', () => {
  configure({})
  for (const desktop of [false, true]) {
    for (let columns = 24; columns <= 180; columns += 2) {
      const plan = bandPlan(SAMPLE, HISTORY, DOCKER, columns, desktop)
      for (const row of plan.rows) {
        if (row.length > 1) expect(cellsOf(textOf(row, plan.gap), desktop)).toBeLessThanOrEqual(plan.avail)
      }
      expect(plan.rows.flat().map((seg: any) => seg.key)).toEqual(['temp', 'cpu', 'ram', 'docker', 'load'])
    }
  }
})

test('emoji count as two cells and block glyphs as one', () => {
  expect(cellsOf('🐳 2', false)).toBe(4)
  expect(cellsOf('▁▂▃▰▱', true)).toBe(5)
  expect(cellsOf('load 2.5/16', true)).toBe(10)
})
