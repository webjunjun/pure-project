/**
 * 数据驱动的城市布局
 *
 * 布局就是一份纯数据数组：[{ piece, x, z, rot }]
 *  - piece: 模型 key（loadCity 返回的键名，如 buildingTypeA / fence1x2 / treeLarge）
 *  - x/z:   部件占地中心的世界坐标（y 由摆放逻辑自动贴地）
 *  - rot:   绕 Y 轴旋转，只取 90° 的整数倍，保证边缘始终对齐网格
 *
 * 这套资产的最小网格 CELL = 0.4（实测 fence-1x2 -> fence-1x3 宽度差正好 0.4），
 * 所有部件都原点居中、底面贴 y=0，所以数据里只需要描述「放哪个、放哪、转多少」。
 */

const CELL = 0.4
const HALF = Math.PI / 2

// 可复现的随机数（mulberry32），同样的种子每次生成同一座城市
function createRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 部件旋转后的占地尺寸（rot 为 90°/270° 时宽高互换）
function footprint(sizes, piece, rot = 0) {
  const { w, d } = sizes[piece]
  return Math.abs(Math.sin(rot)) > 0.5 ? { w: d, d: w } : { w, d }
}

// 沿街排一排楼房：从 from 排到 to，正面朝 edgeZ 一侧（side: -1 北侧 / +1 南侧）
function buildingRow({ sizes, rand, from, to, edgeZ, side }) {
  const types = Object.keys(sizes).filter(k => k.startsWith('buildingType'))
  const items = []
  let x = from

  while (x < to) {
    const piece = types[Math.floor(rand() * types.length)]
    const { w, d } = footprint(sizes, piece, 0)
    items.push({
      piece,
      x: x + w / 2,
      z: edgeZ + side * (d / 2),
      rot: side === 1 ? Math.PI : 0
    })
    x += w // 边缘紧贴下一块
  }

  return items
}

// 沿一条直线铺栅栏：从 from 贪心填充到 to，优先用长段
function fenceRun({ sizes, layout, from, to, at, axis }) {
  const pieces = ['fence1x4', 'fence1x3', 'fence1x2', 'fence']
  const rot = axis === 'z' ? HALF : 0
  let cursor = from

  while (cursor < to) {
    const piece = pieces.find(p => sizes[p] && footprint(sizes, p, rot).w <= to - cursor + 0.02)
    if (!piece) break

    const { w } = footprint(sizes, piece, rot)
    const c = cursor + w / 2
    layout.push(axis === 'x'
      ? { piece, x: c, z: at, rot }
      : { piece, x: at, z: c, rot })
    cursor += w
  }
}

function createCityLayout(sizes) {
  const rand = createRandom(2026)
  const pick = arr => arr[Math.floor(rand() * arr.length)]
  const layout = []

  // ---- 主干道：pathLong 旋转 90° 后每块占 0.4(X) x 0.2(Z)，横穿全城 ----
  for (let x = -4.4; x <= 4.4; x += CELL) {
    layout.push({ piece: 'pathLong', x, z: 0, rot: HALF })
  }

  // ---- 北侧街区：一整排紧挨的楼房，正面朝主路 ----
  layout.push(...buildingRow({ sizes, rand, from: -4.4, to: 4.4, edgeZ: -0.35, side: -1 }))

  // ---- 主路南侧的行道树 + 花箱 ----
  for (let x = -4.0; x <= 4.0; x += 1.6) {
    layout.push({ piece: rand() < 0.5 ? 'treeLarge' : 'treeSmall', x, z: 0.25, rot: 0 })
  }

  // ---- 南侧中部：短排楼房 ----
  layout.push(...buildingRow({ sizes, rand, from: -1.4, to: 1.0, edgeZ: 0.35, side: 1 }))

  // ---- 东南：带围栏的独栋院落 ----
  // 院落范围 x:[1.2,4.4] z:[0.6,2.8]，正面 z=0.6 处留 0.4 宽的缺口接车道
  fenceRun({ sizes, layout, from: 1.2, to: 1.8, at: 0.6, axis: 'x' })
  fenceRun({ sizes, layout, from: 2.2, to: 4.4, at: 0.6, axis: 'x' })
  fenceRun({ sizes, layout, from: 0.6, to: 2.8, at: 1.2, axis: 'z' })
  fenceRun({ sizes, layout, from: 0.6, to: 2.8, at: 4.4, axis: 'z' })
  fenceRun({ sizes, layout, from: 1.2, to: 4.4, at: 2.8, axis: 'x' })
  layout.push({ piece: 'drivewayLong', x: 2.0, z: 0.6, rot: 0 }) // 车道穿过缺口
  layout.push({ piece: pick(['buildingTypeK', 'buildingTypeL', 'buildingTypeR']), x: 2.9, z: 1.8, rot: Math.PI })
  layout.push({ piece: 'treeSmall', x: 1.7, z: 2.4, rot: 0 })
  layout.push({ piece: 'treeLarge', x: 4.0, z: 1.0, rot: 0 })
  layout.push({ piece: 'planter', x: 2.5, z: 2.5, rot: 0 })

  // ---- 西南：小公园（汀步小路 + 随机树阵 + 边缘花箱）----
  // 公园范围 x:[-4.4,-1.6] z:[0.6,3.0]
  for (let i = 0; i < 4; i++) {
    layout.push({
      piece: pick(['pathStonesLong', 'pathStonesMessy', 'pathStonesShort']),
      x: -4.0 + rand() * 2.2,
      z: 0.9 + rand() * 1.8,
      rot: pick([0, HALF, Math.PI, -HALF])
    })
  }
  for (let x = -4.1; x <= -1.7; x += 0.7) {
    for (let z = 0.8; z <= 2.9; z += 0.8) {
      if (rand() < 0.55) {
        layout.push({ piece: rand() < 0.5 ? 'treeLarge' : 'treeSmall', x, z, rot: 0 })
      }
    }
  }
  for (let x = -4.2; x <= -1.8; x += 0.8) {
    layout.push({ piece: 'planter', x, z: 0.55, rot: 0 })
  }

  return layout
}

export { createCityLayout, CELL }
