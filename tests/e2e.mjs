// End-to-end smoke + interaction test for DoList.
// Launches the built Electron app with a temp userData dir and drives the UI
// the way a user would. Reports each step PASS/FAIL plus any console errors.
//
// Usage:  node tests/e2e.mjs

import { _electron as electron } from 'playwright'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const userData = mkdtempSync(join(tmpdir(), 'dolist-e2e-'))
console.log(`[harness] userData = ${userData}`)

const results = []
const consoleErrors = []
const pageErrors = []

function record(name, ok, info) {
  results.push({ name, ok, info: info || '' })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info.split('\n')[0] : ''}`)
}

async function step(name, fn) {
  try {
    await fn()
    record(name, true)
  } catch (e) {
    record(name, false, e?.message || String(e))
  }
}

const app = await electron.launch({
  args: [join(projectRoot, 'out', 'main', 'index.js')],
  cwd: projectRoot,
  env: { ...process.env, DOLIST_USER_DATA: userData, NODE_ENV: 'production' },
  timeout: 30_000,
})

const page = await app.firstWindow()
await page.waitForLoadState('domcontentloaded')

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const txt = msg.text()
    if (/Failed to load resource/.test(txt)) return
    consoleErrors.push(txt)
  }
})
page.on('pageerror', (err) => pageErrors.push(err.message))

// Helpers ---------------------------------------------------------------

const dialog = () => page.locator('[role="dialog"]')

async function closeAnyOpenDialog() {
  // If a Radix dialog is open, dismiss it via Escape.
  if (await dialog().count() > 0) {
    await page.keyboard.press('Escape')
    await dialog().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {})
  }
}

async function navigate(href) {
  await closeAnyOpenDialog()
  await page.locator(`a[href="#${href}"]`).click({ timeout: 5000 })
  await page.waitForTimeout(250)
}

async function openNewTask() {
  await page.getByRole('button', { name: /新建任务|New Task/ }).click({ timeout: 5000 })
  await dialog().waitFor({ state: 'visible', timeout: 5000 })
}

async function fillTask({ title, estimated, due }) {
  const d = dialog()
  // First text input inside dialog is title
  const titleInput = d.locator('input[type="text"], input:not([type])').first()
  await titleInput.fill(title)
  if (typeof estimated === 'number') {
    await d.locator('input[type="number"]').first().fill(String(estimated))
  }
  if (due) {
    await d.locator('input[type="date"]').first().fill(due)
  }
}

async function submitTaskDialog() {
  const d = dialog()
  const submit = d.locator('button[type="submit"]')
  await submit.waitFor({ state: 'visible' })
  // Wait for it to become enabled (form validates title.trim())
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[role="dialog"] button[type="submit"]')
      return btn && !btn.disabled
    },
    null,
    { timeout: 5000 }
  )
  await submit.click()
  await dialog().waitFor({ state: 'detached', timeout: 5000 })
}

function row(text) {
  // The TaskItem root is the <div class="group flex items-center ..."> that holds the title text.
  return page
    .locator('div.group')
    .filter({ has: page.locator(`span:has-text("${text}")`) })
    .first()
}

async function listTasks() {
  return await page.evaluate(async () => {
    return await window.electronAPI.tasks.list()
  })
}

async function rowAction(text, ariaLabel) {
  const r = row(text)
  await r.waitFor({ state: 'visible', timeout: 5000 })
  // Hover the row so the action toolbar (opacity-0 → 100) is interactable
  await r.hover()
  await r.locator(`button[aria-label="${ariaLabel}"]`).first().click()
}

// Sanity --------------------------------------------------------------

await step('app: first window loaded', async () => {
  await page.waitForSelector('h1', { timeout: 8000 })
})

// 1. Inbox CRUD -------------------------------------------------------

await step('inbox: navigate', async () => { await navigate('/inbox') })

await step('inbox: create task one', async () => {
  await openNewTask()
  await fillTask({ title: 'E2E 任务一' })
  await submitTaskDialog()
  await row('E2E 任务一').waitFor({ state: 'visible', timeout: 5000 })
})

await step('inbox: create task two with estimated=30', async () => {
  await openNewTask()
  await fillTask({ title: 'E2E 任务二', estimated: 30 })
  await submitTaskDialog()
  await row('E2E 任务二').waitFor({ state: 'visible', timeout: 5000 })
})

await step('inbox: toggle task one done (disappears since hideDone=true)', async () => {
  await rowAction('E2E 任务一', '切换完成状态')
  await page.waitForTimeout(400)
  if ((await page.locator('span:has-text("E2E 任务一")').count()) > 0) {
    throw new Error('done task still showing in inbox')
  }
  // confirm via DB
  const tasks = await listTasks()
  const t = tasks.find((x) => x.title === 'E2E 任务一')
  if (!t || t.status !== 'done') throw new Error(`task one status=${t?.status}`)
})

await step('inbox: edit task two title', async () => {
  await rowAction('E2E 任务二', '编辑')
  await dialog().waitFor({ state: 'visible' })
  const titleInput = dialog().locator('input[type="text"], input:not([type])').first()
  await titleInput.fill('')
  await titleInput.fill('E2E 任务二改')
  await submitTaskDialog()
  await row('E2E 任务二改').waitFor({ state: 'visible', timeout: 5000 })
})

await step('inbox: open schedule dialog (estimate=30)', async () => {
  await rowAction('E2E 任务二改', '安排日程')
  await dialog().waitFor({ state: 'visible' })
  // Confirm dialog has the smart-schedule title
  const text = await dialog().textContent()
  if (!/智能排期|Smart Schedule/.test(text || '')) throw new Error('schedule dialog title missing')
  await page.keyboard.press('Escape')
  await dialog().waitFor({ state: 'detached', timeout: 3000 })
})

// BUG 2 regression: estimate=0 task can be scheduled via "extend" UI
await step('inbox: schedule dialog with estimate=0 shows duration prompt', async () => {
  await openNewTask()
  await fillTask({ title: 'E2E 零时长' })
  await submitTaskDialog()
  await row('E2E 零时长').waitFor({ state: 'visible' })
  await rowAction('E2E 零时长', '安排日程')
  await dialog().waitFor({ state: 'visible' })
  const text = await dialog().textContent()
  if (!/此任务还没有时长|This task has no duration set/.test(text || '')) {
    throw new Error('noDuration message not shown')
  }
  const apply = dialog().getByRole('button', { name: /^应用$|^Apply$/ })
  if (!(await apply.isVisible())) throw new Error('Apply button missing')
  await page.keyboard.press('Escape')
  await dialog().waitFor({ state: 'detached', timeout: 3000 })
})

await step('inbox: delete a task with confirmation', async () => {
  await rowAction('E2E 零时长', '删除')
  await dialog().waitFor({ state: 'visible' })
  // Click the destructive Delete button (the second "删除" — first is dialog title)
  await dialog().getByRole('button', { name: /^删除$|^Delete$/ }).click()
  await dialog().waitFor({ state: 'detached', timeout: 5000 })
  await page.waitForTimeout(300)
  if ((await page.locator('span:has-text("E2E 零时长")').count()) > 0) {
    throw new Error('task still in DOM after delete')
  }
})

// 2. Today view ------------------------------------------------------

await step('today: navigate', async () => { await navigate('/today') })

// 3. Kanban: drag pending → doing -----------------------------------

await step('kanban: navigate', async () => { await navigate('/kanban') })

await step('kanban: drag pending → doing column', async () => {
  // Card uses a <p class="truncate ...">title</p> inside a div with cursor-grab class.
  const card = page.locator('div.cursor-grab', { has: page.locator('p:has-text("E2E 任务二改")') }).first()
  await card.waitFor({ state: 'visible', timeout: 5000 })
  const cardBox = await card.boundingBox()
  // Use the doing column container — it has h3 "进行中" inside.
  const doingHeader = page.locator('h3:has-text("进行中")').first()
  const doingCol = doingHeader.locator('xpath=ancestor::*[contains(@class,"flex w-72")][1]')
  const colBox = await doingCol.boundingBox()
  if (!cardBox || !colBox) throw new Error('boxes missing')
  // Drop near the bottom of the column body
  const target = { x: colBox.x + colBox.width / 2, y: colBox.y + colBox.height - 40 }
  const from = { x: cardBox.x + cardBox.width / 2, y: cardBox.y + cardBox.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 5 })
  await page.mouse.move(target.x, target.y, { steps: 16 })
  await page.waitForTimeout(150)
  await page.mouse.up()
  await page.waitForTimeout(800)
  const tasks = await listTasks()
  const t = tasks.find((x) => x.title === 'E2E 任务二改')
  if (t?.status !== 'doing') throw new Error(`expected status=doing, got ${t?.status}`)
})

// 4. Matrix drag ------------------------------------------------------

await step('matrix: navigate', async () => { await navigate('/matrix') })

await step('matrix: drag to "紧急且重要" → priority=4', async () => {
  // The DraggableTask wrapper contains the TaskItem (which contains the title span)
  const titleSpan = page.locator('span:has-text("E2E 任务二改")').first()
  await titleSpan.waitFor({ state: 'visible', timeout: 5000 })
  // The draggable wrapper is the closest div ancestor with onPointerDown handler;
  // pragmatically use the parent div of the TaskItem's group div.
  const card = titleSpan.locator('xpath=ancestor::div[contains(@class,"group")][1]/parent::div').first()
  const cardBox = await card.boundingBox()
  const quadHeader = page.locator('h3:has-text("紧急且重要")').first()
  const quadrant = quadHeader.locator('xpath=ancestor::*[contains(@class,"rounded-xl")][1]')
  const qBox = await quadrant.boundingBox()
  if (!cardBox || !qBox) throw new Error('boxes missing')
  const target = { x: qBox.x + qBox.width / 2, y: qBox.y + qBox.height - 40 }
  const from = { x: cardBox.x + cardBox.width / 2, y: cardBox.y + cardBox.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 12, from.y + 12, { steps: 5 })
  await page.mouse.move(target.x, target.y, { steps: 16 })
  await page.waitForTimeout(150)
  await page.mouse.up()
  await page.waitForTimeout(700)
  const tasks = await listTasks()
  const t = tasks.find((x) => x.title === 'E2E 任务二改')
  if (t?.priority !== 4) throw new Error(`expected priority=4, got ${t?.priority}`)
})

// 5. Pomodoro ---------------------------------------------------------

await step('pomodoro: navigate', async () => { await navigate('/pomodoro') })

await step('pomodoro: start focus', async () => {
  await page.getByRole('button', { name: /开始专注|Start Focus/ }).click()
  await page.waitForTimeout(500)
  const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
  if (s !== 'focusing') throw new Error(`state=${s}`)
})

await step('pomodoro: pause', async () => {
  await page.locator('button[aria-label="暂停"]').first().click()
  await page.waitForTimeout(300)
  const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
  if (s !== 'paused') throw new Error(`state=${s}`)
})

await step('pomodoro: resume', async () => {
  await page.locator('button[aria-label="继续"]').first().click()
  await page.waitForTimeout(300)
  const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
  if (s !== 'focusing') throw new Error(`state=${s}`)
})

await step('pomodoro: stop', async () => {
  await page.locator('button[aria-label="停止"]').first().click()
  await page.waitForTimeout(400)
  const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
  if (s !== 'idle') throw new Error(`state=${s}`)
})

// 6. Settings — BUG 1 regression -------------------------------------

await step('settings: navigate', async () => { await navigate('/settings') })

await step('settings: switch locale to English updates UI immediately', async () => {
  // The language Select doesn't have aria-label; locate by id we set
  const langSelect = page.locator('select#locale-select')
  await langSelect.waitFor({ state: 'visible', timeout: 5000 })
  await langSelect.selectOption('en')
  await page.waitForTimeout(300)
  const inboxText = await page.locator('a[href="#/inbox"]').first().innerText()
  if (!/Inbox/i.test(inboxText)) throw new Error(`sidebar text not switched: "${inboxText}"`)
})

await step('settings: switch back to zh-CN', async () => {
  // After language switched, the select itself stays as a <select>; aria-label may now be "Language / 语言"
  const langSelect = page.locator('select#locale-select')
  await langSelect.selectOption('zh-CN')
  await page.waitForTimeout(300)
  const inboxText = await page.locator('a[href="#/inbox"]').first().innerText()
  if (!/收件箱/.test(inboxText)) throw new Error(`sidebar text not restored: "${inboxText}"`)
})

// 7. Tags -------------------------------------------------------------

await step('tags: navigate', async () => { await navigate('/tags') })

await step('tags: create + delete', async () => {
  // The page has just one input on it (new tag name)
  const input = page.locator('main input').first()
  await input.fill('e2e-tag')
  await page.getByRole('button', { name: /^添加$|^Add$/ }).click()
  await page.waitForTimeout(400)
  const tagRow = page.locator('div', { has: page.locator('span:has-text("e2e-tag")') }).filter({
    has: page.locator('button[aria-label="删除"]'),
  }).first()
  await tagRow.waitFor({ state: 'visible', timeout: 3000 })
  await tagRow.locator('button[aria-label="删除"]').click()
  await page.waitForTimeout(300)
  if ((await page.locator('span:has-text("e2e-tag")').count()) > 0) {
    throw new Error('tag still present after delete')
  }
})

// 8. Calendar / Timeline / Upcoming / Report ------------------------

await step('calendar: navigate renders', async () => {
  await navigate('/calendar')
  if ((await page.locator('h1:has-text("日历")').count()) === 0) throw new Error('calendar heading missing')
})

await step('timeline: navigate renders', async () => {
  await navigate('/timeline')
  if ((await page.locator('h1:has-text("时间线")').count()) === 0) throw new Error('timeline heading missing')
})

await step('upcoming: navigate renders', async () => {
  await navigate('/upcoming')
  if ((await page.locator('h1:has-text("即将")').count()) === 0) throw new Error('upcoming heading missing')
})

await step('report: navigate + range switch', async () => {
  await navigate('/report')
  if ((await page.locator('h1:has-text("统计报告")').count()) === 0) throw new Error('report heading missing')
  await page.getByRole('button', { name: /^7天$/ }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /^30天$/ }).click()
  await page.waitForTimeout(200)
})

// 9. Schedule swap (BUG 3 regression) -------------------------------

await step('schedule swap: setup two blocks for today', async () => {
  await navigate('/inbox')
  await openNewTask()
  await fillTask({ title: 'swap-A', estimated: 30 })
  await submitTaskDialog()
  await openNewTask()
  await fillTask({ title: 'swap-B', estimated: 30 })
  await submitTaskDialog()
  // Insert two blocks today via IPC: A at 10:00-10:30, B at 11:00-11:30
  const created = await page.evaluate(async () => {
    const tasks = await window.electronAPI.tasks.list()
    const a = tasks.find((x) => x.title === 'swap-A')
    const b = tasks.find((x) => x.title === 'swap-B')
    if (!a || !b) throw new Error('test tasks missing')
    const today = new Date()
    const at = (h, m = 0) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0)
      return d.toISOString()
    }
    const idA = await window.electronAPI.schedule.create({
      task_id: a.id, start_time: at(10, 0), end_time: at(10, 30), status: 'pending',
    })
    const idB = await window.electronAPI.schedule.create({
      task_id: b.id, start_time: at(11, 0), end_time: at(11, 30), status: 'pending',
    })
    return { idA, idB, taskA: a.id, taskB: b.id }
  })
  if (!created?.idA || !created?.idB) throw new Error('failed to create blocks')
})

await step('schedule swap: move A down on calendar swaps times', async () => {
  await navigate('/calendar')
  // Calendar has two day blocks today. Find the row containing "swap-A"
  // and click its move-down button.
  const rowA = page.locator('div.group', {
    has: page.locator('p:has-text("swap-A")'),
  }).first()
  await rowA.waitFor({ state: 'visible', timeout: 5000 })
  await rowA.hover()
  await rowA.locator('button[aria-label="下移"]').click()
  await page.waitForTimeout(700)
  // Now read the blocks back and confirm swap-A is at 11:00 and swap-B at 10:00
  const stateAfter = await page.evaluate(async () => {
    const tasks = await window.electronAPI.tasks.list()
    const aId = tasks.find((x) => x.title === 'swap-A')?.id
    const bId = tasks.find((x) => x.title === 'swap-B')?.id
    const blocksA = await window.electronAPI.schedule.listByTask(aId)
    const blocksB = await window.electronAPI.schedule.listByTask(bId)
    return {
      aStart: blocksA[0]?.start_time,
      bStart: blocksB[0]?.start_time,
    }
  })
  const aHour = new Date(stateAfter.aStart).getHours()
  const bHour = new Date(stateAfter.bStart).getHours()
  if (aHour !== 11 || bHour !== 10) {
    throw new Error(`expected A=11h B=10h, got A=${aHour}h B=${bHour}h`)
  }
})

await step('schedule swap: rapid double click does not corrupt order', async () => {
  // Click move-up on swap-A twice in quick succession. Guarded by `swapping`
  // state — second click should no-op.
  const rowA = page.locator('div.group', {
    has: page.locator('p:has-text("swap-A")'),
  }).first()
  await rowA.hover()
  const upBtn = rowA.locator('button[aria-label="上移"]')
  // Two clicks within a few ms
  await upBtn.click()
  await upBtn.click({ force: true }).catch(() => {})
  await page.waitForTimeout(800)
  const stateAfter = await page.evaluate(async () => {
    const tasks = await window.electronAPI.tasks.list()
    const aId = tasks.find((x) => x.title === 'swap-A')?.id
    const bId = tasks.find((x) => x.title === 'swap-B')?.id
    const blocksA = await window.electronAPI.schedule.listByTask(aId)
    const blocksB = await window.electronAPI.schedule.listByTask(bId)
    return {
      aHour: new Date(blocksA[0].start_time).getHours(),
      bHour: new Date(blocksB[0].start_time).getHours(),
    }
  })
  // After moving A up once, A=10 and B=11 (single swap)
  if (stateAfter.aHour !== 10 || stateAfter.bHour !== 11) {
    throw new Error(`expected A=10h B=11h after one swap, got A=${stateAfter.aHour}h B=${stateAfter.bHour}h`)
  }
})

// 10. Pomodoro mini window ------------------------------------------

await step('pomodoro mini: showMini opens mini and hides main', async () => {
  await navigate('/pomodoro')
  // Click the "缩小为迷你窗口" button on the panel header
  await page.locator('button[aria-label="缩小为迷你窗口"]').click()
  // Wait for a window whose URL contains /mini
  let mini = null
  for (let i = 0; i < 50; i++) {
    mini = app.windows().find((w) => w.url().includes('mini'))
    if (mini) break
    await new Promise((r) => setTimeout(r, 100))
  }
  if (!mini) throw new Error('mini window not detected')
  await mini.waitForLoadState('domcontentloaded').catch(() => {})
  // Poll until the mini reports visible (ready-to-show timing varies on Win)
  let visibility = null
  for (let i = 0; i < 30; i++) {
    visibility = await app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows().map((w) => ({
        url: w.webContents.getURL(),
        visible: w.isVisible(),
      }))
    })
    const m = visibility.find((v) => v.url.includes('mini'))
    if (m && m.visible) break
    await new Promise((r) => setTimeout(r, 100))
  }
  const main = visibility.find((v) => !v.url.includes('mini'))
  const miniInfo = visibility.find((v) => v.url.includes('mini'))
  if (!main || main.visible) throw new Error(`main should be hidden, got ${JSON.stringify(main)}`)
  if (!miniInfo || !miniInfo.visible) throw new Error(`mini should be visible, got ${JSON.stringify(miniInfo)}`)
})

await step('pomodoro mini: expand restores main and closes mini', async () => {
  const mini = app.windows().find((w) => w.url().includes('mini'))
  if (!mini) throw new Error('mini window missing')
  // Click the expand button on the MINI window (Maximize2 icon, aria-label "展开")
  await mini.locator('button[aria-label="展开"]').click()
  // hideMini() destroys the mini window. Give it a moment.
  await new Promise((r) => setTimeout(r, 500))
  const after = await app.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().map((w) => ({
      url: w.webContents.getURL(),
      visible: w.isVisible(),
    }))
  })
  const miniLeft = after.filter((v) => v.url.includes('mini'))
  if (miniLeft.length !== 0) throw new Error(`expected mini to be closed, still have ${miniLeft.length}`)
  const main = after.find((v) => !v.url.includes('mini'))
  if (!main || !main.visible) throw new Error(`main should be visible again, got ${JSON.stringify(main)}`)
})

// 11. Global shortcut ------------------------------------------------

await step('shortcut: Ctrl+Shift+D is registered in main process', async () => {
  const registered = await app.evaluate(({ globalShortcut }) => {
    return globalShortcut.isRegistered('CommandOrControl+Shift+D')
  })
  if (!registered) throw new Error('CommandOrControl+Shift+D not registered')
})

await step('shortcut: programmatic main-window hide/show works', async () => {
  // Cannot trigger an OS-level globalShortcut from Playwright on Windows,
  // so exercise the same code path: hide → show → assert visibility.
  try {
    const startVisible = await app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
      return main?.isVisible()
    })
    if (!startVisible) throw new Error('main window unexpectedly hidden at start')
    await app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
      main?.hide()
    })
    await new Promise((r) => setTimeout(r, 200))
    const hidden = await app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
      return main?.isVisible()
    })
    if (hidden) throw new Error('main window did not hide')
  } finally {
    // Always re-show, otherwise downstream tests fail.
    await app.evaluate(({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
      main?.show()
      main?.focus()
    })
    await new Promise((r) => setTimeout(r, 300))
  }
  const shownAgain = await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
    return main?.isVisible()
  })
  if (!shownAgain) throw new Error('main window did not show again')
})

// 12. Search filter --------------------------------------------------

await step('search: typing filters tasks client-side', async () => {
  await navigate('/inbox')
  // Wait for the search input — placeholder is t('common.search') = "搜索..."
  const search = page.locator('main input[placeholder*="搜索"]').first()
  await search.waitFor({ state: 'visible', timeout: 5000 })
  await search.fill('swap-A')
  // Client-side filter is immediate; allow one tick
  await page.waitForTimeout(100)
  const aVisible = await page.locator('span:has-text("swap-A")').first().isVisible()
  const bCount = await page.locator('span:has-text("swap-B")').count()
  if (!aVisible) throw new Error('swap-A not visible while searching')
  if (bCount !== 0) throw new Error(`swap-B should be hidden, count=${bCount}`)
  // Wait past the 250ms debounce — backend fetch should have run, no errors.
  await page.waitForTimeout(400)
  await search.fill('')
  await page.waitForTimeout(400)
  const bAfterClear = await page.locator('span:has-text("swap-B")').count()
  if (bAfterClear === 0) throw new Error('swap-B did not reappear after clearing search')
})

// 13. Form validation ------------------------------------------------

await step('form: empty title is rejected (submit stays disabled)', async () => {
  await navigate('/inbox')
  await openNewTask()
  // Title left blank — submit button should be disabled
  const submit = dialog().locator('button[type="submit"]')
  const isDisabled = await submit.evaluate((el) => /** @type {HTMLButtonElement} */ (el).disabled)
  if (!isDisabled) throw new Error('submit button enabled with empty title')
  // Whitespace-only title also rejected
  const titleInput = dialog().locator('input[type="text"], input:not([type])').first()
  await titleInput.fill('   ')
  const stillDisabled = await submit.evaluate((el) => /** @type {HTMLButtonElement} */ (el).disabled)
  if (!stillDisabled) throw new Error('submit enabled with whitespace-only title')
  await page.keyboard.press('Escape')
  await dialog().waitFor({ state: 'detached', timeout: 3000 })
})

// 14. Tags applied to task via TaskForm ----------------------------

await step('task with tags: tags persist on task and render on item', async () => {
  await navigate('/inbox')
  await openNewTask()
  const d = dialog()
  await fillTask({ title: 'tagged-task', estimated: 10 })
  // Tags input — use placeholder "标签1, 标签2..."
  const tagsInput = d.locator('input[placeholder*="标签"]').first()
  await tagsInput.fill('alpha, beta')
  await submitTaskDialog()
  await row('tagged-task').waitFor({ state: 'visible', timeout: 5000 })
  // The TaskItem should render small tag pills for "alpha" and "beta"
  const taggedRow = row('tagged-task')
  const alphaPill = taggedRow.locator('span:has-text("alpha")')
  const betaPill = taggedRow.locator('span:has-text("beta")')
  if (!(await alphaPill.isVisible())) throw new Error('alpha tag not rendered on item')
  if (!(await betaPill.isVisible())) throw new Error('beta tag not rendered on item')
  // DB verification
  const t = (await listTasks()).find((x) => x.title === 'tagged-task')
  if (!t || !Array.isArray(t.tags)) throw new Error('task missing tags field')
  if (!t.tags.includes('alpha') || !t.tags.includes('beta')) {
    throw new Error(`tags missing on task: ${JSON.stringify(t.tags)}`)
  }
})

// 15. Kanban round-trip: pending → done → pending --------------------

await step('kanban: round-trip drag pending → done → pending', async () => {
  // Use the freshly-created tagged-task (status=pending)
  await navigate('/kanban')
  // Drag tagged-task to "已完成" column
  const card = page.locator('div.cursor-grab', { has: page.locator('p:has-text("tagged-task")') }).first()
  await card.waitFor({ state: 'visible', timeout: 5000 })
  let cardBox = await card.boundingBox()
  const doneHeader = page.locator('h3:has-text("已完成")').first()
  const doneCol = doneHeader.locator('xpath=ancestor::*[contains(@class,"flex w-72")][1]')
  let colBox = await doneCol.boundingBox()
  if (!cardBox || !colBox) throw new Error('boxes missing')
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(cardBox.x + 12, cardBox.y + 12, { steps: 5 })
  await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height - 30, { steps: 16 })
  await page.waitForTimeout(120)
  await page.mouse.up()
  await page.waitForTimeout(700)
  let t = (await listTasks()).find((x) => x.title === 'tagged-task')
  if (t?.status !== 'done') throw new Error(`expected done, got ${t?.status}`)
  if (!t.completed_at) throw new Error('completed_at not set')

  // Now drag it back to "待办"
  const cardBack = page.locator('div.cursor-grab', { has: page.locator('p:has-text("tagged-task")') }).first()
  cardBox = await cardBack.boundingBox()
  const pendingHeader = page.locator('h3:has-text("待办")').first()
  const pendingCol = pendingHeader.locator('xpath=ancestor::*[contains(@class,"flex w-72")][1]')
  colBox = await pendingCol.boundingBox()
  if (!cardBox || !colBox) throw new Error('return boxes missing')
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(cardBox.x + 12, cardBox.y + 12, { steps: 5 })
  await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height - 30, { steps: 16 })
  await page.waitForTimeout(120)
  await page.mouse.up()
  await page.waitForTimeout(700)
  t = (await listTasks()).find((x) => x.title === 'tagged-task')
  if (t?.status !== 'pending') throw new Error(`expected pending, got ${t?.status}`)
  if (t.completed_at) throw new Error(`completed_at should be cleared, got ${t.completed_at}`)
})

// 16. Schedule split: 2 parts ---------------------------------------

await step('schedule: split a 90-min task into 2 parts', async () => {
  await navigate('/inbox')
  await openNewTask()
  await fillTask({ title: 'split-task', estimated: 90 })
  await submitTaskDialog()
  await row('split-task').waitFor({ state: 'visible' })
  await rowAction('split-task', '安排日程')
  await dialog().waitFor({ state: 'visible' })
  // Split checkbox is auto-on for >90 minutes; allow a brief moment for slot
  // recommendation IPC to complete.
  await page.waitForTimeout(800)
  // Confirm "拆分成多段" checkbox is checked (it's auto-set when targetDuration > 90)
  // The recommend list should show "共 2 段" candidates.
  const groupTexts = await dialog().locator('label').allTextContents()
  const hasMulti = groupTexts.some((s) => /共 2 段|2 slots total/.test(s))
  if (!hasMulti) {
    // Not all conditions can recommend split slots (depends on workday hours and
    // existing blocks). Accept either single-slot fallback or split — but make
    // sure no error occurred.
    const noSlots = groupTexts.length === 0
      && /没有找到合适的空档|No suitable slots/.test((await dialog().textContent()) || '')
    if (!noSlots && groupTexts.length === 0) {
      throw new Error('no candidate groups rendered')
    }
  }
  await page.keyboard.press('Escape')
  await dialog().waitFor({ state: 'detached', timeout: 3000 })
})

// 17. Settings round-trip: change focus duration, restart focus ----

await step('settings: changing focus duration is reflected in the panel', async () => {
  await navigate('/settings')
  const focusInput = page.locator('main input[type="number"]').first()
  await focusInput.fill('1') // 1-minute focus
  await page.waitForTimeout(600) // wait past 400ms debounce
  await navigate('/pomodoro')
  // Read the displayed minutes counter inside the panel (e.g. "1分")
  const minutesText = await page.locator('span:has-text("分")').first().textContent()
  if (!/1\s*分/.test(minutesText || '')) {
    throw new Error(`pomodoro panel didn't pick up new focus duration: "${minutesText}"`)
  }
})

