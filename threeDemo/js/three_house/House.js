
import { createCamera } from '../../components/camera.js'
import { createScene } from '../../components/scene.js'
import { createLights } from '../../components/lights.js'
import { getMousePosition } from '../../components/mousePosition.js'
import { createMouseCircle } from '../../components/mouseCircle.js'

import { createControls } from '../../systems/controls.js'
import { createRenderer } from '../../systems/renderer.js'
import { Resizer } from '../../systems/Resizer.js'
import { Loop } from '../../systems/Loop.js'
import { PickHelper } from '../../systems/PickHelper.js'

import { createSkyBox } from './skybox.js'
import { loadHouseGltf } from './loadHouseGltf.js'

import { Vector2, Vector3, AxesHelper, GridHelper } from 'three'
import { Tween, Group } from '@tweenjs/tween.js'

// GLTFLoader 的 createUniqueName 会把重名节点改名为 floor_1、sofa_2 等
// 去掉末尾的 _数字 后缀得到基础名，用于统一匹配图元
function baseName(name) {
  return (name || '').replace(/_\d+$/, '')
}

class House {
  #camera;
  #scene;
  #renderer;
  #loop;
  #controls;
  // 拾取对象和鼠标向量 用于绑定事件
  #mouse;
  #picker;
  // 案例需要的参数
  houseObjects = [];
  mouseCircle;
  targetVector;
  tooltipInfo;
  tooltipObj = document.querySelector('#tooltip');
  tweenObj = {};

