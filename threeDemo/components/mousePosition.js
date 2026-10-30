// event: 触发事件对象
// mouse: 鼠标向量
function getMousePosition(event, mouse) {
  let x, y;
  // 考虑到的移动开发
  /**
   * touches是当前屏幕上所有触摸点的列表
   * targetTouches是当前对象上所有触摸点的列表(绑定事件的那个结点上的触摸点的集合列表)
   * changedTouches是涉及当前事件的触摸点的列表(触发绑定事件时改变的触摸点的集合列表)
   */
  if (event.changedTouches) {
      x = event.changedTouches[0].pageX
      y = event.changedTouches[0].pageY
  } else {
      x = event.clientX
      y = event.clientY
  }
  mouse.x = ( x / window.innerWidth ) * 2 - 1
  mouse.y = -( y / window.innerHeight ) * 2 + 1
}

export { getMousePosition }
