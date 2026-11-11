import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { buildCapture, buildWorkObjectFromCaptureInput } from '../src/main/builders'
import { getStorePath, loadState, saveState } from '../src/main/storage'
import { briefToMarkdown } from '../src/renderer/src/lib/brief'

type Check = { name: string; pass: boolean; detail?: string }

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
}

function assert(checks: Check[], name: string, pass: boolean, detail?: string): void {
  checks.push({ name, pass, detail })
  const mark = pass ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const qaDir = process.env.UP_TO_SPEED_QA_DIR
if (!qaDir) {
  console.error(
    'Refusing to run. Set UP_TO_SPEED_QA_DIR to a disposable directory. This script writes up-to-speed.json.'
  )
  process.exit(1)
}
app.setPath('userData', qaDir)

void app.whenReady().then(() => {
  const checks: Check[] = []
  const storePath = getStorePath()
  const backupPath = `${storePath}.pre-v5-backup`

  try {
    if (!existsSync(storePath)) {
      throw new Error(`Store missing at ${storePath}`)
    }

    const before = readJson(storePath)
    const beforeVersion = Number(before.schemaVersion ?? 1)
    const beforeCanvases = Array.isArray(before.canvases) ? before.canvases.length : 0
    const beforeHadWorkObjects = Object.prototype.hasOwnProperty.call(before, 'workObjects')
    const stackBefore = Array.isArray(before.canvases)
      ? (before.canvases[0] as { id?: string; name?: string; captures?: unknown[] } | undefined)
      : undefined
    const capturesBefore = Array.isArray(stackBefore?.captures) ? stackBefore.captures.length : 0

    assert(
      checks,
      '1. Existing v0.6 data present before load',
      beforeCanvases >= 1 && capturesBefore >= 1,
      `canvases=${beforeCanvases} captures=${capturesBefore} schema=${beforeVersion}`
    )

    const state = loadState()
    const afterLoad = readJson(storePath)

    assert(
      checks,
      '2. Schema migrates to 5 on load',
      Number(afterLoad.schemaVersion) === 5 && state.schemaVersion === 5,
      `disk=${afterLoad.schemaVersion} memory=${state.schemaVersion} was=${beforeVersion}`
    )

    assert(
      checks,
      '3. pre-v5 backup created',
      existsSync(backupPath),
      backupPath
    )

    if (existsSync(backupPath)) {
      const backup = readJson(backupPath)
      assert(
        checks,
        '3b. Backup preserves pre-migration payload',
        Number(backup.schemaVersion ?? 1) === beforeVersion && !Object.prototype.hasOwnProperty.call(backup, 'workObjects'),
        `backup schema=${backup.schemaVersion}`
      )
    }

    assert(
      checks,
      '4. Existing stacks still appear',
      state.canvases.length === beforeCanvases &&
        state.canvases[0]?.name === stackBefore?.name &&
        state.canvases[0]?.captures.length === capturesBefore,
      `stack="${state.canvases[0]?.name}" captures=${state.canvases[0]?.captures.length}`
    )

    assert(
      checks,
      '4b. workObjects defaults to [] (no backfill)',
      Array.isArray(afterLoad.workObjects) &&
        (afterLoad.workObjects as unknown[]).length === 0 &&
        state.workObjects.length === 0 &&
        !beforeHadWorkObjects,
      `workObjects=${state.workObjects.length}`
    )

    const stack = state.canvases[0]
    if (!stack) {
      throw new Error('No stack available for Brief/Share path check')
    }

    const markdown = briefToMarkdown(stack)
    assert(
      checks,
      '5. Stack → Brief still generates markdown',
      markdown.includes(`## ${stack.name}`) && markdown.includes('### Context'),
      `chars=${markdown.length}`
    )

    const inboxObject = buildWorkObjectFromCaptureInput({
      title: 'QA Inbox Title',
      url: 'https://example.com/qa-inbox',
      note: 'QA inbox takeaway blurb',
      sourceApp: 'Safari',
      windowTitle: 'QA Window Title'
    })

    assert(
      checks,
      '11. Inbox WorkObject shape',
      inboxObject.type === 'capture' &&
        inboxObject.status === 'inbox' &&
        inboxObject.title === 'QA Inbox Title' &&
        inboxObject.blurb === 'QA inbox takeaway blurb' &&
        inboxObject.source?.appName === 'Safari' &&
        inboxObject.source?.windowTitle === 'QA Window Title' &&
        inboxObject.source?.url === 'https://example.com/qa-inbox' &&
        Array.isArray(inboxObject.relations) &&
        inboxObject.relations.length === 0 &&
        typeof inboxObject.createdAt === 'string' &&
        typeof inboxObject.updatedAt === 'string',
      JSON.stringify({
        type: inboxObject.type,
        status: inboxObject.status,
        source: inboxObject.source,
        relations: inboxObject.relations
      })
    )

    state.workObjects.unshift(inboxObject)
    saveState(state)

    let disk = readJson(storePath)
    let workObjects = disk.workObjects as Array<Record<string, unknown>>
    assert(
      checks,
      '9/10. Inbox item persisted (count=1)',
      Array.isArray(workObjects) && workObjects.length === 1 && workObjects[0]?.id === inboxObject.id,
      `count=${workObjects.length}`
    )

    const loaded = loadState()
    const target = loaded.workObjects.find((item) => item.id === inboxObject.id)
    if (!target) {
      throw new Error('Inbox object missing after reload')
    }
    target.title = 'QA Inbox Title Edited'
    target.blurb = 'QA inbox takeaway edited'
    target.updatedAt = new Date().toISOString()
    saveState(loaded)

    disk = readJson(storePath)
    workObjects = disk.workObjects as Array<Record<string, unknown>>
    assert(
      checks,
      '12. Editing title/blurb works',
      workObjects[0]?.title === 'QA Inbox Title Edited' &&
        workObjects[0]?.blurb === 'QA inbox takeaway edited',
      `title=${workObjects[0]?.title}`
    )

    const afterEdit = loadState()
    afterEdit.workObjects = afterEdit.workObjects.filter((item) => item.id !== inboxObject.id)
    saveState(afterEdit)

    disk = readJson(storePath)
    workObjects = disk.workObjects as Array<Record<string, unknown>>
    assert(
      checks,
      '13. Deleting an Inbox item works',
      Array.isArray(workObjects) && workObjects.length === 0,
      `count=${workObjects.length}`
    )

    const stackState = loadState()
    const active = stackState.canvases[0]
    if (!active) {
      throw new Error('Stack missing before stack-capture check')
    }
    const workCountBeforeStackWrite = stackState.workObjects.length
    const captureCountBefore = active.captures.length
    const stackCapture = buildCapture({
      title: 'QA Stack Capture',
      url: 'https://example.com/qa-stack',
      note: 'Should land in canvas.captures only',
      sourceApp: 'Chrome',
      windowTitle: 'Ignored for stack path'
    })
    active.captures.push(stackCapture)
    active.updatedAt = new Date().toISOString()
    saveState(stackState)

    disk = readJson(storePath)
    const canvases = disk.canvases as Array<{ captures?: unknown[] }>
    workObjects = disk.workObjects as Array<Record<string, unknown>>
    const captureCountAfter = canvases[0]?.captures?.length ?? 0
    const stackWriteOnly =
      captureCountAfter === captureCountBefore + 1 &&
      workObjects.length === workCountBeforeStackWrite &&
      !workObjects.some((item) => item.title === 'QA Stack Capture')

    assert(
      checks,
      '14. Stack destination writes canvas.captures, not workObjects',
      stackWriteOnly,
      `captures ${captureCountBefore}→${captureCountAfter}, workObjects=${workObjects.length}`
    )

    // Restore stack capture count so QA does not leave residue.
    const cleanup = loadState()
    if (cleanup.canvases[0]) {
      cleanup.canvases[0].captures = cleanup.canvases[0].captures.filter(
        (capture) => capture.id !== stackCapture.id
      )
      cleanup.canvases[0].updatedAt = new Date().toISOString()
    }
    cleanup.workObjects = cleanup.workObjects.filter((item) => item.id !== inboxObject.id)
    saveState(cleanup)

    const failed = checks.filter((check) => !check.pass)
    console.log('\n---')
    console.log(`Passed ${checks.filter((check) => check.pass).length}/${checks.length}`)
    if (failed.length > 0) {
      console.log('Failed:')
      for (const check of failed) {
        console.log(` - ${check.name}${check.detail ? ` (${check.detail})` : ''}`)
      }
      app.exit(1)
      return
    }

    console.log('Shipment 1 data-path QA passed.')
    app.exit(0)
  } catch (error) {
    console.error('QA crashed:', error)
    app.exit(1)
  }
})
