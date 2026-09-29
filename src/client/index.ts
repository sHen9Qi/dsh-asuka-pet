/**
 * Asuka-pet standalone desktop companion plugin for DeepSeek Harness.
 * A chibi Asuka that floats in the lower-right corner — click for quotes,
 * drag to reposition, AT Field ring appears only while dsh is actively running.
 *
 * Written in plain JS-compatible syntax — no TS type annotations.
 */
import { ASUKA_PET_CHIBI } from './pet-art.generated.ts'
import './asuka-pet.module.css'

/** @type {{ mood: string, text: string }} AsukaLine */
const LINES = [
  // 空闲 idle
  { mood: 'idle',     text: '叫我干嘛啦？' },
  { mood: 'idle',     text: '哼，我才没有在等你呢。' },
  { mood: 'idle',     text: '……有事快说，我很忙的。' },
  { mood: 'idle',     text: '我是二号机最年轻的王牌飞行员哦。' },
  // 思考 thinking
  { mood: 'thinking',  text: '……嗯，也就是说……' },
  { mood: 'thinking',  text: '让我想想……好了。' },
  { mood: 'thinking',  text: '这点程度，别小看我啊。' },
  { mood: 'thinking',  text: '正在分析数据……按我的同步率，眨眼就完。' },
  // 使用工具 tool
  { mood: 'tool',      text: '接通 NERV 系统，操作交给我。' },
  { mood: 'tool',      text: '同步率全开，指令调用执行中。' },
  { mood: 'tool',      text: '这种操作，闭着眼都能完成。' },
  { mood: 'tool',      text: '接入成功，马上搞定。' },
  // 回答输出 speaking
  { mood: 'speaking',  text: '冷静听我说，重点有三个。' },
  { mood: 'speaking',  text: '这样写的话，一次就过。' },
  { mood: 'speaking',  text: '看好了，这样——我给你讲解。' },
  { mood: 'speaking',  text: '我只告诉你重点，所以要感谢我哦。' },
]

const STORAGE_KEY = 'dsh-asuka-pet:pet-position'
const BUBBLE_TIMEOUT_MS = 4000
/** Global bubble clock tick — every bubble (work or idle) follows this cadence. */
const WORK_TICK_MS = 3000

/** Random work-bubble moods — colour AND figure animation follow the picked mood. */
const WORK_MOODS = ['thinking', 'tool', 'speaking']
/** Chance that an idle click plays a random work mood instead of an idle line. */
const SURPRISE_RATE = 0.6

const OWNER = 'asuka-pet'
/** Bump on every behaviour/color change — shown on the pet for staleness checks. */
const BUILD_VERSION = '4mood-v10'

function pickLine(mood, exclude) {
  const pool = LINES.filter(l => l.mood === mood)
  if (!pool.length) return LINES[0]
  if (pool.length === 1 || !exclude) return pool[Math.floor(Math.random() * pool.length)]
  const filtered = pool.filter(l => l.text !== exclude)
  return filtered[Math.floor(Math.random() * filtered.length)] || pool[0]
}

function createPet() {
  const stage = document.createElement('div')
  stage.dataset.asukaPet = 'stage'
  stage.dataset.mood = 'idle'
  stage.dataset.bubble = 'hidden'

  const ring = document.createElement('div')
  ring.dataset.asukaPet = 'ring'

  const figure = document.createElement('img')
  figure.dataset.asukaPet = 'figure'
  figure.alt = ''
  figure.src = ASUKA_PET_CHIBI
  figure.draggable = false

  const bubble = document.createElement('div')
  bubble.dataset.asukaPet = 'bubble'
  bubble.textContent = ''

  stage.append(ring, figure, bubble)
  return { stage, ring, figure, bubble, mood: 'idle', timer: undefined, nonIdle: false }
}

function placeAt(stage, x, y) {
  const maxX = Math.max(0, window.innerWidth - stage.offsetWidth - 4)
  const maxY = Math.max(0, window.innerHeight - stage.offsetHeight - 4)
  stage.style.left = `${Math.min(Math.max(0, x), maxX)}px`
  stage.style.top  = `${Math.min(Math.max(0, y), maxY)}px`
  stage.style.right = 'auto'
  stage.style.bottom = 'auto'
}

function loadPosition(stage) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const { x, y } = JSON.parse(raw)
    if (typeof x !== 'number' || typeof y !== 'number') return false
    placeAt(stage, x, y)
    return true
  } catch { return false }
}

function savePosition(stage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: stage.offsetLeft, y: stage.offsetTop }))
  } catch {}
}

function showBubble(state, line) {
  state.bubble.textContent = line.text
  state.stage.dataset.mood = line.mood
  state.stage.dataset.bubble = 'visible'
  state.mood = line.mood
  if (state.timer) clearTimeout(state.timer)
  state.timer = setTimeout(() => {
    state.stage.dataset.bubble = 'hidden'
    state.timer = undefined
  }, BUBBLE_TIMEOUT_MS)
}

function cycleQuote(state) {
  const last = state.bubble.textContent || undefined
  showBubble(state, pickLine(state.mood, last))
}

/** Pick a random work mood — bubble colour and figure animation both follow it. */
function randomWorkMood() {
  return WORK_MOODS[Math.floor(Math.random() * WORK_MOODS.length)]
}

/** Show one random work bubble (colour + animation follow the picked mood). */
function showWorkBubble(state) {
  const mood = randomWorkMood()
  state.mood = mood
  state.stage.dataset.mood = mood
  cycleQuote(state)
}

