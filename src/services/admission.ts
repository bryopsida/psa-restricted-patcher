import { inject, injectable } from 'inversify'
import { TYPES } from '../types'
import { Logger } from 'pino'
import { V1Capabilities, V1Pod, V1PodSpec } from '@kubernetes/client-node'
import * as jsonpatch from 'fast-json-patch'

export interface IAdmission {
  /**
   * Take a pod and return the patch required for admission, [] if no patch operations are required
   * @param pod raw pod that necessary patches will be applied to
   * @returns string a JSON string of the JSONPatch
   */
  admit(pod: V1Pod): Promise<string>
}

@injectable()
export class Admission implements IAdmission {
  private readonly logger: Logger
  private readonly defaultGid: number
  private readonly defaultUid: number
  private readonly defaultFsGroup: number
  private readonly addSeccompProfile: boolean
  private readonly seccompProfile: string

  constructor(
    @inject(TYPES.Services.Logging) parentLogger: Logger,
    @inject(TYPES.Config.DefaultFsGroup) defaultFsGroup: number,
    @inject(TYPES.Config.DefaultGid) defaultGid: number,
    @inject(TYPES.Config.DefaultUid) defaultUid: number,
    @inject(TYPES.Config.AddSeccompProfile) addSeccompProfile: boolean,
    @inject(TYPES.Config.SeccompProfile) seccompProfile: string
  ) {
    this.logger = parentLogger.child({ module: 'services/Admission' })
    this.defaultFsGroup = defaultFsGroup
    this.defaultGid = defaultGid
    this.defaultUid = defaultUid
    this.addSeccompProfile = addSeccompProfile
    this.seccompProfile = seccompProfile
  }

  async admit(pod: V1Pod): Promise<string> {
    const observer = jsonpatch.observe<V1Pod>(pod)
    const spec = pod.spec as V1PodSpec
    if (!spec.securityContext) spec.securityContext = {}
    if (!spec.securityContext.runAsNonRoot)
      spec.securityContext.runAsNonRoot = true
    if (!spec.securityContext.fsGroup)
      spec.securityContext.fsGroup = this.defaultFsGroup ?? 1001
    if (!spec.securityContext.seccompProfile && this.addSeccompProfile) {
      spec.securityContext.seccompProfile = {
        type: this.seccompProfile
      }
    }
    spec.containers = spec.containers.map((c) => {
      if (!c.securityContext) c.securityContext = {}
      if (
        c.securityContext.allowPrivilegeEscalation == null ||
        c.securityContext.allowPrivilegeEscalation
      )
        c.securityContext.allowPrivilegeEscalation = false
      if (c.securityContext.privileged == null || c.securityContext.privileged)
        c.securityContext.privileged = false
      if (!c.securityContext.readOnlyRootFilesystem)
        c.securityContext.readOnlyRootFilesystem = true
      if (!c.securityContext.runAsNonRoot) c.securityContext.runAsNonRoot = true
      if (!c.securityContext.runAsGroup)
        c.securityContext.runAsGroup = this.defaultGid ?? 1001
      if (!c.securityContext.runAsUser)
        c.securityContext.runAsUser = this.defaultUid ?? 1001
      if (!c.securityContext.capabilities)
        c.securityContext.capabilities = new V1Capabilities()
      if (!c.securityContext.capabilities.drop)
        c.securityContext.capabilities.drop = ['ALL']
      return c
    })
    return Promise.resolve(JSON.stringify(jsonpatch.generate(observer)))
  }
}
