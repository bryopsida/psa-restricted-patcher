import { describe, it, expect } from '@jest/globals'
import 'reflect-metadata'
import { Admission } from '../../src/services/admission'
import pino from 'pino'
import { V1Pod } from '@kubernetes/client-node'

describe('services/admission', () => {
  const pinoLogger = pino({
    level: 'error'
  })
  it('Should mutate to a more secure setting', async () => {
    const service = new Admission(pinoLogger, 1001, 1001, 1001, false, 'test')
    const newPod: V1Pod = {
      spec: {
        containers: [
          {
            name: 'test',
            image: 'test'
          }
        ]
      }
    }
    const patch = await service.admit(newPod)
    expect(patch).toEqual(
      '[{"op":"add","path":"/spec/containers/0/securityContext","value":{"allowPrivilegeEscalation":false,"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"runAsGroup":1001,"runAsUser":1001,"capabilities":{"drop":["ALL"]}}},{"op":"add","path":"/spec/securityContext","value":{"runAsNonRoot":true,"fsGroup":1001}}]'
    )
  })
  it('Should not mutate already secure pod', async () => {
    const service = new Admission(pinoLogger, 1001, 1001, 1001, false, 'test')
    const newPod: V1Pod = {
      spec: {
        securityContext: {
          runAsNonRoot: true,
          fsGroup: 1001
        },
        containers: [
          {
            name: 'test',
            image: 'test',
            securityContext: {
              runAsNonRoot: true,
              readOnlyRootFilesystem: true,
              privileged: false,
              allowPrivilegeEscalation: false,
              runAsGroup: 1001,
              runAsUser: 1001,
              capabilities: {
                drop: ['ALL']
              }
            }
          }
        ]
      }
    }
    const patch = await service.admit(newPod)
    expect(patch).toEqual('[]')
  })
})