/** Attach click/drag interactions to the pet stage. */
function attachInteractions(ctx, state) {
  const { stage } = state

  stage.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    stage.dataset.clicked = 'true'
    // In idle, clicking has a chance to randomly play one of the work moods
    // (colour + animation + line) instead of the milk-orange idle line.
    if (state.mood === 'idle' && Math.random() < SURPRISE_RATE) {
      showWorkBubble(state)
    } else {
      cycleQuote(state)
    }
    setTimeout(() => { delete stage.dataset.clicked }, 520)
  })

  // Pointer drag
  let dragging = false, origX = 0, origY = 0, px = 0, py = 0, moved = false
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    stage.setPointerCapture(e.pointerId)
    dragging = true
    moved = false
    stage.dataset.dragging = 'true'
    origX = stage.offsetLeft
    origY = stage.offsetTop
    px = e.clientX
    py = e.clientY
  })
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const dx = e.clientX - px, dy = e.clientY - py
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true
    placeAt(stage, origX + dx, origY + dy)
  })
  stage.addEventListener('pointerup', (e) => {
    if (!dragging) return
    dragging = false
    stage.releasePointerCapture(e.pointerId)
    delete stage.dataset.dragging
    if (moved) { savePosition(stage); e.stopPropagation() }
  })
  stage.addEventListener('pointercancel', () => {
    dragging = false
    delete stage.dataset.dragging
  })

  // Hover lift
  stage.addEventListener('pointerenter', () => { stage.dataset.hovering = 'true' })
  stage.addEventListener('pointerleave', () => { delete stage.dataset.hovering })

  // Global bubble clock: every WORK_TICK_MS a bubble may appear — a random work
  // bubble while a turn runs, a milk-orange idle bubble otherwise. State
  // transitions never fire a bubble themselves, so nothing pops out of rhythm.
  const bubbleClock = setInterval(() => {
    if (state.nonIdle) {
      showWorkBubble(state)
      return
    }
    // Outside the working window: let a finishing work bubble complete untouched.
    if (state.stage.dataset.bubble === 'visible') return
    if (state.mood !== 'idle' || state.stage.dataset.mood !== 'idle') {
      state.mood = 'idle'
      state.stage.dataset.mood = 'idle'
    }
    cycleQuote(state)
  }, WORK_TICK_MS)
  ctx.effect(() => () => clearInterval(bubbleClock), 'asuka-pet: bubble clock')
}

/** Apply — mount the pet onto the page. */
export function apply(ctx) {
  const body = document.body

  // Build marker — verify loaded bundle in console: document.body.dataset.asukaPetBuild
  body.dataset.asukaPetBuild = BUILD_VERSION

  ctx.effect(() => {
    const cleanup = () => {
      document.querySelectorAll('[data-asuka-pet]').forEach(el => el.remove())
    }
    return cleanup
  }, 'asuka-pet: cleanup')

  // Mount pet
  const pet = createPet()
  attachInteractions(ctx, pet)
  if (!loadPosition(pet.stage)) {
    // CSS handles default bottom-right position
  }
  body.append(pet.stage)

  // AT Field ring spans user submit → agent fully outputs.
  // Real DSH signals:
  //  - submitted:   composer input phase "submitting"/"adjudicating" right after
  //                 send (dsh-client-ui-conversation)
  //  - turn open:   running indicator — [data-chat-running] on the "Deep diving…"
  //                 row (dsh-client-ui-chat), mounted only while the session's
  //                 turn runs: covers first-token wait, thinking, tools, streaming.
  //                 Older builds rendered a bare [role="status"] directly under
  //                 [data-chat-flow]; that clause is kept so both DOM shapes light
  //                 the ring (see README 兼容性).
  //  - thinking:    reasoning block  [data-variant="think"][data-state="running"]
  //  - tool call:   any tool row while in flight — [data-variant] carries the tool
  //                 kind (bash/code/web/…, dsh-client-ui-tool) or "others"
  //                 (conversation command card) — all share [data-state="running"]
  //  - streaming:   assistant markdown root carrying [data-streaming]
  const sync = () => {
    const composer = document.querySelector("[data-phase='hero'], [data-phase='settling'], [data-phase='active']")
    const submitting = composer?.querySelector('[data-phase="submitting"], [data-phase="adjudicating"]') !== null
    const turnActive = composer?.querySelector('[data-chat-flow] > [role="status"], [data-chat-running]') !== null
    const thinking = composer?.querySelector('[data-variant="think"][data-state="running"]') !== null
    const busy = composer?.querySelector('[data-variant]:not([data-variant="think"])[data-state="running"]') !== null
    const streaming = composer?.querySelector('[data-streaming]') !== null
    const isRunning = submitting || turnActive || thinking || busy || streaming
    pet.stage.dataset.running = isRunning ? 'true' : 'false'

    if (isRunning && !pet.nonIdle) {
      // Entering the working window: just flip the flag — the bubble clock shows
      // the first work bubble on its next tick (no sudden bubble).
      pet.nonIdle = true
    } else if (!isRunning && pet.nonIdle) {
      // Working window over: flip back silently — the current bubble is allowed
      // to finish its display untouched; idle bubbles resume on the clock.
      pet.nonIdle = false
    }
  }
  sync()

  // Watch dsh state changes: attribute flips AND node mount/unmount
  // (the turn-status row appears/disappears without any attribute change).
  const obs = new MutationObserver(() => sync())
  obs.observe(body, {
    attributes: true,
    attributeFilter: ['data-phase', 'data-state', 'data-streaming'],
    childList: true,
    subtree: true,
  })

  ctx.effect(() => () => obs.disconnect(), 'asuka-pet: observer')
}
