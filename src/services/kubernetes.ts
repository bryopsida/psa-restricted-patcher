import {
  AdmissionregistrationV1Api,
  CoreV1Api,
  PatchUtils,
  V1MutatingWebhook,
  V1MutatingWebhookConfiguration
} from '@kubernetes/client-node'
import { inject, injectable } from 'inversify'
import { TYPES } from '../types'
import { Logger } from 'pino'
import * as jsonpatch from 'fast-json-patch'

export interface IKubernetes {
  /**
   * Check if the bundle is synced on the hook configuration, if not sync it, resolve false or throw if unable to sync
   */
  syncCaBundle(): Promise<boolean>
}

@injectable()
export class Kubernetes implements IKubernetes {
  static readonly CA_CRT = 'ca.crt'
  private readonly log: Logger
  private readonly hookName: string
  private readonly tlsSecretName: string
  private readonly namespaceName: string
  private readonly kubeClient: CoreV1Api
  private readonly admissionKubeClient: AdmissionregistrationV1Api

  constructor(
    @inject(TYPES.Services.Logging) parentLogger: Logger,
    @inject(TYPES.Config.HookName) hookName: string,
    @inject(TYPES.Config.SecretName) secretName: string,
    @inject(TYPES.Config.HookNamespace) namespace: string,
    @inject(TYPES.K8S.CoreApi) kubeClient: CoreV1Api,
    @inject(TYPES.K8S.AdmissionApi) admissionApi: AdmissionregistrationV1Api
  ) {
    this.log = parentLogger.child({ module: 'services/Kubernetes' })
    this.hookName = hookName
    this.tlsSecretName = secretName
    this.kubeClient = kubeClient
    this.namespaceName = namespace
    this.admissionKubeClient = admissionApi
  }

  private generateCaPatch(
    hook: V1MutatingWebhookConfiguration,
    newCa: string
  ): any {
    const observer = jsonpatch.observe<V1MutatingWebhookConfiguration>(hook)
    const config = hook.webhooks?.at(0) as V1MutatingWebhook
    config.clientConfig.caBundle = newCa
    return jsonpatch
      .generate(observer)
      .filter((patch) => patch.path === '/webhooks/0/clientConfig/caBundle')
  }

  /** @inheritdoc */
  async syncCaBundle(): Promise<boolean> {
    // on any failure resolve failse
    try {
      // get the secret first
      const secret = await this.kubeClient.readNamespacedSecret(
        this.tlsSecretName,
        this.namespaceName
      )
      if (secret.body.data == null)
        throw new Error('Secret data property is null, cannot sync ca.crt')
      if (secret.body.data[Kubernetes.CA_CRT] == null)
        throw new Error('ca.crt is not present on secret, cannot sync')
      const caCrt = secret.body.data[Kubernetes.CA_CRT] as string
      // fetch the mutating webhook
      const webhook =
        await this.admissionKubeClient.readMutatingWebhookConfiguration(
          this.hookName
        )
      // we have one hook and one ruleset
      if (webhook.body.webhooks == null || webhook.body.webhooks.length === 0)
        throw new Error('Invalid hookName configuration provided, no webhooks')
      const caBundle = webhook.body.webhooks[0].clientConfig.caBundle
      if (caCrt !== caBundle) {
        // the bundles have diverged we need to update
        this.log.warn(
          'Updating webhook configurations clientConfig.caBundle to match ca.crt in tlsSecret'
        )
        this.log.debug('TLS Secret ca.crt value = %s', caCrt)
        this.log.debug('clientConfig.caBundle value = %s', caBundle)
        const options = {
          headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH }
        }
        const patch = this.generateCaPatch(webhook.body, caCrt)
        await this.admissionKubeClient.patchMutatingWebhookConfiguration(
          this.hookName,
          patch,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          options
        )
      }
      return Promise.resolve(true)
    } catch (err) {
      this.log.error(err, 'Error while checking ca bundle sync status')
      return Promise.resolve(false)
    }
  }
}
