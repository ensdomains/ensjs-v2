/**
 * @jest-environment node
 */
import ganache from 'ganache-core'
import {
  setupWeb3 as setupWeb3Test,
  getAccounts,
} from '../testing-utils/web3Util'
import { deployENS } from '@ensdomains/mock'
//import { getENS, getNamehash } from '../ens'
import ENS, { namehash, labelhash, getENSContract } from '../index.js'
import '../testing-utils/extendExpect'
import Web3 from 'web3'
import { ethers } from 'ethers'

const ENVIRONMENTS = ['GANACHE_GUI', 'GANACHE_CLI', 'GANACHE_CLI_MANUAL']
const ENV = ENVIRONMENTS[1]

let reverseRegistrar
let baseRegistrar
let provider
let ens
let ensContract
let publicResolver

describe('Blockchain tests', () => {
  beforeAll(async () => {
    switch (ENV) {
      case 'GANACHE_CLI':
        provider = ganache.provider()
        var web3 = await setupWeb3Test({ provider, Web3 })
        break
      case 'GANACHE_GUI':
        provider = new Web3.providers.HttpProvider('http://localhost:7545')
        var web3 = await setupWeb3Test({ provider, Web3 })
        break
      case 'GANACHE_CLI_MANUAL':
        provider = new Web3.providers.HttpProvider('http://localhost:8545')
        var web3 = await setupWeb3Test({ provider, Web3 })
        break
      default:
        const options = ENVIRONMENTS.join(' or ')
        throw new Error(`ENV not set properly, please pick from ${options}`)
    }

    const accounts = await getAccounts()
    expect(accounts.length).toBeGreaterThan(0)

    const {
      ensAddress,
      reverseRegistrarAddress,
      baseRegistrarAddress,
      resolverAddress,
    } = await deployENS({
      web3,
      accounts,
    })

    baseRegistrar = baseRegistrarAddress
    reverseRegistrar = reverseRegistrarAddress
    publicResolver = resolverAddress

    ens = new ENS({ provider, ensAddress })
    const ethersProvider = new ethers.providers.Web3Provider(provider)
    const signer = ethersProvider.getSigner()
    ensContract = getENSContract({
      provider: signer,
      address: ensAddress,
    })
  }, 1000000)

  describe('Test contract and Web3 setup', () => {
    test('accounts exist', async () => {
      expect(true).toBe(true)
      const accounts = await getAccounts()
      expect(accounts.length).toBeGreaterThan(0)
    })

    test('ens registry, resolver and reverse registrar deployed', async () => {
      // const accounts = await getAccounts()
      // const ethOwner = await ens.name('eth').getOwner()
      // expect(ethOwner).toBe(baseRegistrar)
      // const reverseOwner = await ens.name('reverse').getOwner()
      // expect(reverseOwner).toBe(accounts[0])
      // const reverseNodeOwner = await ens.name('addr.reverse').getOwner()
      // expect(reverseNodeOwner).toBe(reverseRegistrar)
    })
  })

  describe('Registry', () => {
    test('getOwner returns owner', async () => {
      const accounts = await getAccounts()
      const owner = await ens.name('resolver.eth').getOwner()
      expect(owner).toBe(accounts[0])
    })
    test('setSubnodeOwner sets new subnode owner', async () => {
      const owner = await ensContract.owner(namehash('subnode.resolver.eth'))
      const accounts = await getAccounts()
      expect(owner).toBe('0x0000000000000000000000000000000000000000')
      const tx = await ens
        .name('resolver.eth')
        .setSubnodeOwner('subnode', accounts[0])
      await tx.wait()
      const newOwner = await ensContract.owner(namehash('subnode.resolver.eth'))
      expect(newOwner).toBe(accounts[0])
    })
    // test('setSubnodeRecord sets new subnode owner', async () => {
    //   const accounts = await getAccounts()
    //   const tx = await ens
    //     .name('resolver.eth')
    //     .setSubnodeRecord('subnode', accounts[1], publicResolver, 0)
    //   await tx.wait()
    //   const hash = namehash('subnode.resolver.eth')
    //   const newOwner = await ensContract.owner(hash)
    //   const newResolver = await ensContract.resolver(hash)
    //   const newTTL = await ensContract.ttl(hash)
    //   expect(newOwner).toBe(accounts[1])
    //   expect(newResolver).toBe(publicResolver)
    //   expect(parseInt(newTTL, 16)).toBe(0)
    // })
    test('setNewOwner sets new owner', async () => {
      const hash = namehash('givethisaway.awesome.eth')
      const owner = await ensContract.owner(hash)
      const accounts = await getAccounts()
      expect(owner).toBe('0x0000000000000000000000000000000000000000')
      const tx = await ensContract.setSubnodeOwner(
        namehash('awesome.eth'),
        labelhash('givethisaway'),
        accounts[0]
      )
      await tx.wait()
      const owner2 = await ensContract.owner(hash)
      expect(owner2).toBe(accounts[0])
      const tx2 = await ens
        .name('givethisaway.awesome.eth')
        .setOwner(accounts[1])
      await tx2.wait()
      const newOwner = await ensContract.owner(hash)
      expect(newOwner).toBe(accounts[1])
    })
    test('getResolver returns a resolver address when set', async () => {
      const resolver = await ens.name('resolver.eth').getResolver()
      expect(resolver).toBeHex()
      expect(resolver).toBeEthAddress()
      expect(resolver).not.toBe('0x0000000000000000000000000000000000000000')
    })
    test('getResolver returns 0x00... when resolver address is not set', async () => {
      const resolver = await ens.name('reverse').getResolver()
      expect(resolver).toBeHex()
      expect(resolver).toBeEthAddress()
      expect(resolver).toBe('0x0000000000000000000000000000000000000000')
    })
    test('setResolver sets the resolver on a node', async () => {
      //test setResolver
      const resolver = await ens.name('awesome.eth').getResolver()
      const mockResolver = '0x0000000000000000000000000000000000abcdef'
      expect(resolver).not.toBe(mockResolver)
      const tx = await ens.name('awesome.eth').setResolver(mockResolver)
      await tx.wait()
      const newResolver = await ens.name('awesome.eth').getResolver()
      expect(newResolver).toBeHex()
      expect(newResolver).toBeEthAddress()
      expect(newResolver.toLowerCase()).toBe(mockResolver)
    })
    test('getTTL returns a TTL', async () => {
      const ttl = await ens.name('resolver.eth').getTTL()
      expect(parseInt(ttl, 16)).toBe(0)
    })
    test('createSubdomain makes a new subdomain', async () => {
      const accounts = await getAccounts()
      const hash = namehash('new.resolver.eth')
      const oldOwner = await ensContract.owner(hash)
      // expect the initial owner to be no one
      expect(oldOwner).toBe('0x0000000000000000000000000000000000000000')
      const tx = await ens.name('resolver.eth').createSubdomain('new')
      await tx.wait()
      const newOwner = await ensContract.owner(hash)
      // Verify owner is the user and therefore the subdomain exists
      expect(newOwner).toBe(accounts[0])
    })
    test('deleteSubdomain deletes a subdomain', async () => {
      const accounts = await getAccounts()
      const hash = namehash('b.subdomaindummy.eth')
      const oldOwner = await ensContract.owner(hash)
      // expect the initial owner to be no one
      expect(oldOwner).toBe('0x0000000000000000000000000000000000000000')
      const tx = await ens.name('subdomaindummy.eth').createSubdomain('b')
      await tx.wait()
      const newOwner = await ensContract.owner(hash)
      // Verify owner is the user and therefore the subdomain exists
      expect(newOwner).toBe(accounts[0])
      const tx2 = await ens.name('subdomaindummy.eth').deleteSubdomain('b')
      await tx2.wait()
      const deletedOwner = await ensContract.owner(hash)
      // Verify owner has been set to 0x00... to ensure deletion
    })
  })

  describe('Resolver', () => {
    test('getAddress returns an address', async () => {
      const addr = await ens.name('resolver.eth').getAddress()
      expect(addr).toBeHex()
      expect(addr).toBeEthAddress()
      expect(addr).not.toBe('0x0000000000000000000000000000000000000000')
    })

    test('getAddress returns 0x000', async () => {
      const accounts = await getAccounts()
      const tx = await ensContract.setSubnodeRecord(
        namehash('testing.eth'),
        labelhash('addr'),
        accounts[0],
        publicResolver,
        0
      )
      await tx.wait()
      const addr = await ens.name('addr.testing.eth').getAddress()
      expect(addr).toBe('0x0000000000000000000000000000000000000000')
    })

    test('getAddr returns an eth address', async () => {
      const addr = await ens.name('resolver.eth').getAddress('ETH')
      expect(addr).toBeHex()
      expect(addr).toBeEthAddress()
      expect(addr).not.toBe('0x0000000000000000000000000000000000000000')
    })

    test('setAddress sets an address', async () => {
      //reverts if no addr is present
      const resolverAddr = await ens.name('resolver.eth').getAddress()
      const tx = await ensContract.setResolver(
        namehash('superawesome.eth'),
        resolverAddr
      )
      await tx.wait()
      const tx2 = await ens
        .name('superawesome.eth')
        .setAddress('ETH', '0x0000000000000000000000000000000000012345')
      await tx2.wait()
      const addr = await ens.name('superawesome.eth').getAddress()
      expect(addr).toBe('0x0000000000000000000000000000000000012345')
    })

    //     test('setAddr sets an eth address', async () => {
    //       //reverts if no addr is present
    //       const resolverAddr = await ens.getAddress('resolver.eth')
    //       const tx = await ens.setResolver('superawesome.eth', resolverAddr)
    //       await tx.wait()
    //       const tx2 = await ens.setAddr(
    //         'superawesome.eth',
    //         'ETH',
    //         '0x0000000000000000000000000000000000012345'
    //       )
    //       await tx2.wait()
    //       const addr = await ens.getAddr('superawesome.eth', 'ETH')
    //       expect(addr).toBe('0x0000000000000000000000000000000000012345')
    //     })

    // test('getContent returns a 32 byte hash', async () => {
    //   const content = await ens.name('oldresolver.eth').getContent()
    //   expect(content.contentType).toBe('oldcontent')
    //   expect(content.value).toBeHex()
    //   expect(content.value).toMatchSnapshot()
    // })

    //     // old content resolver isn't on new registrar

    //     // test('setContent sets 32 byte hash', async () => {
    //     //   await ens.setContent(
    //     //     'oldresolver.eth',
    //     //     '0xd1de9994b4d039f6548d191eb26786769f580809256b4685ef316805265ea162'
    //     //   )

    //     //   const content = await ens.getContent('oldresolver.eth')
    //     //   expect(content.contentType).toBe('oldcontent')
    //     //   expect(content.value).toBeHex()
    //     //   expect(content.value).toMatchSnapshot()
    //     // })

    //     //ipfs://QmTeW79w7QQ6Npa3b1d5tANreCDxF2iDaAPsDvW6KtLmfB
    // test('setContentHash sets up ipfs has', async () => {
    //   const contentHash =
    //     'ipfs://QmTeW79w7QQ6Npa3b1d5tANreCDxF2iDaAPsDvW6KtLmfB'
    //   await ens.setContenthash('abittooawesome.eth', contentHash)

    //   const content = await ens.getContent('abittooawesome.eth')
    //   expect(content.contentType).toBe('contenthash')
    //   expect(content.value).toBe(
    //     'ipfs://QmTeW79w7QQ6Npa3b1d5tANreCDxF2iDaAPsDvW6KtLmfB'
    //   )
    // })

    // test('setContentHash sets 32 byte hash', async () => {
    //   const contentHash =
    //     'bzz://d1de9994b4d039f6548d191eb26786769f580809256b4685ef316805265ea162'
    //   await ens.setContenthash('abittooawesome.eth', contentHash)

    //   const content = await ens.getContent('abittooawesome.eth')
    //   expect(content.contentType).toBe('contenthash')
    //   expect(content.value).toBe(
    //     'bzz://d1de9994b4d039f6548d191eb26786769f580809256b4685ef316805265ea162'
    //   )
    // })
  })

  describe('Reverse Registrar', () => {
    test('reverseNode is owned by reverseRegistrar', async () => {
      const owner = await ens.name('addr.reverse').getOwner()
      expect(reverseRegistrar).toBe(owner)
    })

    test('getName gets a name for an address', async () => {
      const accounts = await getAccounts()
      const { name } = await ens.getName(accounts[2])
      expect(name).toBe('eth')
    })

    // test('claimAndSetReverseRecordName claims and sets a name', async () => {
    //   const accounts = await getAccounts()
    //   const { name } = await ens.getName(accounts[0])
    //   expect(name).toBe('abittooawesome.eth')
    //   const tx = await ens.claimAndSetReverseRecordName('resolver.eth', 2000000)
    //   await tx.wait()
    //   const { name: nameAfter } = await ens.getName(accounts[0])
    //   expect(nameAfter).toBe('resolver.eth')
    // })
  })

  //   describe('Helper functions', () => {
  //     test('getDomainDetails gets rootdomain and resolver details', async () => {
  //       try {
  //         const domain = await ens.getDomainDetails('resolver.eth')
  //         expect(domain.owner).not.toBe(
  //           '0x0000000000000000000000000000000000000000'
  //         )
  //         expect(domain.owner).toBeEthAddress()
  //         expect(domain.resolver).not.toBe(
  //           '0x0000000000000000000000000000000000000000'
  //         )
  //         expect(domain.resolver).toBeEthAddress()
  //         const addr = await ens.getAddress('resolver.eth')
  //         expect(domain.addr).toBe(addr)
  //         expect(domain.content).toMatchSnapshot()
  //       } catch (e) {
  //         console.log('help functions test', e)
  //       }
  //     })

  //     test('getSubdomains gets all subdomains', async () => {
  //       const domains = await ens.getSubdomains('eth')
  //       expect(domains.length).toBeGreaterThan(0)
  //       expect(domains[0].label).toBe('subdomain')
  //     })
  //   })
})
