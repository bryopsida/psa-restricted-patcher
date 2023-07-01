import { V1Pod } from '@kubernetes/client-node'
import { inject, injectable } from 'inversify'
import { Logger } from 'pino'
import { TYPES } from '../types'

export type IAnnotationMap = Record<string, string>
export interface IFilter {
    /**
     * Take a pod, check against the set of ignored annotation maps, if
     * the pod has matching annotations this will resolve with true and
     * the admission controller should not mutate the pod.
     *
     * If no ignored maps are provided this will always resolve false
     * @param {V1Pod} unmutated pod
     * @returns {boolean} true if the pod should be ignored, false otherwise
     */
    isIgnored(pod: V1Pod): Promise<boolean>
    /**
     * Take a pod, check against the set of targetted annotation maps, if
     * the pod has mattching annotations this will resolve true and
     * the admission controller should mutate the pod.
     *
     * If not targetted maps are providded this will always resolve true
     * @param {V1Pod} unmutated pod
     * @returns {boolean} true if the should be enhanced, false otherwise
     */
    isTargetted(pod: V1Pod): Promise<boolean>
    /**
     * Check if all pods are targetted and no annotation filters have been set for targetting
     * @returns {boolean} true if no pod filters have been set for targetting
     */
    isTargetAll(): boolean
    /**
     * Check if no pods are ignored and no annotation filters have been set for ignoring
     * @returns {boolean} true if no pod filters have been set for ignoring
     */
    isIgnoreNone(): boolean
  }

@injectable()
export class Filter implements IFilter {
  private readonly logger: Logger
  private readonly ignoredSet: Array<IAnnotationMap>
  private readonly targettedSet: Array<IAnnotationMap>

  constructor (
    @inject(TYPES.Services.Logging)parentLogger: Logger,
    @inject(TYPES.Config.IgnoredSet)ignoredSet: Array<IAnnotationMap>,
    @inject(TYPES.Config.TargettedSet)targettedSet: Array<IAnnotationMap>) {
    this.logger = parentLogger.child({ module: 'services/Filter' })
    this.ignoredSet = ignoredSet
    this.targettedSet = targettedSet
  }

  private checkAnnotationMap (pod:V1Pod, matchSet: Array<IAnnotationMap>): Promise<boolean> {
    return Promise.resolve(matchSet.some((annotationSet: IAnnotationMap) => {
      // the pod must have matching annotation, for now, not dealing with case normalization
      // if the pod doesn't have annotations, it will not match
      // lets walk the provided set and return false on the first failure
      for (const kvp of Object.entries(annotationSet)) {
        if (pod.metadata?.annotations != null && (pod.metadata?.annotations[kvp[0]] == null || pod.metadata.annotations[kvp[0]] !== kvp[1])) return false
      }
      // if we reach this spot
      // 1) the pod either had no annotations (should be filtered before running some filter but just in case)
      // 2) the pod had all the annotations and matching values
      return true
    }))
  }

  /**
   * @inheritdoc
   */
  isIgnored (pod: V1Pod): Promise<boolean> {
    if (this.isIgnoreNone()) return Promise.resolve(false)
    if (pod.metadata == null || pod.metadata.annotations == null) return Promise.resolve(false)
    return this.checkAnnotationMap(pod, this.ignoredSet)
  }

  /** @inheritdoc */
  isTargetted (pod: V1Pod): Promise<boolean> {
    if (this.isTargetAll()) return Promise.resolve(true)
    if (pod.metadata == null || pod.metadata.annotations == null) return Promise.resolve(true)
    return this.checkAnnotationMap(pod, this.targettedSet)
  }

  /** @inheritdoc */
  isTargetAll (): boolean {
    return this.targettedSet.length === 0
  }

  /** @inheritdoc */
  isIgnoreNone (): boolean {
    return this.ignoredSet.length === 0
  }
}
