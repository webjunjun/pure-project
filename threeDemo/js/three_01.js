import { House } from './three_house/House.js'

const main = async () => {
  const container = document.querySelector('#scene-container')
  const house = new House(container)
  await house.init()
  house.start()
  // house.render()

  // 绑定事件时一定要注意调用的上下文
  // 用箭头函数可以保证上下文在类里，而不是window
  window.addEventListener('click', ev => house.onMouseClick(ev), false)
  window.addEventListener('mousemove', ev => house.onMouseMove(ev), false)
}

main().catch(err => {
  console.error(err)
})
