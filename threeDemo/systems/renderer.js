import { WebGLRenderer } from 'three'

function createRenderer() {
  const renderer = new WebGLRenderer({
    // canvas: document.getElementById('#threejs-app') // 默认会自动创建canvas容器
    antialias: true // 抗锯齿 让场景里的物体边缘轮廓尽量平滑 看情况决定是否开启 耗性能
  })

  return renderer
}

export { createRenderer }