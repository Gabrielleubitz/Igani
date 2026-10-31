import { Composition } from 'remotion'
import { Explainer } from './Explainer'
import { FPS, TOTAL } from './scenes'
export const Root: React.FC = () => <Composition id="Explainer" component={Explainer} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
