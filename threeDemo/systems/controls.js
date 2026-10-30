import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true // 启用阻尼以增加真实感

  // 更新动画循环中的控件
  controls.tick = () => controls.update()

  /**
   * 当我们在threejs里启用该插件时，该插件会接管摄像机的postion和lookat属性
   * 所以我们在操作平移、缩小、变换等操作时，会影响postion的值
   * 当我们使用target改变焦点时，会影响lookat的值
   */
  return controls
}

export { createControls }