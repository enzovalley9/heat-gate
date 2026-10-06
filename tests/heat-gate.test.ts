import { expect, mock, test } from 'claude-code/testing'
import { bytesOf, configure, cpuPercent, isHeavy, labelOf, levelOf, meter, parseDocker, parseSense, tasksOf, turboCommand } from '../hooks/heat-gate.mjs'

const sense = (tctl: number, builds = '') =>
  `S ${tctl * 1000} ${tctl * 1000} 105000 1 7.40 16 /sys/devices/system/cpu/cpufreq/boost\n${builds}P\t227\tjava\nP\t96\tnode\n`

test('spots heavy builds and lets everything else through', () => {
  configure({})
  for (const c of [
    './gradlew clean check integrationTest --continue',
    'cd app && ./gradlew --no-daemon -q compileJava',
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

test('labels a build with its tool and tasks', () => {
  expect(labelOf('cd a && ./gradlew clean check integrationTest --continue')).toBe('gradlew clean check integrationTest')
  expect(labelOf('cargo test --all')).toBe('cargo test')
  expect(labelOf('docker compose -f x.yml up -d')).toBe('docker compose up')
  expect(tasksOf('/usr/lib/jvm/bin/java -cp x org.gradle.wrapper.GradleWrapperMain clean build --continue')).toBe('clean build')
  expect(tasksOf('/home/u/.cargo/bin/cargo build --release')).toBe('cargo build')
})

test('reads sensors, builds and processes', () => {
  const r = parseSense(sense(72, 'B\t123\t95\tSl\t/home/u/code/api\tjava org.gradle.wrapper.GradleWrapperMain clean check\n'))
  expect(r.sample).toMatchObject({ tctl: 72, crit: 105, boost: true, load: 7.4, ncpu: 16 })
  expect(r.builds).toEqual([{ pid: 123, seconds: 95, stopped: false, cwd: '/home/u/code/api', tasks: 'clean check' }])
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

function stubs(on: any, state: { tctl: number; builds: string; saved: Map<string, unknown>; ran: string[]; docker?: number; sensed?: number }) {
  const clock = mock.clock(on, { now: 1_000_000 })
  let busy = 1000
  on('process.run', async ($: any, e: any) => {
    if (e.argv[0] === 'bash') {
      state.sensed = (state.sensed ?? 0) + 1
      busy += 400
      return { value: { exitCode: 0, stdout: `${sense(state.tctl, state.builds)}C ${busy} ${busy + 600}\nM 32000000 12000000 8000000 6000000\n`, stderr: '' } }
    }
    if (e.argv[0] === 'docker') {
      state.docker = (state.docker ?? 0) + 1
      return { value: { exitCode: 0, stdout: 'postgres|12.5%|512MiB / 30GiB\nrabbitmq|3.1%|1.5GiB / 30GiB\n', stderr: '' } }
    }
    if (e.argv[0] === 'sleep') await clock.sleep(Number(e.argv[1]) * 1000)
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })
  on('store.get', ($: any, e: any) => ({ value: state.saved.get(e.key) }))
  on('store.set', ($: any, e: any) => {
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

function startStubs(on: any) {
  on('session.start', () => ({ cwd: '/work' }))
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
  const ui = await $.ui.mount(BAND)
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
