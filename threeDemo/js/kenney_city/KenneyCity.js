import { createCamera } from '../../components/camera.js'
import { createScene } from '../../components/scene.js'
import { createLights } from '../../components/lights.js'

import { createControls } from '../../systems/controls.js'
import { createRenderer } from '../../systems/renderer.js'
import { Resizer } from '../../systems/Resizer.js'
import { Loop } from '../../systems/Loop.js'

// ?v= 用于绕过浏览器对旧版 loadCity.js 的启发式缓存（nginx 未设 Cache-Control）
import { loadCity } from './loadCity.js?v=3'
import { createCityLayout } from './cityLayout.js?v=3'

import { AxesHelper, Box3, GridHelper, Group, Vector3 } from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'

class KenneyCity {
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
    this.#camera.position.set(0, 8, 13)
    this.#camera.updateProjectionMatrix()

    const allModels = await loadCity()
    this.#scene.add(this.#buildCity(allModels))

    // 坐标系 + 网格（50 格 = 每格 0.4，和资产网格 CELL 一致）
    const axesHelper = new AxesHelper(10) // 红X绿Y蓝Z
    const gridHelper = new GridHelper(20, 50, 0xcccccc, 0xcccccc)
    this.#scene.add(axesHelper, gridHelper)
  }

  /**
   * 数据驱动摆放：
   * 1. 先量出每个部件的占地尺寸（每个模型只算一次包围盒）
   * 2. createCityLayout 产出一份纯数据 [{piece, x, z, rot}]
   * 3. 这里只负责按数据 clone + 落位，不关心城市长什么样
   */
  #buildCity(allModels) {
    // 1. 占地尺寸表 key -> { w, d }
    const sizes = {}
    for (const key in allModels) {
      const box = new Box3().setFromObject(allModels[key].scene)
      const size = box.getSize(new Vector3())
      sizes[key] = { w: size.x, d: size.z }
    }

    // 2. 布局数据
    const layout = createCityLayout(sizes)

    // 3. 按数据摆放
    const group = new Group()
    for (const item of layout) {
      const model = allModels[item.piece]
      if (!model) continue

      const piece = SkeletonUtils.clone(model.scene)
      piece.rotation.y = item.rot || 0

      // 部件原点居中、底面贴 y=0，把旋转后的包围盒中心对齐到 (x, z) 即可
      const box = new Box3().setFromObject(piece)
      const center = box.getCenter(new Vector3())
      piece.position.set(item.x - center.x, -box.min.y, item.z - center.z)

      group.add(piece)
    }

    // 整体居中，方便相机观察
    const cityCenter = new Box3().setFromObject(group).getCenter(new Vector3())
    group.position.set(-cityCenter.x, 0, -cityCenter.z)

    return group
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

export { KenneyCity }
