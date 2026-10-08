import GameScene from './game/GameScene'
import AuthHUD from './ui/AuthHUD'
import FpsCounter from './ui/FpsCounter'
import GameHUD from './ui/GameHUD'
import LoadingScreen from './ui/LoadingScreen'
import SoundToggle from './ui/SoundToggle'
import TouchControls from './ui/TouchControls'

function App() {
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-900">
      <GameScene />
      <AuthHUD />
      {/* The Controls button and its popup live in the same left rail as Pets and
          Rebirth - see ui/Controls.jsx and ui/GameHUD.jsx's WinsCounter. */}
      <GameHUD />
      <TouchControls />
      <SoundToggle />
      <FpsCounter />
      <LoadingScreen />
    </div>
  )
}

export default App
