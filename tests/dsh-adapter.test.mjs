// Checks the DeepSeek Harness adapter in dsh/ against the published claude-plugin-dsh runtime.
// Run with `node --test tests/dsh-adapter.test.mjs`. Needs node 20+ and bun on PATH.
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')
const RUNTIME = 'claude-plugin-dsh'
const RUNTIME_VERSION = '0.2.0'
const RUNTIME_INTEGRITY = 'sha512-pzSobglwIh7NuG5Y5W331kVIg5NExU5wnzW3citMKXl57CMmVW255b5zPLDyVA/ERSgUjhrsugBgkEq5p+S1Zw=='
const roles = [
  'architect', 'codebase-researcher', 'debugger', 'explorer', 'general-purpose',
  'implementer', 'reviewer', 'security-reviewer', 'test-engineer', 'verifier',
]
const read = path => readFileSync(join(root, path), 'utf8')

// Runs in its own node process: imports the adapter, applies it to a minimal DSH host and
// prints where the runtime resolved from plus every skill body the plugin registered.
const PROBE = `
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const adapterPath = process.argv[2]
const adapter = await import(pathToFileURL(adapterPath).href)
const fromAdapter = createRequire(adapterPath)
const runtimeEntry = fromAdapter.resolve('${RUNTIME}')
const runtimeVersion = JSON.parse(readFileSync(fromAdapter.resolve('${RUNTIME}/package.json'), 'utf8')).version
const providers = [], commands = [], sections = [], warnings = []
const ctx = {
  logger: { warn: m => warnings.push(String(m)), info() {}, debug() {} },
  skills: { registerProvider: create => providers.push(create({ signal: new AbortController().signal, invalidate() {} })) },
  commands: { register: d => commands.push(d.name) },
  systemPrompt: { section: s => sections.push(s) },
  workingDirectory: { get: () => process.cwd() },
  inject: (_services, callback) => callback(ctx),
  effect() {},
  on() {},
}
await adapter.apply(ctx, {})
const skills = []
for (const provider of providers)
  for (const candidate of await provider.list({})) skills.push({ name: candidate.name, content: (await provider.get(candidate, {}))?.content ?? '' })
console.log(JSON.stringify({ name: adapter.name, runtimeEntry, runtimeVersion, skills, commands, sections, warnings }))
`

// Copies the plugin as a user would get it: no node_modules, no .git, no repo around it.
function standalonePlugin(scratch) {
  const copy = join(scratch, 'agents-def')
  cpSync(root, copy, { recursive: true, filter: src => !/[\\/](node_modules|\.git)$/.test(src) })
  return copy
}

function probe(scratch, plugin) {
  const script = join(scratch, 'probe.mjs')
  writeFileSync(script, PROBE)
  return spawnSync('node', [script, join(plugin, 'dsh', 'index.js')], { encoding: 'utf8' })
}

function withScratch(fn) {
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'agents-def-dsh-')))
  try {
    return fn(scratch)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

test('the adapter depends on the published runtime directly, with no vendored copy', () => {
  const pkg = JSON.parse(read('dsh/package.json'))
  assert.deepEqual(pkg.dependencies, { [RUNTIME]: RUNTIME_VERSION })
  assert.equal(pkg.version, JSON.parse(read('.claude-plugin/plugin.json')).version)
  assert.ok(pkg.files.includes('bun.lock'))
  assert.ok(!pkg.files.includes('claude-compat.js'))
  assert.ok(!existsSync(join(root, 'dsh', 'claude-compat.js')))
  const source = read('dsh/index.js')
  assert.ok(source.includes(`import { createPlugin, rootFrom } from '${RUNTIME}'`))
  assert.ok(source.includes("createPlugin({ root: rootFrom(import.meta.url), agents: { extraDirs: ['extras'] } })"))
  const lock = read('dsh/bun.lock')
  assert.ok(lock.includes(`"${RUNTIME}@${RUNTIME_VERSION}"`))
  assert.ok(lock.includes(RUNTIME_INTEGRITY))
})

test('a standalone copy installs the runtime from the lockfile and registers every role with its full body', () => withScratch(scratch => {
  const plugin = standalonePlugin(scratch)
  const install = spawnSync('bun', ['install', '--frozen-lockfile'], { cwd: join(plugin, 'dsh'), encoding: 'utf8' })
  assert.equal(install.status, 0, `frozen install failed:\n${install.stdout}\n${install.stderr}`)
  const run = probe(scratch, plugin)
  assert.deepEqual({ status: run.status, stderr: run.stderr }, { status: 0, stderr: '' })
  const seen = JSON.parse(run.stdout)
  assert.equal(seen.runtimeEntry, join(plugin, 'dsh', 'node_modules', RUNTIME, 'dist', 'claude-compat.js'))
  assert.equal(seen.runtimeVersion, RUNTIME_VERSION)
  assert.equal(seen.name, 'claude-compat-agents-def')
  assert.deepEqual(seen.skills.map(skill => skill.name).sort(),
    ['orchestrator', ...roles.map(role => `agents-def-agent-${role}`)].sort())
  for (const role of roles) {
    const directory = role === 'general-purpose' ? 'extras' : 'agents'
    const body = read(`${directory}/${role}.md`).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
    assert.ok(body.length > 200, `${role} source body must not be empty`)
    const skill = seen.skills.find(item => item.name === `agents-def-agent-${role}`)
    assert.ok(skill.content.includes(body), `${role} skill must carry its full role text`)
    assert.match(skill.content, /the original pin does not apply in DSH/)
  }
  const orchestrator = seen.skills.find(item => item.name === 'orchestrator')
  const orchestratorBody = read('skills/orchestrator/SKILL.md').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
  assert.ok(orchestrator.content.includes(orchestratorBody))
  assert.deepEqual({ commands: seen.commands, sections: seen.sections, warnings: seen.warnings }, { commands: [], sections: [], warnings: [] })
  console.log(`runtime: ${seen.runtimeEntry} (${seen.runtimeVersion}); skills: ${seen.skills.map(skill => skill.name).join(', ')}`)
}))

test('without the installed runtime the adapter fails to load and names the missing package', () => withScratch(scratch => {
  const run = probe(scratch, standalonePlugin(scratch))
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, new RegExp(`Cannot find package '${RUNTIME}'`))
  assert.equal(run.stdout, '')
}))
