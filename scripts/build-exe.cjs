// Fast offline packager:
// 1. electron-vite build
// 2. assemble minimal staging dir (out/, resources/, runtime deps, package.json)
// 3. asar pack staging into app.asar
// 4. copy local node_modules/electron/dist into release/, drop app.asar in,
//    rename electron.exe -> <productName>.exe
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const asar = require('@electron/asar')

const ROOT = path.resolve(__dirname, '..')
const STAGE = path.join(ROOT, '.stage')
const OUT_DIR = path.join(ROOT, 'release')
const RUNTIME_DEPS = ['sql.js', 'uuid']

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const productName = pkg.productName || pkg.name
  const appDir = path.join(OUT_DIR, `${productName}-win32-x64`)

  console.log('[1/5] electron-vite build...')
  execSync('npx electron-vite build', { cwd: ROOT, stdio: 'inherit' })

  console.log('[2/5] preparing staging dir...')
  rmrf(STAGE)
  fs.mkdirSync(STAGE)
  copyDir(path.join(ROOT, 'out'), path.join(STAGE, 'out'))
  copyDir(path.join(ROOT, 'resources'), path.join(STAGE, 'resources'))
  const minimalPkg = {
    name: pkg.name,
    productName: pkg.productName,
    version: pkg.version,
    description: pkg.description,
    main: pkg.main,
    author: pkg.author,
    license: pkg.license,
    dependencies: Object.fromEntries(
      RUNTIME_DEPS.map((d) => [d, pkg.dependencies[d]])
    ),
  }
  fs.writeFileSync(
    path.join(STAGE, 'package.json'),
    JSON.stringify(minimalPkg, null, 2)
  )
  fs.mkdirSync(path.join(STAGE, 'node_modules'))
  for (const dep of RUNTIME_DEPS) {
    copyDir(
      path.join(ROOT, 'node_modules', dep),
      path.join(STAGE, 'node_modules', dep)
    )
  }

  console.log('[3/5] copying electron runtime...')
  rmrf(OUT_DIR)
  fs.mkdirSync(appDir, { recursive: true })
  copyDir(path.join(ROOT, 'node_modules', 'electron', 'dist'), appDir)

  console.log('[4/5] asar packing app...')
  const resourcesDir = path.join(appDir, 'resources')
  const defaultApp = path.join(resourcesDir, 'default_app.asar')
  if (fs.existsSync(defaultApp)) fs.rmSync(defaultApp)
  await asar.createPackage(STAGE, path.join(resourcesDir, 'app.asar'))

  console.log('[5/5] renaming exe...')
  const targetExe = path.join(appDir, `${productName}.exe`)
  if (fs.existsSync(targetExe)) fs.rmSync(targetExe)
  fs.renameSync(path.join(appDir, 'electron.exe'), targetExe)

  rmrf(STAGE)
  console.log(`done -> ${targetExe}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

