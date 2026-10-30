import { Color, Scene } from 'three'

function createScene() {
  // 创建一个场景
  const scene = new Scene()

  // 设置场景的背景色
  scene.background = new Color('skyblue')

  return scene
}

export { createScene }