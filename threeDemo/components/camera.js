import { PerspectiveCamera } from 'three'

function createCamera() {
  // 创建一个相机 视野角度（相机的视野宽度） 长宽比 近截面 远截面
  const fov = 35
  const aspect = 1 // 这是一个默认值，实际值在Resizer类里设置
  const near = 0.1
  const far = 100
  const camera = new PerspectiveCamera(fov, aspect, near, far)

  // 每个图元添加到场景时，默认坐标是(0, 0, 0) 让相机稍稍往外移动，这样可以看见图元
  camera.position.set(0, 0, 10)
  // 默认相机的焦点对着的是(0, 0, 0)
  // camera.lookAt(0, 0, 0)

  // 相机的运动函数 如果将它加入循环类 可以定时变化相机位置
  camera.tick = (delta) => {
    camera.position.z -= -0.01 * delta
  }

  return camera
}

export { createCamera }