import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { SCENES, frames, FPS, type Scene } from './scenes'

const BLUE = '#4285f4'
const BG = 'radial-gradient(1200px 700px at 50% -10%, #0d2340 0%, #00101f 60%)'
const font = 'Inter, -apple-system, "Helvetica Neue", Arial, sans-serif'

const Logo: React.FC<{ h: number }> = ({ h }) => <Img src={staticFile('logo-white.png')} style={{ height: h }} />

const Bullet: React.FC<{ text: string; i: number }> = ({ text, i }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  const p = spring({ frame: f - 25 - i * 14, fps, config: { damping: 200 } })
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', opacity: p, transform: `translateX(${(1 - p) * 40}px)`, fontSize: 32, color: '#dbe7f7', marginBottom: 22 }}>
      <span style={{ width: 14, height: 14, borderRadius: 7, background: BLUE, flex: 'none' }} />
      {text}
    </div>
  )
}

const Frame: React.FC<{ s: Scene; total: number }> = ({ s, total }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  const enter = spring({ frame: f, fps, config: { damping: 200 } })
  const zoom = interpolate(f, [0, total], [1, 1.035])
  const per = total / s.shots.length
  const ring = s.ring
  const k = 1200 / 1440
  const ringP = spring({ frame: f - 40, fps, config: { damping: 12 } })
  const pulse = 1 + 0.04 * Math.sin(f / 6)
  return (
    <div style={{ position: 'absolute', left: 70, top: 190, width: 1200, height: 750, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.6)', border: '1px solid #1c3558', opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}>
        {s.shots.map((n, i) => {
          const start = i * per
          const o = i === 0 ? 1 : interpolate(f, [start - 10, start + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          return <Img key={n} src={staticFile(`shots/${n}.png`)} style={{ position: 'absolute', inset: 0, width: 1200, height: 750, opacity: o }} />
        })}
        {ring ? (
          <div style={{ position: 'absolute', left: ring[0] * k - 8, top: ring[1] * k - 8, width: ring[2] * k + 16, height: ring[3] * k + 16, border: `4px solid ${BLUE}`, borderRadius: 14, boxShadow: `0 0 28px ${BLUE}`, opacity: ringP, transform: `scale(${pulse})` }} />
        ) : null}
      </div>
    </div>
  )
}

const StepScene: React.FC<{ s: Scene }> = ({ s }) => {
  const total = frames(s)
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  const chip = spring({ frame: f, fps, config: { damping: 200 } })
  const idx = SCENES.filter((x) => x.kind === 'step').findIndex((x) => x.id === s.id) + 1
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font, color: 'white' }}>
      <div style={{ position: 'absolute', left: 70, top: 50 }}><Logo h={56} /></div>
      <div style={{ position: 'absolute', right: 70, top: 62, fontSize: 24, color: '#7f9bc0' }}>Step {idx} of 8</div>
      <div style={{ position: 'absolute', left: 70, top: 130, fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: BLUE, opacity: chip }}>{s.step}</div>
      <Frame s={s} total={total} />
      <div style={{ position: 'absolute', left: 1330, top: 230, width: 540 }}>
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.1, marginBottom: 44, opacity: chip, transform: `translateY(${(1 - chip) * 20}px)` }}>{s.title}</div>
        {s.bullets.map((b, i) => <Bullet key={b} text={b} i={i} />)}
      </div>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(f / total) * 100}%`, background: BLUE }} />
    </AbsoluteFill>
  )
}

const Hero: React.FC<{ s: Scene }> = ({ s }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig()
  const a = spring({ frame: f, fps, config: { damping: 200 } })
  const outro = s.kind === 'outro'
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: font, color: 'white', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: a, transform: `scale(${0.9 + a * 0.1})` }}><Logo h={outro ? 120 : 150} /></div>
      <div style={{ fontSize: outro ? 84 : 120, fontWeight: 800, marginTop: 40, opacity: a, textAlign: 'center' }}>{outro ? s.title : 'CRM, made simple'}</div>
      <div style={{ display: 'flex', gap: 28, marginTop: 56 }}>
        {s.bullets.map((b, i) => {
          const p = spring({ frame: f - 40 - i * 25, fps, config: { damping: 200 } })
          return <div key={b} style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)`, fontSize: 32, padding: '16px 28px', borderRadius: 40, border: `2px solid ${BLUE}`, color: '#dbe7f7' }}>{b}</div>
        })}
      </div>
      {outro ? <div style={{ marginTop: 40, fontSize: 36, color: '#7f9bc0', opacity: a }}>app.igani.co</div> : null}
    </AbsoluteFill>
  )
}

export const Explainer: React.FC = () => {
  let at = 0
  return (
    <AbsoluteFill style={{ background: '#00101f' }}>
      {SCENES.map((s) => {
        const from = at; const d = frames(s); at += d
        return (
          <Sequence key={s.id} from={from} durationInFrames={d}>
            <Audio src={staticFile(`vo/s${s.id}.mp3`)} />
            {s.kind === 'step' ? <StepScene s={s} /> : <Hero s={s} />}
          </Sequence>
        )
      })}
      <FPSGuard />
    </AbsoluteFill>
  )
}
const FPSGuard: React.FC = () => { void FPS; return null }
