import { createCamera } from '../../components/camera.js'
import { createScene } from '../../components/scene.js'
import { createLights } from '../../components/lights.js'

import { createControls } from '../../systems/controls.js'
import { createRenderer } from '../../systems/renderer.js'
import { Resizer } from '../../systems/Resizer.js'
import { Loop } from '../../systems/Loop.js'

import { AxesHelper, GridHelper } from 'three'

class FakeJumpGame {
  #camera;
  #scene;
  #renderer;
  #loop;
  #controls;

  constructor(container) {
    this.#camera = createCamera()
    this.#scene = createScene()
    this.#renderer = createRenderer()
    this.#loop = new Loop(this.#camera, this.#scene, this.#renderer)
    container.append(this.#renderer.domElement)

    this.#controls = createControls(this.#camera, this.#renderer.domElement)
    this.#controls.enablePan = false

    const resizer = new Resizer(container, this.#camera, this.#renderer)

    const { ambientLight, mainLight } = createLights()

    this.#loop.updatables.push(this.#controls)
    this.#scene.add(ambientLight, mainLight)
  }

  async init() {
    this.#camera.position.set(0, 0, 20)
    this.#camera.updateProjectionMatrix()
    
    // 坐标系 + 网格
    const axesHelper = new AxesHelper(10) // 红X绿Y蓝Z
    const gridHelper = new GridHelper(20, 20, 0xcccccc, 0xcccccc) // 20x20网格
    this.#scene.add(axesHelper, gridHelper)
  }

  render() {
    this.#renderer.render(this.#scene, this.#camera)
  }

  start() {
    this.#loop.start()
  }

  stop() {
    this.#loop.stop()
  }
}

export { FakeJumpGame }
