import { MeshBasicMaterial, CircleGeometry, Mesh } from 'three'

// 创建一个半透明的灰色得圆环 当鼠标在模型里移动时 展示一个圆环显示当前鼠标得位置
function createMouseCircle() {
  const circleMat = new MeshBasicMaterial({
    color: '#eeeeee',
    transparent: true,
    opacity: 0.5
  })
  const circleGeo = new CircleGeometry(1, 32)
  const circle = new Mesh(circleGeo, circleMat)
  circle.rotation.x = -Math.PI / 2
  circle.position.set(0, 0, 0)
  circle.visible = false

  return circle
}

export { createMouseCircle }