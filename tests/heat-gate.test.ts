import { expect, mock, test } from 'claude-code/testing'
import { configure, isHeavy, labelOf, levelOf, parseSense, tasksOf, turboCommand } from '../hooks/heat-gate.mjs'

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

function stubs(on: any, state: { tctl: number; builds: string; saved: Map<string, unknown>; ran: string[] }) {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('process.run', async ($: any, e: any) => {
    if (e.argv[0] === 'bash') return { value: { exitCode: 0, stdout: sense(state.tctl, state.builds), stderr: '' } }
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
