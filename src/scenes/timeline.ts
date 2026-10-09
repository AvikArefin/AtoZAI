// Builds the starting Theatre state for a scene: a sequence whose tracks already hold keyframes,
// so Studio's timeline shows real, draggable keyframes instead of an empty sequence.
// Theatre has no public API for creating keyframes in code; passing them in as project state is the
// supported route. Once a Studio export exists (<name>.theatre.json) it replaces this state entirely.
import type { __UNSTABLE_Project_OnDiskState as OnDiskState } from '@theatre/core'

/** How the value travels from this keyframe to the next one. 'linear' (the default) keeps scrubbing 1:1;
 *  'ease' speeds up to 2× the average rate mid-segment; 'hold' jumps at the next keyframe. */
type Ease = 'ease' | 'linear' | 'hold'
/** [time in seconds, value, curve towards the next keyframe (default 'linear')] */
export type Key = [position: number, value: number, ease?: Ease]
/** object key → prop name → keyframes */
export type Tracks = Record<string, Record<string, Key[]>>

// Theatre stores a segment's bezier as (this key's right handle, next key's left handle),
// both in segment-normalised [x, y]. Points on the diagonal give a straight line.
const OUT: Record<Ease, [number, number]> = { ease: [0.5, 0], linear: [0.5, 0.5], hold: [0.5, 0] }
const IN: Record<Ease, [number, number]> = { ease: [0.5, 1], linear: [0.5, 0.5], hold: [0.5, 1] }

const hash = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return (h >>> 0).toString(36)
}

export function initialState(sheetId: string, length: number, tracks: Tracks): OnDiskState {
  const tracksByObject: Record<string, { trackIdByPropPath: Record<string, string>; trackData: Record<string, unknown> }> = {}
  for (const [obj, props] of Object.entries(tracks)) {
    const entry: (typeof tracksByObject)[string] = (tracksByObject[obj] = { trackIdByPropPath: {}, trackData: {} })
    for (const [prop, keys] of Object.entries(props)) {
      const trackId = `${obj}.${prop}`
      entry.trackIdByPropPath[JSON.stringify([prop])] = trackId
      entry.trackData[trackId] = {
        type: 'BasicKeyframedTrack',
        __debugName: trackId,
        keyframes: keys.map(([position, value, ease = 'linear'], i) => ({
          id: `${trackId}#${i}`,
          position,
          value,
          handles: [...IN[keys[i - 1]?.[2] ?? 'linear'], ...OUT[ease]],
          connectedRight: i < keys.length - 1,
          type: ease === 'hold' ? 'hold' : 'bezier',
        })),
      }
    }
  }
  const sequence = { type: 'PositionalSequence', length, subUnitsPerUnit: 30, tracksByObject }
  // The revision changes whenever the keyframes do, so Studio notices that the code moved on
  // and offers to replace any older copy it kept in browser storage.
  return {
    definitionVersion: '0.4.0',
    revisionHistory: [hash(JSON.stringify(sequence))],
    sheetsById: { [sheetId]: { staticOverrides: { byObject: {} }, sequence } },
  } as unknown as OnDiskState
}
