import { ImageResponse } from 'next/og'

export const alt = 'MatterSolv Documentation'
export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630
}

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        fontFamily: 'Arial, sans-serif',
        height: '100%',
        justifyContent: 'center',
        padding: 72,
        width: '100%'
      }}
    >
        <div style={{ alignItems: 'center', display: 'flex', gap: 36 }}>
        <div
          style={{
            alignItems: 'center',
            background: '#14b8a6',
            borderRadius: 36,
            color: '#052e2b',
            display: 'flex',
            fontSize: 84,
            fontWeight: 800,
            height: 180,
            justifyContent: 'center',
            letterSpacing: 0,
            width: 180
          }}
        >
          LE
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            width: 780
          }}
        >
          <div
            style={{
              color: '#f8fafc',
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: 0,
              lineHeight: 1
            }}
          >
            MatterSolv Documentation
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 34, letterSpacing: 0 }}>
            Workflows, modules, and administration
          </div>
        </div>
      </div>
    </div>,
    size
  )
}
