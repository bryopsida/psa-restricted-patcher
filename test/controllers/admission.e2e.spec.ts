import { describe, it, afterAll, beforeAll, expect } from '@jest/globals'
import { CoreV1Api, KubeConfig, V1Namespace, V1Pod } from '@kubernetes/client-node'
import { randomUUID } from 'node:crypto'

const TEST_NAMESPACE = 'k8s-mutating-webhook'

describe('controllers/admission', () => {
  let client: CoreV1Api

  async function deletePods () : Promise<unknown> {
    const pods = await client.listNamespacedPod({
      namespace: TEST_NAMESPACE
    })
    const deleteProms = pods.items.map((pod: V1Pod) => client.deleteNamespacedPod(pod.metadata as any))
    return Promise.all(deleteProms)
  }
  async function deleteNamespace () : Promise<void> {
    try {
      if ((await client.listNamespace()).items.some((ele:V1Namespace) => {
        return ele.metadata?.name === TEST_NAMESPACE
      })) {
        await deletePods()
        await client.deleteNamespace({
          name: TEST_NAMESPACE
        })
        // wait for namespace to terminate, this could be more elegant and watch for termination to complete
        await new Promise((resolve) => { setTimeout(resolve, 5000) })
      }
    } catch (err) {
      console.error(err)
    }
  }

  beforeAll(async () => {
    // setup k8s client
    const kc = new KubeConfig()
    kc.loadFromDefault()

    client = kc.makeApiClient(CoreV1Api)
    try {
      await deleteNamespace()
      await client.createNamespace({
        body: {
          metadata: {
            name: TEST_NAMESPACE
          }
        }
      })
    } catch (err) {
      console.error(err)
    }
  })
  afterAll(async () => {
    await deleteNamespace()
  })
  it('Should enhance busybox', async () => {
    const resp = await client.createNamespacedPod({
      namespace: TEST_NAMESPACE,
      body: {
        metadata: {
          name: `test-enhance-${randomUUID()}`,
          namespace: TEST_NAMESPACE
        },
        spec: {
          containers: [{
            image: 'busybox',
            name: 'busybox'
          }]
        }
      }
    })
    expect(resp.status?.message).toEqual('Created')
    expect(resp.spec?.securityContext?.runAsNonRoot).toBeTruthy()
    resp.spec?.containers.forEach((c) => {
      expect(c.securityContext?.allowPrivilegeEscalation).toBeFalsy()
      expect(c.securityContext?.privileged).toBeFalsy()
      expect(c.securityContext?.readOnlyRootFilesystem).toBeTruthy()
      expect(c.securityContext?.runAsNonRoot).toBeTruthy()
    })
  })
})
