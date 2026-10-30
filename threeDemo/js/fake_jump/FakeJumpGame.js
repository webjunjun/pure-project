import { createScene } from '../../components/scene.js'
import { createLights } from '../../components/lights.js'
import { createRenderer } from '../../systems/renderer.js'
import { Loop } from '../../systems/Loop.js'

import { BoxGeometry, Color, Mesh, MeshLambertMaterial, OrthographicCamera, Vector3 } from 'three'

// 游戏状态机
const State = {
  IDLE: 'idle',        // 等待按下
  CHARGING: 'charging',// 按住蓄力
  JUMPING: 'jumping',  // 抛物线飞行
  FALLING: 'falling',  // 失误倾倒/下坠
  OVER: 'over'         // 游戏结束
}

class FakeJumpGame {
  #camera
  #scene
  #renderer
  #loop
  #container
  #cubeGeometry
  #jumperGeometry
  #jumperMaterial
  #audioCtx = null
  #chargeOsc = null
  #toastTimer = 0

  // 与原 js/game.js 一致的尺寸/手感参数
  config = {
    background: 0x282828,
    ground: -1,            // 地面 y 坐标
    cubeWidth: 4,
    cubeHeight: 2,
    cubeDeep: 4,
    jumperColor: 0x232323,
    jumperWidth: 1,
    jumperHeight: 2,
    jumperDeep: 1
  }

  // 每帧步长（60fps 基准 与原实现相同）
  step = {
    chargeScale: 0.01,   // 蓄力每帧压缩量
    chargeX: 0.004,      // 蓄力每帧水平速度增量
    chargeY: 0.008,      // 蓄力每帧垂直速度增量
    gravity: 0.01,       // 起跳后每帧垂直速度衰减
    recover: 0.1,        // 起跳后每帧恢复形变量
    rotate: 0.1,         // 倾倒每帧旋转角
    drop: 0.2,           // 落地每帧下落距离
    camera: 0.1          // 镜头跟随每帧移动量
  }

  score = 0
  cubes = []
  state = State.IDLE
  speed = { x: 0, y: 0 }         // 蓄力得到的起跳速度
  falled = { location: -1, distance: 0 }
  fall = null                    // 倾倒动画参数
  cameraPros = { current: new Vector3(), next: new Vector3() }

  constructor(container) {
    this.#container = container
    this.#scene = createScene()
    this.#scene.background = new Color(this.config.background)

    // 正交相机 保证等距视角下远近物体大小一致
    this.#camera = new OrthographicCamera(-1, 1, 1, -1, 0, 5000)
    this.#camera.position.set(100, 100, 100)
    this.#camera.lookAt(this.cameraPros.current)

    this.#renderer = createRenderer()
    // 高分屏下保持画面清晰
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.append(this.#renderer.domElement)

    this.#loop = new Loop(this.#camera, this.#scene, this.#renderer)

    // 几何全场共享 材质按方块单独创建（颜色不同）移除时释放
    const { cubeWidth, cubeHeight, cubeDeep, jumperWidth, jumperHeight, jumperDeep, jumperColor } = this.config
    this.#cubeGeometry = new BoxGeometry(cubeWidth, cubeHeight, cubeDeep)
    this.#jumperGeometry = new BoxGeometry(jumperWidth, jumperHeight, jumperDeep)
    // 几何整体上移 使 position.y 表示块底面 便于压扁动画从底部收缩
    this.#jumperGeometry.translate(0, jumperHeight / 2, 0)
    this.#jumperMaterial = new MeshLambertMaterial({ color: jumperColor })

    const { ambientLight, mainLight } = createLights()
    mainLight.intensity = 1.1
    mainLight.position.set(2, 10, 5)
    ambientLight.intensity = 0.3
    this.#scene.add(ambientLight, mainLight)

    // 游戏逻辑由主循环驱动 不再各自递归 requestAnimationFrame
    this.#loop.updatables.push({ tick: (delta) => this.#tick(delta) })

    window.addEventListener('resize', () => this.#handleResize())
  }

  init() {
    this.#bindUI()
    this.#bindPointer()
    this.#handleResize()
    this.#createCube()
    this.#createCube()
    this.#createJumper()
  }

  start() {
    this.#loop.start()
  }

  stop() {
    this.#loop.stop()
  }

  // ---------- UI ----------

  #bindUI() {
    this.maskEl = document.querySelector('.mask')
    this.finalScoreEl = document.querySelector('.score')
    this.currentScoreEl = document.querySelector('.current-score')
    this.toastEl = document.querySelector('.toast')
    document.querySelector('.restart').addEventListener('click', () => this.#restart())
  }

  #bindPointer() {
    const canvas = this.#renderer.domElement
    // Pointer 事件同时支持鼠标和触摸
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (this.state === State.IDLE) {
        this.state = State.CHARGING
        this.#ensureAudio()
        this.#startChargeSound()
      }
    })
    // 松开/取消绑定在 window 上 防止指针移出画布后松开导致一直蓄力
    const release = () => {
      if (this.state === State.CHARGING) {
        this.state = State.JUMPING
        this.#stopChargeSound()
        this.#blip({ freq: 420, end: 760, dur: 0.15 })
      }
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  }

