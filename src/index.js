import { ethers } from 'ethers'
const Provider = ethers.providers.Provider
import { provider } from 'web3-core'; // used for type checking
import { formatsByName } from '@ensdomains/address-encoder'
import { abi as ensContract } from '@ensdomains/ens/build/contracts/ENS.json'
import { abi as resolverContract } from '@ensdomains/resolver/build/contracts/Resolver.json'
import { abi as reverseRegistrarContract } from '@ensdomains/ens/build/contracts/ReverseRegistrar.json'

import { emptyAddress, namehash, labelhash } from './utils'
import {
  isValidContenthash,
  encodeContenthash,
  decodeContenthash,
} from './utils/contents'
const utils = ethers.utils

function getEnsAddress(networkId) {
  if ([1, 3, 4, 5].includes(parseInt(networkId))) {
    return '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
  }
}

/**
 * Get Resolver Contract
 *
 * @param {{address: string, provider: Provider|provider}}
 * @returns {Contract}
 */
function getResolverContract({ address, provider }) {
  return new ethers.Contract(address, resolverContract, provider)
}

/**
 * Get ENS Contract
 *
 * @param {{address: string, provider: Provider|provider}}
 * @returns {Contract}
 */
function getENSContract({ address, provider }) {
  return new ethers.Contract(address, ensContract, provider)
}

/**
 * Get Reverse Registrar Contract
 * @param {{address: string, provider: Provider}}
 * @returns {Contract}
 */
function getReverseRegistrarContract({ address, provider }) {
  return new ethers.Contract(address, reverseRegistrarContract, provider)
}

/**
 * Get address with resolver
 * @param {{name: string, key: string, resolverAddr: string, provider: Provider|provider}}
 * @returns {*}
 */
async function getAddrWithResolver({ name, key, resolverAddr, provider }) {
  const nh = namehash(name)
  try {
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider,
    })
    const { coinType, encoder } = formatsByName[key]
    const addr = await Resolver['addr(bytes32,uint256)'](nh, coinType)
    if (addr === '0x') return emptyAddress

    return encoder(Buffer.from(addr.slice(2), 'hex'))
  } catch (e) {
    console.log(e)
    console.warn(
      'Error getting addr on the resolver contract, are you sure the resolver address is a resolver contract?'
    )
    return emptyAddress
  }
}

/**
 * Set address with resolver
 * @param {{name: string, key: string, address: string, resolverAddr: string, signer: Provider|provider}}
 * @returns {*}
 */
async function setAddrWithResolver({
  name,
  key,
  address,
  resolverAddr,
  signer,
}) {
  const nh = namehash(name)
  const Resolver = getResolverContract({
    address: resolverAddr,
    provider: signer,
  })
  const { decoder, coinType } = formatsByName[key]
  let addressAsBytes
  if (!address || address === '') {
    addressAsBytes = Buffer.from('')
  } else {
    addressAsBytes = decoder(address)
  }
  return Resolver['setAddr(bytes32,uint256,bytes)'](
    nh,
    coinType,
    addressAsBytes
  )
}

/**
 * Get content with resolver
 * @param {{name: string, resolverAddr: string, provider: Provider|provider}}
 * @returns {*}
 */
async function getContentWithResolver({ name, resolverAddr, provider }) {
  const nh = namehash(name)
  if (parseInt(resolverAddr, 16) === 0) {
    return emptyAddress
  }
  try {
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider,
    })
    const contentHashSignature = utils
      .solidityKeccak256(['string'], ['contenthash(bytes32)'])
      .slice(0, 10)

    const isContentHashSupported = await Resolver.supportsInterface(
      contentHashSignature
    )

    if (isContentHashSupported) {
      const { protocolType, decoded, error } = decodeContenthash(
        await Resolver.contenthash(nh)
      )
      if (error) {
        console.log('error decoding', error)
        return {
          value: emptyAddress,
          contentType: 'contenthash',
        }
      }
      return {
        value: `${protocolType}://${decoded}`,
        contentType: 'contenthash',
      }
    } else {
      const value = await Resolver.content(nh)
      return {
        value,
        contentType: 'oldcontent',
      }
    }
  } catch (e) {
    const message =
      'Error getting content on the resolver contract, are you sure the resolver address is a resolver contract?'
    console.warn(message, e)
    return { value: message, contentType: 'error' }
  }
}

/**
 * Set contenthash with resolver
 * @param {{name: string, content: string, resolverAddr: string, signer: Provider|provider}}
 * @returns {*}
 */
async function setContenthashWithResolver({
  name,
  content,
  resolverAddr,
  signer,
}) {
  let encodedContenthash = content
  if (parseInt(content, 16) !== 0) {
    encodedContenthash = encodeContenthash(content)
  }
  const Resolver = getResolverContract({
    address: resolverAddr,
    provider: signer,
  })
  return Resolver.setContenthash(namehash(name), encodedContenthash)
}

