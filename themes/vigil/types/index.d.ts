/** Which backdrop the theme shows: the moving city, the same city held still, or no picture. */
export type VigilMode = 'animated' | 'still' | 'plain'

/** The last click on the bare night sky, where a flock of bats takes off. */
export type VigilBurst = { x: number; y: number; at: number; n: number }

declare module 'claude-code' {
  interface PluginState {
    vigil: { mode: VigilMode; burst: VigilBurst | null }
  }
}
