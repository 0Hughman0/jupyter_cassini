import { TierModel } from '../models';
import { createTierFiles, TEST_HLT_CONTENT, TEST_META_CONTENT } from './tools'

import 'jest'

describe('tier-model', () => {
    let metaFile: any;
    let hltsFile: any;

    beforeEach(async () => {
        ({ metaFile, hltsFile } = await createTierFiles(TEST_META_CONTENT, TEST_HLT_CONTENT))
    })
    
    test('model-ready-no-hlts', async () => {
        const tier = new TierModel({name: 'WP1', identifiers: ['1'], metaPath: metaFile.path})
        expect(tier.metaFile?.isReady).toBe(false)

        expect(tier.description).toBe('')

        await tier.ready

        expect(tier.metaFile?.isReady).toBe(true)

        expect(tier.description).toBe(TEST_META_CONTENT.description)
    })

    test('model-ready-hlts', async () => {
        const tier = new TierModel({name: 'WP1', identifiers: ['1'], metaPath: metaFile.path, hltsPath: hltsFile.path})
        expect(tier.metaFile?.isReady).toBe(false)
        // expect(tier.hltsFile?.isReady).toBe(false) // doesn't work because hlts file is set in a callback... hmmm

        expect(tier.description).toBe('')
        expect(tier.hltsOutputs).toEqual([])

        await tier.ready

        expect(tier.metaFile?.isReady).toBe(true)
        expect(tier.hltsFile?.isReady).toBe(true)
        
        expect(tier.description).toBe(TEST_META_CONTENT.description)
        expect(tier.hltsOutputs).not.toEqual([])
    })

    test('changed', async () => {
        const tier = await new TierModel({name: 'WP1', identifiers: ['1'], metaPath: metaFile.path, hltsPath: hltsFile.path}).ready
        const sentinal = jest.fn()
        
        tier.changed.connect(sentinal)

        tier.description = "new value"

        expect(sentinal).toBeCalledTimes(1)

        tier.hltsFile?.model.fromJSON({})

        expect(sentinal).toBeCalledTimes(2) 

        await tier.revert()

        expect(sentinal).toBeCalledTimes(4) // called twice one, for each model

        await tier.save()

        expect(sentinal).toBeCalledTimes(6) // apparently saving causes an update(?)
    })
})