  // container：塞进页面哪个DOM元素
  constructor(container) {
    this.#camera = createCamera()
    this.#scene = createScene()
    this.#renderer = createRenderer()
    this.#loop = new Loop(this.#camera, this.#scene, this.#renderer)
    container.append(this.#renderer.domElement)

    this.#picker = new PickHelper()
    this.#mouse = new Vector2()
    this.mouseCircle = createMouseCircle()

    this.#controls = createControls(this.#camera, this.#renderer.domElement)
    // 禁用摄像机平移 使用鼠标右键可以平移摄像机
    this.#controls.enablePan = false
    // 在threejs里坐标轴的单位是通常是米
    // 设置maxDistance、minDistance，限制摄像机位置距离视点的最大值最小值，再结合视点位置
    // 此处可确保始终只能看到房子内部 而不会看到房子顶部、底部等外部情形
    // 向内移动 相当于放大 表示摄像机位置离视点最近不超过9米
    this.#controls.minDistance = 9
    // 向外移动 相当于缩小 表示摄像机位置离视点最远不超过14米
    this.#controls.maxDistance = 14
    // 按需渲染
    // 主方法调用render而不是start时使用
    // 但是这时候纹理还没有加载，所以图元是黑色的
    // 因此我们需要再生成一个新帧，resize时一样需要手动渲染一个新帧
    // https://threejs.org/manual/#zh/rendering-on-demand
    // 按官网给的思路，先使用默认的先让渲染器canvas使用默认的宽高渲染
    // 然后我们适配设备的宽高比，再渲染一次就可以了
    // this.#controls.addEventListener('change', () => {
    //   this.render()
    //   // 通过打印摄像机的位置 可以帮助我们初始化时设置摄像机的postion的Y值 便于更好的展示我们的场景
    //   // 其余的两轴的值靠点击事件判断 见下面的点击事件
    //   console.log(this.#camera.position)
    // })

    const resizer = new Resizer(container, this.#camera, this.#renderer)

    const { ambientLight, mainLight } = createLights()

    // 将在更新循环的每一帧中调用 确保摄像机控制插件阻尼起作用，增加真实感
    this.#loop.updatables.push(this.#controls)

    // 往场景里添加图元的顺序会影响图元的ID，切记注意
    this.#scene.add(ambientLight, mainLight, this.mouseCircle)
  }

  async init() {
    this.#camera.fov = 60
    this.#camera.far = 20000
    this.#camera.position.set(4, 15, -32)
    this.#camera.updateProjectionMatrix()

    createSkyBox(this.#scene, '/assets/skybox/')
    const house = await loadHouseGltf()
    this.#scene.add(house)
    // Object3D.traverse：用于遍历场景或对象的层级结构
    // 遍历得到房子里的图元，便于鼠标悬停展示具体的图元名称等操作
    // 这里其实可以不需要递归 直接将模型给射线追踪检测是否有交集也是可以的
    // 当然 如果检测交集来自多个模型 有的模型需要检测有的不需要 那确实需要递归到一个统一的数组对象里
    // house.traverse((child) => {
    //   if (child.isMesh) {
    //     this.houseObjects.push(child)
    //   }
    // })
    this.houseObjects = [house]

    // 创建一个不可见的三维向量点 用于确保摄像机控件的视点一直在我们画面的正前方
    this.targetVector = new Vector3(4, 15, -18)

    this.#controls.tick = () => {
      // 修改摄像机控件OrbitControls的target属性 从而改变摄像机的lookAt视点
      // 但是直接修改摄像机的lookAt视点 并不会影响摄像机控件OrbitControls的target属性
      this.#controls.target.copy(this.targetVector)
      this.#controls.update()
    }

    // 坐标系 + 网格
    // const axesHelper = new AxesHelper(100) // 红X绿Y蓝Z
    // const gridHelper = new GridHelper(20, 20, 0xcccccc, 0xcccccc) // 20x20网格
    // this.#scene.add(axesHelper, gridHelper)

    this.initTooltip()

    this.addAnimateUpdate()
  }

  render() {
    this.#renderer.render(this.#scene, this.#camera)
  }

  start() {
    this.#loop.start()
  }

  stop() {
    this.#loop.stop()
  }

  addAnimateUpdate() {
    // 放在所有运动物体的添加后执行 这样补间动画就在最后执行
    this.tweenObj.group = new Group()
    this.tweenObj.tick = () => {
      // tween更新
      this.tweenObj.group.update()
    }
    this.#loop.updatables.push(this.tweenObj)
  }

  onMouseClick(event) {
    // 更新鼠标在设备里的坐标位置
    getMousePosition(event, this.#mouse)
    const currentObject = this.#picker.pick(this.#mouse, { children: this.houseObjects }, this.#camera, false)
    if (!currentObject) {
      return false
    }
    // 借助鼠标点击事件可以帮助判断初始化时摄像机position和视点的X、Z的位置
    // console.log(this.mouseCircle.position)
    // GLTFLoader 会把重名节点改名为 floor_1、sofa_2 等，去掉数字后缀按基础名匹配
    if (baseName(currentObject.object.name) === 'floor') {
      // 根据坐标判断是否要变化摄像机的聚焦中心
      // 因为设置了向内向外移动的距离 摄像机的位置会因为聚焦中心与位置的最大值最小值而被迫改变
      this.tweenObj.group.removeAll()
      const currentPoint = currentObject.point
      const tween = new Tween(this.targetVector)
      this.tweenObj.group.add(tween)
      // 移动到某一点的坐标应该比实际鼠标点的地方要小一点 这样才能效果好 可在场景里添加一个透明物体解决此问题
      // 到达的位置 所需的时间 完成时事件回调
      // 不推荐生硬的移动摄像机位置 目前没有想到完美的解决办法
      // this.#camera.position.setY(15)
      // 根据勾股定理计算斜边的长度
      const distance = Math.sqrt(
        Math.pow(Math.abs(this.#camera.position.x - currentPoint.x), 2) +
        Math.pow(Math.abs(this.#camera.position.z - currentPoint.z), 2)
      )
      let moveTime = 1000
      if (distance > 10) {
        moveTime = Math.ceil(distance / 10 * 1000)
      }
      tween.to(new Vector3(currentPoint.x, currentPoint.y + 15, currentPoint.z), moveTime).onComplete(() => {
        console.log(this.targetVector, this.#camera.position)
        console.log('完成移动')
      })
      // tween.to(new Vector3(currentPoint.x, currentPoint.y + 15, currentPoint.z), moveTime)
      //启动补间动画
      tween.start()
    }
  }

  onMouseMove(event) {
    getMousePosition(event, this.#mouse)
    const currentObject = this.#picker.pick(this.#mouse, { children: this.houseObjects }, this.#camera)
    if (!currentObject) {
      return false
    }
    if (baseName(currentObject.object.name) === 'floor') {
      this.mouseCircle.visible = true
      const currentPoint = currentObject.point
      // 直接使用相交点的坐标 会造成半透明圆和相交点重叠在一起 轻微移动Y轴 让半透明圆略高于该点
      const newPoint = new Vector3(currentPoint.x, currentPoint.y + 0.1, currentPoint.z)
      this.mouseCircle.position.copy(newPoint)
    } else {
      this.mouseCircle.visible = false
      // 显示鼠标悬浮
      const name = baseName(currentObject.object.name)
      if (this.tooltipInfo[name]) {
        this.tooltipObj.style.cssText = `
          display: block;
          left: ${event.clientX}px;
          top: ${event.clientY - 35}px;
        `
        this.tooltipObj.textContent = this.tooltipInfo[name]
      } else {
        this.tooltipObj.style.display = 'none'
      }
    }
  }

  initTooltip() {
    // 按模型里的图元名称匹配（名称已写入 scene.gltf / scene_meshopt.glb）
    // 键为基础名：重名节点加载后的 floor_1、sofa_2 等会先经 baseName() 去后缀再查表
    this.tooltipInfo = {
      art_painting: '艺术画',
      curtain: '窗帘',
      sofa: '沙发',
      dining_chair: '餐椅',
      teapot: '茶壶',
      teacup: '茶杯',
      dining_table: '餐桌',
      fruit: '水果',
      bookshelf: '书架',
      books: '书籍'
    }
  }
}

export { House }