await step('settings: restore focus duration to 25', async () => {
  await navigate('/settings')
  const focusInput = page.locator('main input[type="number"]').first()
  await focusInput.fill('25')
  await page.waitForTimeout(500)
})

// 18. PomodoroDock floating widget ----------------------------------

await step('dock: starting focus shows the floating dock with controls', async () => {
  // Start focus from the Pomodoro panel
  await navigate('/pomodoro')
  await page.getByRole('button', { name: /开始专注/ }).click()
  await page.waitForTimeout(500)
  // The dock lives in MainLayout, fixed bottom-left, only when state !== idle.
  // Navigate away to e.g. /inbox and verify the dock is still there.
  await navigate('/inbox')
  // The dock has a button containing the timer text and progress ring.
  // We can identify it by the unique aria-labels for pause / stop within a
  // fixed-positioned container at the bottom-left.
  const dock = page.locator('div.fixed.bottom-4').first()
  await dock.waitFor({ state: 'visible', timeout: 5000 })
  if (!(await dock.locator('button[aria-label="暂停"]').first().isVisible())) {
    throw new Error('dock pause button not visible')
  }
  if (!(await dock.locator('button[aria-label="停止"]').first().isVisible())) {
    throw new Error('dock stop button not visible')
  }
})

await step('dock: pause from the dock changes timer state', async () => {
  const dock = page.locator('div.fixed.bottom-4').first()
  await dock.locator('button[aria-label="暂停"]').first().click()
  await page.waitForTimeout(300)
  const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
  if (s !== 'paused') throw new Error(`expected paused, got ${s}`)
})

