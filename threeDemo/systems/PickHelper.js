import { Raycaster } from 'three'

// https://threejs.org/manual/#zh/picking
/**
 * 本拾取方法是利用CPU运算遍历每一个js对象, 检查是否与射线相交, 当处理对象过多时会造成响应速度慢
 * 处理一些奇怪的着色器或者位移
 * 无法通过处理透明的孔洞拾取后面第一个图元
 * 
 * 解决方式是利用GPU拾取解决上述问题, 速度问题还是不能有效解决
 */

class PickHelper {
  #raycaster; // 射线投射器
  #pickedObject; // 拾取的对象
  #pickedObjectSavedColor; // 保存当前拾取的图元的原材质颜色

  constructor() {
    this.#raycaster = new Raycaster()
    this.#pickedObject = null
    this.#pickedObjectSavedColor = 0
  }

  /**
   * 判断鼠标在场景里与哪一个图元第一个相交
   * @param {Vector2} normalizedPosition 鼠标坐标相对于场景的二维坐标
   * @param {Scene} scene 当前场景
   * @param {PerspectiveCamera} camera 当前相机
   * @returns 拾取的对象
   */
  pick(normalizedPosition, scene, camera, isChangeColor) {
    let currentPicker = null
    // 恢复上一个被拾取对象的颜色
    if (isChangeColor && this.#pickedObject) {
      this.#pickedObject.material.color.set(this.#pickedObjectSavedColor)
      this.#pickedObject = null
    }

    // 发出射线
    this.#raycaster.setFromCamera(normalizedPosition, camera)
    // 获取与射线相交的对象
    const intersects = this.#raycaster.intersectObjects(scene.children)
    if (intersects.length > 0) {
      if (isChangeColor) {
        // 找到第一个对象，它是离鼠标最近的对象
        console.log(intersects[0])
        this.#pickedObject = intersects[0].object
        // 保存它的颜色
        this.#pickedObjectSavedColor = this.#pickedObject.material.color.clone()
        // 设置它的发光为红色
        this.#pickedObject.material.color.set(0xFF0000)
      }
      currentPicker = intersects[0]
    }
    return currentPicker
  }
}

export { PickHelper }
