import { KenneyCity } from './kenney_city/KenneyCity.js'

const main = async () => {
  const container = document.querySelector('#scene-container')
  const kenneyCity = new KenneyCity(container)
  await kenneyCity.init()
  kenneyCity.start()
}

main().catch(err => {
  console.error(err)
})
