import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const BASE_URL = '/assets/glb/kenney_city/Models/GLB format/'

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

// 全部部件的文件名：楼房 a~u + 栅栏/道路/车道/植物等小部件
const BUILDING_NAMES = generateAlphabet(21).map(l => 'building-type-' + l)
const PROP_NAMES = [
  'driveway-long', 'driveway-short',
  'fence', 'fence-low', 'fence-1x2', 'fence-1x3', 'fence-1x4',
  'fence-2x2', 'fence-2x3', 'fence-3x2', 'fence-3x3',
  'path-long', 'path-short',
  'path-stones-long', 'path-stones-messy', 'path-stones-short',
  'planter', 'tree-large', 'tree-small'
]

// 'building-type-a' -> 'buildingTypeA'，'fence-1x2' -> 'fence1x2'
function toKey(name) {
  return name.replace(/-(\w)/g, (_, c) => c.toUpperCase())
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Windows 版 nginx 对浏览器请求很不稳定（curl 正常，浏览器随机 net::ERR_ABORTED），
// 所以：串行加载 + 失败多轮重试，重试时加查询参数强制发起全新请求（不复用已损坏的连接）
async function loadCity({ concurrency = 1, retries = 4, retryDelay = 600 } = {}) {
  const gltfLoader = new GLTFLoader()
  const models = {}
  let pending = [...BUILDING_NAMES, ...PROP_NAMES]

  for (let round = 0; round <= retries && pending.length; round++) {
    if (round > 0) await sleep(retryDelay)

    const current = pending
    const failed = []
    const suffix = round > 0 ? '?retry=' + round : ''

    for (let i = 0; i < current.length; i += concurrency) {
      const batch = current.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        batch.map(name => gltfLoader.loadAsync(BASE_URL + name + '.glb' + suffix))
      )
      results.forEach((r, j) => {
        if (r.status === 'fulfilled') {
          models[toKey(batch[j])] = r.value
        } else {
          failed.push(batch[j])
        }
      })
    }

    if (failed.length) {
      console.warn(`[loadCity] 第 ${round + 1} 轮失败 ${failed.length} 个:`, failed.join(','))
    }
    pending = failed
  }

  if (pending.length) {
    console.error('[loadCity] 多轮重试后仍失败:', pending)
  }

  return models
}

export { loadCity }
