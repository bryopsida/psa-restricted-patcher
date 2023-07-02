import { V1Pod } from '@kubernetes/client-node'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { IAdmission } from '../services/admission'
import { TYPES } from '../types'
import { IFilter } from '../services/filter'

export function AdmissionController(
  instance: FastifyInstance,
  opts: FastifyPluginOptions,
  done: Function
) {
  instance.log.info('Registering AdmissionController')
  const admissionService = instance.inversifyContainer.get<IAdmission>(
    TYPES.Services.Admission
  )
  const namespaces = instance.inversifyContainer.get<Array<string>>(
    TYPES.Config.Namespaces
  )
  const passThroughPatterns = instance.inversifyContainer.get<Array<RegExp>>(
    TYPES.Config.PassthroughPatterns
  )
  const filter = instance.inversifyContainer.get<IFilter>(TYPES.Services.Filter)
  const processStats: Record<string, unknown> = {}
  processStats.requestsServed = 0

  instance.post('/', async (req, reply) => {
    const body: any = req.body
    const allowResponse = {
      apiVersion: 'admission.k8s.io/v1',
      kind: 'AdmissionReview',
      response: {
        uid: body.request.uid,
        allowed: true
      }
    }
    if (
      body.kind === 'AdmissionReview' &&
      body.request.operation === 'CREATE' &&
      body.request.kind.kind === 'Pod'
    ) {
      const newPod: V1Pod = body.request.object
      if (
        namespaces.length !== 0 &&
        !namespaces.some(
          (n) => n.toLowerCase() === newPod.metadata?.namespace?.toLowerCase()
        )
      ) {
        reply.send(allowResponse)
      } else if (await filter.isIgnored(newPod)) {
        reply.send(allowResponse)
      } else if (
        passThroughPatterns.some((p) => p.test(newPod.metadata?.name as string))
      ) {
        reply.send(allowResponse)
      } else if (await filter.isTargetted(newPod)) {
        const patch = await admissionService.admit(newPod)
        instance.log.info('Generated patch = %s', patch)
        reply.send({
          apiVersion: 'admission.k8s.io/v1',
          kind: 'AdmissionReview',
          response: {
            uid: body.request.uid,
            allowed: true,
            patch: Buffer.from(patch).toString('base64'),
            patchType: 'JSONPatch'
          }
        })
      }
    } else {
      reply.send(allowResponse)
    }
    processStats.requestsServed = (processStats.requestsServed as number) + 1
  })

  instance.get('/meta', async (req, reply) => {
    reply.send(processStats)
  })
  done()
  instance.log.info('Finished Registering AdmissionController')
}
