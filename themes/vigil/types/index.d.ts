/**
 * Which backdrop the theme shows: the moving city, the same city held still,
 * no picture, or a vector wallpaper of the person's own with rain over it.
 */
export type VigilMode = 'animated' | 'still' | 'plain' | 'wallpaper'

/** The last click on the bare night sky, where a flock of bats takes off. */
export type VigilBurst = { x: number; y: number; at: number; n: number }

declare module 'claude-code' {
  interface PluginState {
    vigil: { mode: VigilMode; burst: VigilBurst | null }
  }
}
