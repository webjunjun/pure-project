import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

async function loadHouseGltf() {
  const loader = new GLTFLoader()
  // 解码 EXT_meshopt_compression 压缩的几何数据
  loader.setMeshoptDecoder(MeshoptDecoder)

  // Meshopt 压缩后的单文件 GLB（几何数据压缩、贴图内嵌，图元名称已写入模型）
  const houseData = await loader.loadAsync('/assets/glb/house/scene_meshopt.glb')

  // 缩放该房子尺寸到合适大小
  houseData.scene.scale.set(0.01, 0.01, 0.01)

  /**
   * 模型加载后的数据格式
   * animations：模型的运动动画 无为空
   * assets：此glTF文件的元数据
   * cameras：模型里的摄像机 无为空
   * parser：模型的技术细节
   * scene：包含模型里所有图元的group 单场景
   * scenes：有的模型可能存储了多个场景 很少见 
   * userData：额外的非标准的数据
   * 
   * 通常只需关心animations、cameras和scene
   */
  return houseData.scene
}

export { loadHouseGltf }