  // ---------- 主循环 ----------

  #tick(delta) {
    // 以 60fps 为基准换算步长系数 保证不同刷新率下手感一致
    // 上限 3：标签页切回时 delta 可能很大 避免跳块瞬移
    const k = Math.min(delta * 60, 3)
    switch (this.state) {
      case State.CHARGING: this.#stepCharge(k); break
      case State.JUMPING: this.#stepJump(k); break
      case State.FALLING: this.#stepFall(k); break
    }
    this.#stepCamera(k)
  }

  // 蓄力：跳块被压扁 起跳速度随之增加
  #stepCharge(k) {
    if (this.jumper.scale.y > 0.02) {
      this.jumper.scale.y = Math.max(0.02, this.jumper.scale.y - this.step.chargeScale * k)
      this.#applySquash()
      this.speed.x += this.step.chargeX * k
      this.speed.y += this.step.chargeY * k
      this.#updateChargeSound()
    }
  }

  // 压扁时横向膨胀 近似体积守恒 更有"面团"感
  #applySquash() {
    const sxz = 1 + (1 - this.jumper.scale.y) * 0.6
    this.jumper.scale.x = sxz
    this.jumper.scale.z = sxz
  }

  // 飞行：水平匀速 + 垂直方向先升后降 直到落回块顶高度
  #stepJump(k) {
    if (this.jumper.position.y >= 1) {
      if (this.jumper.scale.y < 1) {
        this.jumper.scale.y = Math.min(1, this.jumper.scale.y + this.step.recover * k)
        this.#applySquash()
      }
      if (this.nextDir === 'left') {
        this.jumper.position.x -= this.speed.x * k
      } else {
        this.jumper.position.z -= this.speed.x * k
      }
      this.jumper.position.y += this.speed.y * k
      this.speed.y -= this.step.gravity * k
    } else {
      // 落地
      this.jumper.position.y = 1
      this.jumper.scale.set(1, 1, 1)
      this.speed.x = 0
      this.speed.y = 0
      this.#checkInCube()
      if (this.falled.location === 1) {
        // 成功落在下一个块上 正中靶心为 Perfect
        const perfect = this.falled.distance < 0.6
        this.score += perfect ? 2 : 1
        this.currentScoreEl.textContent = this.score
        if (perfect) {
          this.#showToast('Perfect +2')
          this.#blip({ freq: 660, end: 880, dur: 0.1 })
          this.#blip({ freq: 990, end: 1320, dur: 0.2 })
        } else {
          this.#blip({ freq: 620, end: 820, dur: 0.12 })
        }
        this.#createCube()
        this.state = State.IDLE
      } else if (this.falled.location === -1) {
        // 落回当前块中心 不得分但可继续
        this.state = State.IDLE
        this.#blip({ freq: 220, end: 160, dur: 0.12, type: 'triangle' })
      } else {
        this.#prepareFall()
        this.state = State.FALLING
      }
    }
  }

  // 判定落点：1 下一块中心 10 下一块边缘 -1 当前块中心 -10 当前块边缘 0 悬空
  #checkInCube() {
    const { jumperWidth, cubeWidth } = this.config
    const should = (jumperWidth + cubeWidth) / 2
    const cur = this.cubes[this.cubes.length - 2]
    const next = this.cubes[this.cubes.length - 1]
    const axis = this.nextDir === 'left' ? 'x' : 'z'
    const distanceCur = Math.abs(this.jumper.position[axis] - cur.position[axis])
    const distanceNext = Math.abs(this.jumper.position[axis] - next.position[axis])
    if (distanceCur < should) {
      this.falled.distance = distanceCur
      this.falled.location = distanceCur < cubeWidth / 2 ? -1 : -10
    } else if (distanceNext < should) {
      this.falled.distance = distanceNext
      this.falled.location = distanceNext < cubeWidth / 2 ? 1 : 10
    } else {
      this.falled.location = 0
    }
  }

  // 预计算倾倒动画参数（原实现每帧重复判断方向 这里一次算清）
  #prepareFall() {
    const { ground, jumperWidth, cubeWidth } = this.config
    const next = this.cubes[this.cubes.length - 1]
    const offset = this.falled.distance - cubeWidth / 2
    const fallingTo = ground + jumperWidth / 2 + offset
    const dir = (() => {
      if (this.falled.location === 10) {
        if (this.nextDir === 'left') {
          return this.jumper.position.x > next.position.x ? 'leftBottom' : 'leftTop'
        }
        return this.jumper.position.z > next.position.z ? 'rightBottom' : 'rightTop'
      }
      if (this.falled.location === -10) {
        return this.nextDir === 'left' ? 'leftTop' : 'rightTop'
      }
      return 'none'
    })()

    if (dir === 'none') {
      this.fall = { axis: null, step: 0, fallingTo: ground }
      return
    }
    const axis = dir.includes('left') ? 'z' : 'x'
    // 负方向倾倒从边缘向外翻 正方向反之
    const sign = (dir === 'rightTop' || dir === 'leftBottom') ? -1 : 1
    this.fall = { axis, step: sign * this.step.rotate, fallingTo }
  }

  #stepFall(k) {
    const f = this.fall
    if (f.axis) {
      const limit = f.step > 0 ? Math.PI / 2 : -Math.PI / 2
      const next = this.jumper.rotation[f.axis] + f.step * k
      const reached = f.step > 0 ? next >= limit : next <= limit
      this.jumper.rotation[f.axis] = reached ? limit : next
      if (!reached) {
        return
      }
    }
    if (this.jumper.position.y > f.fallingTo) {
      this.jumper.position.y = Math.max(f.fallingTo, this.jumper.position.y - this.step.drop * k)
    } else {
      this.state = State.OVER
      this.#blip({ freq: 300, end: 70, dur: 0.5, type: 'sawtooth', gain: 0.1 })
      this.finalScoreEl.textContent = this.score
      this.maskEl.style.display = 'flex'
    }
  }

  // 镜头跟随最后两个块的中心点平移
  #stepCamera(k) {
    const cur = this.cameraPros.current
    const next = this.cameraPros.next
    if (cur.x > next.x || cur.z > next.z) {
      cur.x -= this.step.camera * k
      cur.z -= this.step.camera * k
      if (cur.x - next.x < 0.05) {
        cur.x = next.x
      } else if (cur.z - next.z < 0.05) {
        cur.z = next.z
      }
    }
    this.#camera.lookAt(cur.x, 0, cur.z)
  }

  // ---------- 音效与提示 ----------

  // 首次按下时创建 WebAudio 上下文（浏览器要求用户手势后才能出声）
  #ensureAudio() {
    if (!this.#audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      this.#audioCtx = new Ctx()
    }
    if (this.#audioCtx.state === 'suspended') {
      this.#audioCtx.resume().catch(() => {})
    }
  }

  // 短促提示音 频率从 freq 滑向 end
  #blip({ freq = 440, end = freq, dur = 0.12, type = 'sine', gain = 0.15 } = {}) {
    if (!this.#audioCtx) return
    const t = this.#audioCtx.currentTime
    const osc = this.#audioCtx.createOscillator()
    const g = this.#audioCtx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.linearRampToValueAtTime(end, t + dur)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g).connect(this.#audioCtx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  // 蓄力持续音 音调随蓄力加深上升 给玩家"越按越紧"的反馈
  #startChargeSound() {
    if (!this.#audioCtx) return
    this.#stopChargeSound()
    const osc = this.#audioCtx.createOscillator()
    const g = this.#audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 180
    g.gain.value = 0.06
    osc.connect(g).connect(this.#audioCtx.destination)
    osc.start()
    this.#chargeOsc = osc
  }

  #updateChargeSound() {
    if (this.#chargeOsc) {
      this.#chargeOsc.frequency.value = 180 + this.speed.x * 500
    }
  }

  #stopChargeSound() {
    if (this.#chargeOsc) {
      try {
        this.#chargeOsc.stop()
      } catch (e) { /* 已停止 */ }
      this.#chargeOsc = null
    }
  }

  #showToast(text) {
    if (!this.toastEl) return
    this.toastEl.textContent = text
    this.toastEl.classList.add('show')
    clearTimeout(this.#toastTimer)
    this.#toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), 800)
  }

  // ---------- 场景对象 ----------

  #createCube() {
    // 每个方块随机柔和色 材质单独创建
    const cube = new Mesh(this.#cubeGeometry, new MeshLambertMaterial({
      color: new Color().setHSL(Math.random(), 0.45, 0.72)
    }))
    if (this.cubes.length) {
      const last = this.cubes[this.cubes.length - 1]
      cube.position.copy(last.position)
      this.nextDir = Math.random() > 0.5 ? 'left' : 'right'
      const gap = Math.round(Math.random() * 4 + 6)
      if (this.nextDir === 'left') {
        cube.position.x -= gap
      } else {
        cube.position.z -= gap
      }
    }
    this.cubes.push(cube)
    // 场景里最多保留 5 个块
    if (this.cubes.length > 5) {
      const old = this.cubes.shift()
      this.#scene.remove(old)
      old.material.dispose()
    }
    this.#scene.add(cube)
    if (this.cubes.length > 1) {
      this.#updateCameraPros()
    }
  }

  #createJumper() {
    this.jumper = new Mesh(this.#jumperGeometry, this.#jumperMaterial)
    this.jumper.position.y = 1
    this.#scene.add(this.jumper)
  }

  #updateCameraPros() {
    const a = this.cubes[this.cubes.length - 1].position
    const b = this.cubes[this.cubes.length - 2].position
    this.cameraPros.next = new Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2)
  }

  // ---------- 尺寸与重开 ----------

  #handleResize() {
    const width = this.#container.clientWidth || window.innerWidth
    const height = this.#container.clientHeight || window.innerHeight
    // 与原实现一致 以 80 为视锥缩放系数
    this.#camera.left = width / -80
    this.#camera.right = width / 80
    this.#camera.top = height / 80
    this.#camera.bottom = height / -80
    this.#camera.updateProjectionMatrix()
    this.#renderer.setSize(width, height)
  }

  #restart() {
    this.#scene.remove(this.jumper)
    this.cubes.forEach(cube => {
      this.#scene.remove(cube)
      cube.material.dispose()
    })
    this.cubes = []
    this.score = 0
    this.currentScoreEl.textContent = '0'
    this.speed = { x: 0, y: 0 }
    this.fall = null
    this.nextDir = ''
    this.cameraPros.current = new Vector3(0, 0, 0)
    this.cameraPros.next = new Vector3(0, 0, 0)
    this.maskEl.style.display = 'none'
    this.#createCube()
    this.#createCube()
    this.#createJumper()
    this.state = State.IDLE
  }
}

export { FakeJumpGame }
