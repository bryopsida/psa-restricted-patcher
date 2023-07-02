import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import {
  AdmissionregistrationV1Api,
  CoreV1Api,
  KubeConfig
} from "@kubernetes/client-node"
import pino, { Logger } from "pino"
import "reflect-metadata"
import { Kubernetes } from "../../src/services/kubernetes"

describe("services/kubernetes", () => {
  describe("syncCaBundle", () => {
    let mockCore: jest.Mocked<CoreV1Api>
    let mockAdmission: jest.Mocked<AdmissionregistrationV1Api>
    let logger: Logger

    beforeEach(() => {
      const kc = new KubeConfig()
      kc.loadFromDefault()
      logger = pino({ level: "error" })
      mockCore = jest.mocked<CoreV1Api>(kc.makeApiClient(CoreV1Api))
      mockAdmission = jest.mocked<AdmissionregistrationV1Api>(
        kc.makeApiClient(AdmissionregistrationV1Api)
      )
    })
    it("should update web hook configuration when caBundle does not match", async () => {
      jest
        .spyOn(mockCore, "readNamespacedSecret")
        .mockImplementation((): any => {
          return Promise.resolve({
            body: {
              data: {
                "ca.crt": "TEST_VAL"
              }
            }
          })
        })
      jest
        .spyOn(mockAdmission, "readMutatingWebhookConfiguration")
        .mockImplementation((): any => {
          return Promise.resolve({
            body: {
              webhooks: [
                {
                  clientConfig: {
                    caBundle: "NOT_TEST_VAL"
                  }
                }
              ]
            }
          })
        })
      jest
        .spyOn(mockAdmission, "patchMutatingWebhookConfiguration")
        .mockImplementation((): any => {
          return Promise.resolve()
        })
      const service = new Kubernetes(
        logger,
        "TEST_HOOK",
        "TEST_SECRET",
        "TEST_NAMESPACE",
        mockCore,
        mockAdmission
      )
      const result = await service.syncCaBundle()
      expect(result).toBe(true)
      expect(
        mockAdmission.patchMutatingWebhookConfiguration.mock.calls.length
      ).toBe(1)
    })
    it("should not update web hook configuration when caBundle matches", async () => {
      jest
        .spyOn(mockCore, "readNamespacedSecret")
        .mockImplementation((): any => {
          return Promise.resolve({
            body: {
              data: {
                "ca.crt": "TEST_VAL"
              }
            }
          })
        })
      jest
        .spyOn(mockAdmission, "readMutatingWebhookConfiguration")
        .mockImplementation((): any => {
          return Promise.resolve({
            body: {
              webhooks: [
                {
                  clientConfig: {
                    caBundle: "TEST_VAL"
                  }
                }
              ]
            }
          })
        })
      jest
        .spyOn(mockAdmission, "patchMutatingWebhookConfiguration")
        .mockImplementation((): any => {
          return Promise.resolve()
        })
      const service = new Kubernetes(
        logger,
        "TEST_HOOK",
        "TEST_SECRET",
        "TEST_NAMESPACE",
        mockCore,
        mockAdmission
      )
      const result = await service.syncCaBundle()
      expect(result).toBe(true)
      expect(
        mockAdmission.patchMutatingWebhookConfiguration.mock.calls.length
      ).toBe(0)
    })
    it("should resolve false on error", async () => {
      jest
        .spyOn(mockCore, "readNamespacedSecret")
        .mockImplementation((): any => {
          return Promise.reject(new Error("ERROR!!!!"))
        })
      const service = new Kubernetes(
        logger,
        "TEST_HOOK",
        "TEST_SECRET",
        "TEST_NAMESPACE",
        mockCore,
        mockAdmission
      )
      const result = await service.syncCaBundle()
      expect(result).toBe(false)
    })
  })
})
