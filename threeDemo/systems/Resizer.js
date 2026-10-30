class Resizer {
  #resizeObserver;
  #throttle;

  constructor(container, camera, renderer) {
    this.#setSize(container, camera, renderer)

    this.#throttle = _.throttle(() => {
      this.#setSize(container, camera, renderer)
      this.onResize()
    }, 250)
    this.#resizeObserver = new ResizeObserver((entries, observer) => {
      this.#throttle()
    })
    this.#resizeObserver.observe(container)
  }

  // 设置相机与渲染器的响应式
  #setSize(container, camera, renderer) {
    // 设置相机的长宽比 并更新相机设置
    camera.aspect = container.clientWidth / container.clientHeight
    // 让摄像机的属性变化生效
    camera.updateProjectionMatrix()
  
    // 设置渲染器的宽高 通常和场景的宽高比一致，这样才能使渲染器渲染的场景不变形
    renderer.setSize(container.clientWidth, container.clientHeight)
  
    // 设置像素比，保障在网页里显示不模糊
    renderer.setPixelRatio(window.devicePixelRatio)
  }

  // 空方法 方便外部调用改写该方法
  // 例如 尺寸变化时重新渲染场景等
  onResize() {}
}

export { Resizer }