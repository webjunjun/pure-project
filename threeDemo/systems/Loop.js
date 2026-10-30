import { Clock } from 'three'

class Loop {
  constructor(camera, scene, renderer) {
    this.camera = camera
    this.scene = scene
    this.renderer = renderer
    this.updatables = [] // 需要更新的图元对象列表
    this.clock = new Clock()
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      this.tick() // 更新帧
      this.renderer.clear() // 清除已渲染的帧
      this.renderer.render(this.scene, this.camera) // 渲染新的帧
    })
  }

  stop() {
    this.renderer.setAnimationLoop(null)
  }

  tick() {
    // 将帧率和动画速度解耦
    const delta = this.clock.getDelta()

    for (const item of this.updatables) {
      // 每个动画对象暴露一个自定义的tick方法 供循环类更新帧时调用以便进行新的渲染
      item.tick(delta)
    }
  }
}

export { Loop }