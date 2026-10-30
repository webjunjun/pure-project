import { CubeTextureLoader } from 'three'

// 设置场景背景
function createSkyBox(scene, path) {
  // 右 左 上 下 后 前(相对于人看屏幕的视角)
  let sides = [
    path + 'posx.jpg',
    path + 'negx.jpg',
    path + 'posy.jpg',
    path + 'negy.jpg',
    path + 'posz.jpg',
    path + 'negz.jpg'
  ]
  let skyCube = new CubeTextureLoader().load( sides )
  scene.background = skyCube
}

export { createSkyBox }