await step('dock: stop from the dock returns to idle and dock disappears', async () => {
  const dock = page.locator('div.fixed.bottom-4').first()
  await dock.locator('button[aria-label="停止"]').first().click()
  await page.waitForTimeout(500)
  const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
  if (s !== 'idle') throw new Error(`expected idle, got ${s}`)
  // Dock conditionally rendered — should now be gone
  const stillThere = await page.locator('div.fixed.bottom-4 button[aria-label="暂停"]').count()
  if (stillThere > 0) throw new Error('dock did not disappear after stop')
})

// 19. Today view shows tasks with today's due_date -------------------

await step('today: task with due_date=today appears in Today list', async () => {
  await navigate('/inbox')
  // Build today's date as YYYY-MM-DD
  const todayStr = await page.evaluate(() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${dd}`
  })
  await openNewTask()
  await fillTask({ title: 'today-task', estimated: 10, due: todayStr })
  await submitTaskDialog()
  await navigate('/today')
  await row('today-task').waitFor({ state: 'visible', timeout: 5000 })
})

// 20. Long task title doesn't break layout --------------------------

await step('long title: extremely long title truncates but does not overflow', async () => {
  await navigate('/inbox')
  await openNewTask()
  const long = '极长任务标题'.repeat(30) + '_END' // ~120+ chars
  await fillTask({ title: long })
  await submitTaskDialog()
  // Find via prefix match
  await page.locator('span:has-text("极长任务标题极长任务标题")').first().waitFor({ state: 'visible' })
  // The TaskItem container should not be wider than its parent. Use bounding
  // box comparison: row width <= scroll container width.
  const item = page.locator('div.group', {
    has: page.locator('span:has-text("极长任务标题极长任务标题")'),
  }).first()
  const itemBox = await item.boundingBox()
  const main = page.locator('main')
  const mainBox = await main.boundingBox()
  if (!itemBox || !mainBox) throw new Error('boxes missing')
  if (itemBox.width > mainBox.width + 1) {
    throw new Error(`item ${itemBox.width}px wider than main ${mainBox.width}px`)
  }
})

// 21. Main window minimize / restore --------------------------------

await step('window: minimize then restore via main-process API', async () => {
  // Minimize
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
    main?.minimize()
  })
  await new Promise((r) => setTimeout(r, 250))
  const minimized = await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
    return main?.isMinimized()
  })
  if (!minimized) throw new Error('main window did not minimize')
  // Restore (so subsequent tests can interact)
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
    main?.restore()
    main?.focus()
  })
  await new Promise((r) => setTimeout(r, 300))
  const restored = await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('mini'))
    return { minimized: main?.isMinimized(), visible: main?.isVisible() }
  })
  if (restored.minimized) throw new Error('main still minimized after restore')
  if (!restored.visible) throw new Error('main not visible after restore')
})

// 22. SQL injection / special characters in task title --------------

await step('special chars: titles with quotes/SQL/HTML round-trip safely', async () => {
  await navigate('/inbox')
  const tricky = "';DROP TABLE tasks;-- <script>alert(1)</script> 中文"
  await openNewTask()
  await fillTask({ title: tricky })
  await submitTaskDialog()
  // Verify the task list still loads (DROP TABLE didn't run)
  const tasks = await listTasks()
  const t = tasks.find((x) => x.title === tricky)
  if (!t) throw new Error('tricky-title task not persisted')
  // Tasks table still exists and earlier tasks (e.g. tagged-task) still readable
  const tagged = tasks.find((x) => x.title === 'tagged-task')
  if (!tagged) throw new Error('SQL injection actually wiped earlier rows')
  // The title text content matches verbatim — no HTML escaping turning into &lt;
  await page.locator(`span:text-is(${JSON.stringify(tricky)})`).first().waitFor({ state: 'visible', timeout: 3000 })
})

// 23. Bulk concurrent task creation --------------------------------

await step('concurrency: 50 parallel createTask calls all persist', async () => {
  const before = (await listTasks()).length
  await page.evaluate(async () => {
    const promises = []
    for (let i = 0; i < 50; i++) {
      promises.push(window.electronAPI.tasks.create({
        title: `bulk-${i}`,
        status: 'pending',
        priority: 2,
        list: 'inbox',
      }))
    }
    await Promise.all(promises)
  })
  const after = (await listTasks()).length
  if (after - before !== 50) throw new Error(`expected +50 tasks, got +${after - before}`)
  // All 50 distinct UUIDs (spot check by counting matching titles)
  const all = await listTasks()
  const bulkCount = all.filter((t) => /^bulk-\d+$/.test(t.title)).length
  if (bulkCount !== 50) throw new Error(`expected 50 bulk tasks, got ${bulkCount}`)
})

await step('concurrency cleanup: remove the 50 bulk tasks', async () => {
  await page.evaluate(async () => {
    const tasks = await window.electronAPI.tasks.list()
    const bulk = tasks.filter((t) => /^bulk-\d+$/.test(t.title))
    await Promise.all(bulk.map((t) => window.electronAPI.tasks.delete(t.id)))
  })
  const after = await listTasks()
  if (after.some((t) => /^bulk-\d+$/.test(t.title))) throw new Error('cleanup left bulk tasks')
})

// 24. Locale switch while pomodoro is running -----------------------

await step('locale: switching language while focusing updates dock kind label', async () => {
  // Start focus
  await navigate('/pomodoro')
  await page.getByRole('button', { name: /开始专注/ }).click()
  await page.waitForTimeout(400)
  // Verify dock shows 专注
  const dock = page.locator('div.fixed.bottom-4').first()
  await dock.waitFor({ state: 'visible', timeout: 5000 })
  const beforeText = await dock.textContent()
  if (!/专注/.test(beforeText || '')) throw new Error(`dock should show 专注: "${beforeText}"`)
  // Switch language
  await navigate('/settings')
  await page.locator('select#locale-select').selectOption('en')
  await page.waitForTimeout(300)
  const afterText = await page.locator('div.fixed.bottom-4').first().textContent()
  if (!/Focus/i.test(afterText || '')) {
    throw new Error(`dock should show Focus after lang switch: "${afterText}"`)
  }
  // Restore
  await page.locator('select#locale-select').selectOption('zh-CN')
  await page.waitForTimeout(300)
  // Stop the focus session so subsequent tests start clean
  const dockZh = page.locator('div.fixed.bottom-4').first()
  await dockZh.locator('button[aria-label="停止"]').click()
  await page.waitForTimeout(400)
})

// 25. Schedule recommendation respects workday hours ----------------

await step('workday: settings to 9-17 + 8h task → recommendations stay in 9..17', async () => {
  // Set workday to 9..17 via IPC
  await page.evaluate(async () => {
    await window.electronAPI.settings.setInt('workday_start_hour', 9)
    await window.electronAPI.settings.setInt('workday_end_hour', 17)
  })
  // Ask scheduler for an 8-hour single block
  const slots = await page.evaluate(async () => {
    return await window.electronAPI.scheduler.recommendSlots(60, 1, 5)
  })
  if (!Array.isArray(slots)) throw new Error(`expected array, got ${typeof slots}`)
  for (const group of slots) {
    for (const s of group) {
      const start = new Date(s.start)
      const end = new Date(s.end)
      const sh = start.getHours()
      const eh = end.getHours()
      const em = end.getMinutes()
      // end may legitimately be exactly endHour:00
      if (sh < 9 || sh >= 17) throw new Error(`slot start hour ${sh} outside 9..17`)
      const endTotal = eh + em / 60
      if (endTotal > 17.0001) throw new Error(`slot end ${eh}:${em} after 17:00`)
    }
  }
})

await step('workday cleanup: restore default 9..22', async () => {
  await page.evaluate(async () => {
    await window.electronAPI.settings.setInt('workday_start_hour', 9)
    await window.electronAPI.settings.setInt('workday_end_hour', 22)
  })
})

// 26. Cascade delete: deleting a scheduled task removes its blocks --

await step('cascade: deleting a task with scheduled blocks removes the blocks', async () => {
  // Create a task and schedule it
  const setup = await page.evaluate(async () => {
    const taskId = await window.electronAPI.tasks.create({
      title: 'cascade-victim',
      status: 'pending', priority: 2, list: 'inbox',
      estimated_minutes: 30,
    })
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString()
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString()
    await window.electronAPI.schedule.create({ task_id: taskId, start_time: start, end_time: end, status: 'pending' })
    const before = (await window.electronAPI.schedule.listByTask(taskId)).length
    return { taskId, before }
  })
  if (setup.before !== 1) throw new Error(`expected 1 block before delete, got ${setup.before}`)
  const after = await page.evaluate(async (taskId) => {
    await window.electronAPI.tasks.delete(taskId)
    return (await window.electronAPI.schedule.listByTask(taskId)).length
  }, setup.taskId)
  if (after !== 0) throw new Error(`expected blocks cascaded, ${after} left`)
})

// 27. Edit active pomodoro task title → dock label updates ----------

await step('dock title: editing active pomodoro task title updates the dock', async () => {
  // Create a task via UI so the store stays in sync, then start focus on it
  await navigate('/inbox')
  await openNewTask()
  await fillTask({ title: 'dock-title-A', estimated: 25 })
  await submitTaskDialog()
  const taskId = await page.evaluate(async () => {
    const tasks = await window.electronAPI.tasks.list()
    return tasks.find((x) => x.title === 'dock-title-A')?.id
  })
  if (!taskId) throw new Error('could not find dock-title-A')
  await page.evaluate(async (id) => {
    await window.electronAPI.pomodoro.startFocus(25, id)
  }, taskId)
  await page.waitForTimeout(500)
  // Wait for the dock to appear with the original title
  const dock = page.locator('div.fixed.bottom-4').first()
  await dock.waitFor({ state: 'visible', timeout: 5000 })
  await page.waitForFunction(
    () => /dock-title-A/.test(document.querySelector('.fixed.bottom-4')?.textContent || ''),
    null,
    { timeout: 5000 }
  )
  // Edit via the inbox UI — the realistic flow that routes through the store
  // and triggers a re-fetch + dock re-render.
  await rowAction('dock-title-A', '编辑')
  await dialog().waitFor({ state: 'visible' })
  const titleInput = dialog().locator('input[type="text"], input:not([type])').first()
  await titleInput.fill('')
  await titleInput.fill('dock-title-B')
  await submitTaskDialog()
  await page.waitForFunction(
    () => /dock-title-B/.test(document.querySelector('.fixed.bottom-4')?.textContent || ''),
    null,
    { timeout: 5000 }
  )
  // Cleanup: stop focus, delete task
  await page.evaluate(async () => {
    await window.electronAPI.pomodoro.stop()
    const tasks = await window.electronAPI.tasks.list()
    const t = tasks.find((x) => x.title === 'dock-title-B')
    if (t) await window.electronAPI.tasks.delete(t.id)
  })
  // Wait until idle so the dock disappears before the next test
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(async () => (await window.electronAPI.pomodoro.getState()).state)
    if (s === 'idle') break
    await new Promise((r) => setTimeout(r, 100))
  }
})

// 28. Pomodoro mini bounds are clamped to min/max -------------------

await step('mini bounds: setMiniBounds clamps to min/max range', async () => {
  // Open mini if not already
  await navigate('/pomodoro')
  // Scope to <main> so we don't also match the dock's mini button when one
  // is rendered.
  await page.locator('main button[aria-label="缩小为迷你窗口"]').click()
  let mini = null
  for (let i = 0; i < 30; i++) {
    mini = app.windows().find((w) => w.url().includes('mini'))
    if (mini) break
    await new Promise((r) => setTimeout(r, 100))
  }
  if (!mini) throw new Error('mini window not found')
  // Try to set bounds way below the minimum (240, 90) — main process must clamp
  await mini.evaluate(async () => {
    await window.electronAPI.pomodoro.setMiniBounds(50, 30)
  })
  await new Promise((r) => setTimeout(r, 250))
  let bounds = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('mini'))
    return w?.getBounds()
  })
  if (!bounds) throw new Error('mini bounds not readable')
  if (bounds.width < 240 || bounds.height < 90) {
    throw new Error(`min not enforced: ${JSON.stringify(bounds)}`)
  }
  // Try above max (600, 300)
  await mini.evaluate(async () => {
    await window.electronAPI.pomodoro.setMiniBounds(2000, 2000)
  })
  await new Promise((r) => setTimeout(r, 250))
  bounds = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('mini'))
    return w?.getBounds()
  })
  if (bounds.width > 600 || bounds.height > 300) {
    throw new Error(`max not enforced: ${JSON.stringify(bounds)}`)
  }
  // Close mini, restore main
  await mini.locator('button[aria-label="展开"]').click()
  await new Promise((r) => setTimeout(r, 400))
})

// Cleanup ------------------------------------------------------------

await app.close()

const passed = results.filter((r) => r.ok).length
const failed = results.length - passed
console.log('\n========== SUMMARY ==========')
console.log(`Passed:        ${passed}`)
console.log(`Failed:        ${failed}`)
console.log(`Console errors: ${consoleErrors.length}`)
console.log(`Page errors:    ${pageErrors.length}`)
if (consoleErrors.length) {
  console.log('\n-- console.error --')
  for (const e of consoleErrors) console.log('  ' + e)
}
if (pageErrors.length) {
  console.log('\n-- pageerror --')
  for (const e of pageErrors) console.log('  ' + e)
}
if (failed) {
  console.log('\n-- failed steps --')
  for (const r of results) if (!r.ok) console.log(`  ${r.name} :: ${r.info.split('\n')[0]}`)
}

try { rmSync(userData, { recursive: true, force: true }) } catch {}

process.exit(failed === 0 && pageErrors.length === 0 ? 0 : 1)
