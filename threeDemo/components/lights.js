import { AmbientLight, DirectionalLight, HemisphereLight } from 'three'

function createLights() {
  // 创建一个白色平行光，亮度为8 默认亮度是1
  const mainLight = new DirectionalLight('white', 0.6)

  const ambientLight = new AmbientLight('white', 1)

  // 设置光的位置
  mainLight.position.set(10, 10, 10)
  // 光默认照向的目标位置是(0, 0, 0)
  // light.target.position(0, 0, 0)

  // 以下是灯光的运动空方法
  mainLight.tick = (delta) => {}

  ambientLight.tick = (delta) => {}

  return { mainLight, ambientLight }
}

export { createLights }