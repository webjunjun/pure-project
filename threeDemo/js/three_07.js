import { FakeJumpGame } from './fake_jump/FakeJumpGame.js'

const main = async () => {
  const container = document.querySelector('#scene-container')
  const fakeJump = new FakeJumpGame(container)
  await fakeJump.init()
  fakeJump.start()
}

main().catch(err => {
  console.error(err)
})