
// https://threejs.org/manual/#zh/picking
/**
 * 对每一个对象使用唯一的颜色进行离屏渲染 检查鼠标位置关联的像素的颜色 从而知道哪个图元被选中
 */

class GPUPickHelper {

  constructor() {
    // 创建一个1px的渲染目标
    this.pickingTexture = new THREE.WebGLRenderTarget(1, 1)
    this.pixelBuffer = new Uint8Array(4)
    this.pickedObject = null;
    this.pickedObjectSavedColor = 0;

  }

  /**
   * 利用GPU拾取 可以解决奇怪的着色器或者位移  可以通过透明的孔洞拾取后面碰到的第一个图元
   * 在threejs里，GPU默认不渲染深度缓冲区（可以理解成元素在空间里的距离）的透明元素
   * @param {*} cssPosition 
   * @param {*} scene 
   * @param {*} camera 
   * @param {*} time 
   */
  pick( cssPosition, scene, camera, time ) {

    const { pickingTexture, pixelBuffer } = this;

    // 如果已经存在拾取的对象 将其颜色恢复
    if ( this.pickedObject ) {
      this.pickedObject.material.emissive.setHex( this.pickedObjectSavedColor );
      this.pickedObject = undefined;
    }

    // 设置视野偏移来表现鼠标下的1px
    const pixelRatio = renderer.getPixelRatio();
    camera.setViewOffset(
      renderer.getContext().drawingBufferWidth, // 全高
      renderer.getContext().drawingBufferHeight, // 全宽
      cssPosition.x * pixelRatio | 0, // 矩形 x
      cssPosition.y * pixelRatio | 0, // 矩形 y
      1, // 矩形 width
      1, // 矩形 height
    );

    // 渲染场景
    renderer.setRenderTarget( pickingTexture );
    renderer.render( scene, camera );
    renderer.setRenderTarget( null );

    // 清理视野偏移 回归正常
    camera.clearViewOffset();
    // 读取像素
    renderer.readRenderTargetPixels(
      pickingTexture,
      0, // x
      0, // y
      1, // width
      1, // height
      pixelBuffer );

    const id =
        ( pixelBuffer[ 0 ] << 16 ) |
        ( pixelBuffer[ 1 ] << 8 ) |
        ( pixelBuffer[ 2 ] );

    const intersectedObject = idToObject[ id ];
    if ( intersectedObject ) {
      // 获取第一个对象 它是离鼠标最近的一个
      this.pickedObject = intersectedObject;
      // 保存颜色
      this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
      // 设置对象在黄/红两色间闪烁
      this.pickedObject.material.emissive.setHex( ( time * 8 ) % 2 > 1 ? 0xFFFF00 : 0xFF0000 );
    }
  }
}

export { GPUPickHelper }