/**
 * Get text with resolver
 * @param {{name: string, key: string, resolverAddr: string, provider: Provider|provider}}
 * @returns {Promise<string|*>}
 */
async function getTextWithResolver({ name, key, resolverAddr, provider }) {
  const nh = namehash(name)
  if (parseInt(resolverAddr, 16) === 0) {
    return ''
  }
  try {
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider,
    })
    const addr = await Resolver.text(nh, key)
    return addr
  } catch (e) {
    console.warn(
      'Error getting text record on the resolver contract, are you sure the resolver address is a resolver contract?'
    )
    return ''
  }
}

/**
 * Set text with resolver
 * @param {{name: string, key: string, recordValue: *, resolverAddr: string, signer: Provider|provider}}
 * @returns {Promise<*|< | >>}
 */
async function setTextWithResolver({
  name,
  key,
  recordValue,
  resolverAddr,
  signer,
}) {
  const nh = namehash(name)
  return getResolverContract({
    address: resolverAddr,
    provider: signer,
  }).setText(nh, key, recordValue)
}

class Resolver {

  /**
   * Resolver
   * {{address: string, ens: ENS}}
   */
  constructor({ address, ens }) {
    this.address = address
    this.ens = ens
  }

  /**
   * name
   *
   * @param {string} name
   * @returns {Name}
   */
  name(name) {
    return new Name({
      name,
      ens: this.ens,
      provider: this.provider,
      signer: this.signer,
      resolver: this.address,
    })
  }
}

class Name {
  /**
   * Name
   * @param {Object} options
   * @param {Name} options.name
   * @param {ENS} options.ens
   * @param {Provider|provider} options.provider
   * @param {Provider|provider} options.signer
   * @param {string} options.namehash
   * @param {Resolver} options.resolver
   */
  constructor(options) {
    const { name, ens, provider, signer, namehash: nh, resolver } = options
    if (options.namehash) {
      this.namehash = nh
    }
    this.ens = ens
    this.ensWithSigner = this.ens.connect(signer)
    this.name = name
    this.namehash = namehash(name)
    this.provider = provider
    this.signer = signer
    this.resolver = resolver
  }

  /**
   * Return the owner
   * @returns {Promise<*>}
   */
  async getOwner() {
    return this.ens.owner(this.namehash)
  }

  /**
   * Set the owner
   * @param {string} address
   * @returns {Promise<*|< | >>}
   */
  async setOwner(address) {
    if (!address) throw new Error('No newOwner address provided!')
    return this.ensWithSigner.setOwner(this.namehash, address)
  }

  /**
   * Get the resolver
   * @returns {Promise<Resolver>}
   */
  async getResolver() {
    return this.ens.resolver(this.namehash)
  }

  /**
   * Set the resolver
   * @param {string} address
   * @returns {Promise<*|< | >>}
   */
  async setResolver(address) {
    if (!address) throw new Error('No resolver address provided!')
    return this.ensWithSigner.setResolver(this.namehash, address)
  }

  /**
   * Get Time To Live
   * @returns {Promise<*>}
   */
  async getTTL() {
    return this.ens.ttl(this.namehash)
  }

  /**
   * Get Resolver Address
   * @returns {Promise<Resolver>}
   */
  async getResolverAddr() {
    if (this.resolver) {
      return this.resolver // hardcoded for old resolvers or specific resolvers
    } else {
      return this.getResolver()
    }
  }

