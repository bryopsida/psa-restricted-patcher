import 'reflect-metadata'
import { Container, interfaces } from 'inversify'
import { TYPES } from './types'
import { IKubernetes, Kubernetes } from './services/kubernetes'
import { CoreV1Api, KubeConfig } from '@kubernetes/client-node'
import { Admission, IAdmission } from './services/admission'
import config from 'config'
import pino, { Logger } from 'pino'

const appContainer = new Container()

appContainer.bind<IKubernetes>(TYPES.Services.Kubernetes).to(Kubernetes)
appContainer.bind<IAdmission>(TYPES.Services.Admission).to(Admission)

appContainer.bind<KubeConfig>(TYPES.K8S.Config).toDynamicValue((context: interfaces.Context) => {
  const config = new KubeConfig()
  config.loadFromDefault()
  return config
})
appContainer.bind<CoreV1Api>(TYPES.K8S.CoreApi).toDynamicValue((context: interfaces.Context) => {
  const config = context.container.get<KubeConfig>(TYPES.K8S.Config)
  return config.makeApiClient(CoreV1Api)
})
appContainer.bind<boolean>(TYPES.Config.TLSEnabled).toConstantValue(config.get<boolean>('tls.enabled'))
appContainer.bind<string>(TYPES.Config.TLSKeyPath).toConstantValue(config.get<string>('tls.keyPath'))
appContainer.bind<string>(TYPES.Config.TLSCertPath).toConstantValue(config.get<string>('tls.certPath'))
appContainer.bind<Array<string>>(TYPES.Config.Namespaces).toConstantValue(config.get<Array<string>>('namespaces'))
appContainer.bind<number>(TYPES.Config.DefaultFsGroup).toConstantValue(config.get<number>('defaultFsGroup'))
appContainer.bind<number>(TYPES.Config.DefaultGid).toConstantValue(config.get<number>('defaultGid'))
appContainer.bind<number>(TYPES.Config.DefaultUid).toConstantValue(config.get<number>('defaultUid'))
appContainer.bind<string>(TYPES.Config.SeccompProfile).toConstantValue(config.get<string>('seccompProfile'))
appContainer.bind<boolean>(TYPES.Config.AddSeccompProfile).toConstantValue(config.get<boolean>('addSeccompProfile'))
appContainer.bind<Array<RegExp>>(TYPES.Config.PassthroughPatterns).toConstantValue(config.get<Array<RegExp>>('passthrough').map((s) => new RegExp(s)))

// create pino parent logger for services to use
appContainer.bind<Logger>(TYPES.Services.Logging).toConstantValue(pino({
  level: config.get<string>('log.level')
}))

export { appContainer }
