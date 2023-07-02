import { describe, it, expect } from '@jest/globals'
import 'reflect-metadata'
import { Filter } from '../../src/services/filter'
import pino from 'pino'
import { V1Pod } from '@kubernetes/client-node'

describe('services/filter', () => {
  const pinoLogger = pino({
    level: 'error'
  })
  const podFactory = (annotations: Record<string, string>): V1Pod => {
    // we don't care about the rest of the pod properties for these tests
    // provide just enough to exercise the code
    return {
      metadata: {
        name: 'TEST',
        namespace: 'TEST',
        annotations
      }
    } as any
  }
  describe('isIgnored', () => {
    it('should resolve true when pod does match', () => {
      const ignoreSet: Record<string, string> = {
        TEST_1: 'TEST_1_VALUE',
        TEST_2: 'TEST_2_VALUE'
      }
      const filter = new Filter(pinoLogger, [ignoreSet], [])
      expect(filter.isIgnored(podFactory(ignoreSet))).resolves.toBe(true)
    })
    it('should resolve false when pod does not match', () => {
      const ignoreSet: Record<string, string> = {
        TEST_1: 'TEST_1_VALUE',
        TEST_2: 'TEST_2_VALUE'
      }
      const filter = new Filter(pinoLogger, [ignoreSet], [])
      expect(
        filter.isIgnored(
          podFactory({
            NOT_TEST_1: 'NOT_TEST_1_VALUE',
            NOT_TEST_2: 'NOT_TEST_2_VALUE'
          })
        )
      ).resolves.toBe(false)
    })
    it('should resolve false when no sets are provided', () => {
      const filter = new Filter(pinoLogger, [], [])
      expect(
        filter.isIgnored(
          podFactory({
            TEST: 'TEST'
          })
        )
      ).resolves.toBe(false)
    })
  })
  describe('isTargetted', () => {
    it('should resolve true when pod does match', () => {
      const targetSet: Record<string, string> = {
        TEST_1: 'TEST_1_VALUE',
        TEST_2: 'TEST_2_VALUE'
      }
      const filter = new Filter(pinoLogger, [], [targetSet])
      expect(filter.isTargetted(podFactory(targetSet))).resolves.toBe(true)
    })
    it('should resolve false when pod does not match', () => {
      const targetSet: Record<string, string> = {
        TEST_1: 'TEST_1_VALUE',
        TEST_2: 'TEST_2_VALUE'
      }
      const filter = new Filter(pinoLogger, [], [targetSet])
      expect(
        filter.isTargetted(
          podFactory({
            NOT_TEST_1: 'NOT_TEST_1_VALUE',
            NOT_TEST_2: 'NOT_TEST_2_VALUE'
          })
        )
      ).resolves.toBe(false)
    })
    it('should resolve true when no sets are provided', () => {
      const filter = new Filter(pinoLogger, [], [])
      expect(
        filter.isTargetted(
          podFactory({
            TEST: 'TEST'
          })
        )
      ).resolves.toBe(true)
    })
  })
  describe('isTargetAll', () => {
    it('should resolve true when no sets are provided', () => {
      const filter = new Filter(pinoLogger, [], [])
      expect(filter.isTargetAll()).toBe(true)
    })
  })
  describe('isIgnoredNone', () => {
    it('should resolve true when no sets are provided', () => {
      const filter = new Filter(pinoLogger, [], [])
      expect(filter.isIgnoreNone()).toBe(true)
    })
  })
})
