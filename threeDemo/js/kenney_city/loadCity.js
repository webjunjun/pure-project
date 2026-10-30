import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Box3, Vector3 } from 'three'

// 参考的序列生成器函数的写法
// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/from#%E5%BA%8F%E5%88%97%E7%94%9F%E6%88%90%E5%99%A8%EF%BC%88range%EF%BC%89
function generateAlphabet(count, isLower = true) {
  const baseCode = isLower ? 97 : 65 // 小写: 97, 大写: 65
  // length 表示执行几次
  // _ 表示不传参 和 ts类似
  const arr = Array.from({
    length: count
  }, (_, index) => {
    return String.fromCharCode(baseCode + index)
  })

  return arr
}
async function loadCity() {
  const fbxLoader = new FBXLoader()
  const gltfLoader = new GLTFLoader()

  const models = {}

  // 批量加载模型
  const alphabet = generateAlphabet(21)
  alphabet.forEach((letter, index) => {
    models['buildingType_' + letter] = {
      url: '/assets/glb/kenney_city/Models/GLB format/building-type-' + letter + '.glb',
      gltf: ''
    }
  })

  for (const key in models) {
    if (Object.prototype.hasOwnProperty.call(models, key)) {
      models[key].gltf = await gltfLoader.loadAsync(models[key].url)
    }
  }

  // const box = new Box3().setFromObject(models.buildingType_a.gltf.scene)
  // const boxSize = box.getSize(new Vector3()).length()
  // const boxCenter = box.getCenter(new Vector3())
  // console.log(boxSize)
  // console.log(boxCenter)

  return models
}

export { loadCity }