  /**
   * Get Resolver
   * @param {string} [coinId]
   * @returns {Promise<*>}
   */
  async getAddress(coinId) {
    const resolverAddr = await this.getResolverAddr()
    if (parseInt(resolverAddr, 16) === 0) return emptyAddress
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider: this.provider,
    })
    if (!coinId) {
      return Resolver['addr(bytes32)'](this.namehash)
    }
    //TODO add coinID

    return getAddrWithResolver({
      name: this.name,
      key: coinId,
      resolverAddr,
      provider: this.provider,
    })
  }

  /**
   * Set the address
   * @param {string} key
   * @param {string} address
   * @returns {Promise<*>}
   */
  async setAddress(key, address) {
    if (!key) {
      throw new Error('No coinId provided')
    }

    if (!address) {
      throw new Error('No address provided')
    }
    const resolverAddr = await this.getResolverAddr()
    return setAddrWithResolver({
      name: this.name,
      key,
      address,
      resolverAddr,
      signer: this.signer,
    })
  }

  /**
   * Get the content
   * @returns {Promise<*>}
   */
  async getContent() {
    const resolverAddr = await this.getResolverAddr()
    return getContentWithResolver({
      name: this.name,
      resolverAddr,
      provider: this.provider,
    })
  }

  /**
   * Set the content hash
   * @param {string} content
   * @returns {Promise<*>}
   */
  async setContenthash(content) {
    const resolverAddr = await this.getResolverAddr()
    console.log(content)
    return setContenthashWithResolver({
      name: this.name,
      content,
      resolverAddr,
      signer: this.signer,
    })
  }

  /**
   * Get the text
   * @param {string} key
   * @returns {Promise<string|*>}
   */
  async getText(key) {
    const resolverAddr = await this.getResolverAddr()
    return getTextWithResolver({
      name: this.name,
      key,
      resolverAddr,
      provider: this.provider,
    })
  }

  /**
   * Set the text
   * @param {string} key
   * @param {*} recordValue
   * @returns {Promise<*>}
   */
  async setText(key, recordValue) {
    const resolverAddr = await this.getResolverAddr()
    return setTextWithResolver({
      name: this.name,
      key,
      recordValue,
      resolverAddr,
      signer: this.signer,
    })
  }

  /**
   * Set subnode owner
   * @param {string} label
   * // todo check this is a string (newOwner)
   * @param {string} newOwner
   * @returns {Promise<*|< | >>}
   */
  async setSubnodeOwner(label, newOwner) {
    const lh = labelhash(label)
    return this.ensWithSigner.setSubnodeOwner(this.namehash, lh, newOwner)
  }

  /**
   * Set Subnode Record
   * @param {string} label
   * @param {string} newOwner
   * @param {Resolver} resolver
   * @param {number} ttl
   * @returns {Promise<*|< | >>}
   */
  async setSubnodeRecord(label, newOwner, resolver, ttl = 0) {
    const lh = labelhash(label)
    return this.ensWithSigner.setSubnodeRecord(
      this.namehash,
      lh,
      newOwner,
      resolver,
      ttl
    )
  }

  /**
   * Create subdomain
   * @param {string} label
   * @returns {Promise<*>}
   */
  async createSubdomain(label) {
    const resolverPromise = this.getResolver()
    const ownerPromise = this.getOwner()
    const [resolver, owner] = await Promise.all([resolverPromise, ownerPromise])
    return this.setSubnodeRecord(label, owner, resolver)
  }

  /**
   * Delete Subdomain
   * @param {string} label
   * @returns {Promise<*>}
   */
  async deleteSubdomain(label) {
    return this.setSubnodeRecord(label, emptyAddress, emptyAddress)
  }
}

export default class ENS {
  /**
   * ENS
   * @param {Object} options
   * @param {*} [options.networkId]
   * @param {Provider|provider} options.provider
   * @param {string} [options.ensAddress]
   */
  constructor(options) {
    const { networkId, provider, ensAddress } = options
    let ethersProvider
    if (Provider.isProvider(provider)) {
      //detect ethersProvider
      ethersProvider = provider
    } else {
      ethersProvider = new ethers.providers.Web3Provider(provider)
    }
    this.provider = ethersProvider
    this.signer = ethersProvider.getSigner()
    this.ens = getENSContract({
      address: ensAddress ? ensAddress : registries[networkId],
      provider: ethersProvider,
    })
  }

  /**
   * name
   * @param {string} name
   * @returns {Name}
   */
  name(name) {
    return new Name({
      name,
      ens: this.ens,
      provider: this.provider,
      signer: this.signer,
    })
  }

  /**
   * resolver
   * @param {string} address
   * @returns {Resolver}
   */
  resolver(address) {
    return new Resolver({
      ens: this.ens,
      provider: this.provider,
      address: address,
    })
  }

  /**
   * getName
   * @param {string} address
   * @returns {Promise<{name: null}|{name: *}|undefined>}
   */
  async getName(address) {
    const reverseNode = `${address.slice(2)}.addr.reverse`
    const resolverAddr = await this.ens.resolver(namehash(reverseNode))
    return this.getNameWithResolver(address, resolverAddr)
  }

  /**
   * getNameWithResolver
   * @param {string} address
   * @param {string} resolverAddr
   * @returns {Promise<{name: null}|{name: *}>}
   */
  async getNameWithResolver(address, resolverAddr) {
    const reverseNode = `${address.slice(2)}.addr.reverse`
    const reverseNamehash = namehash(reverseNode)
    if (parseInt(resolverAddr, 16) === 0) {
      return {
        name: null,
      }
    }

    try {
      const Resolver = getResolverContract({
        address: resolverAddr,
        provider: this.provider,
      })
      const name = await Resolver.name(reverseNamehash)
      return {
        name,
      }
    } catch (e) {
      console.log(`Error getting name for reverse record of ${address}`, e)
    }
  }

  /**
   * setReverseRecord
   * @param {string} name
   * @param {*} overrides
   * @returns {Promise<*>}
   */
  async setReverseRecord(name, overrides) {
    const reverseRegistrarAddr = await this.name('addr.reverse').getOwner(
      'addr.reverse'
    )
    const reverseRegistrar = getReverseRegistrarContract({
      address: reverseRegistrarAddr,
      provider: this.signer,
    })
    return reverseRegistrar.setName(name)
  }
}

export {
  namehash,
  labelhash,
  getENSContract,
  getResolverContract,
  getEnsAddress,
}
