import { ethers } from 'ethers'
import { formatsByName } from '@ensdomains/address-encoder'
import { abi as ensContract } from '@ensdomains/ens/build/contracts/ENS.json'
import { abi as resolverContract } from '@ensdomains/resolver/build/contracts/Resolver.json'

import { emptyAddress, namehash, labelhash } from './utils'
import {
  isValidContenthash,
  encodeContenthash,
  decodeContenthash,
} from './utils/contents'
const utils = ethers.utils

let registries = {
  1: '0x314159265dd8dbb310642f98f50c066173c1259b',
  3: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
  4: '0xe7410170f87102df0055eb195163a03b7f2bff4a',
  5: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
}

function getResolverContract({ address, provider }) {
  return new ethers.Contract(address, resolverContract, provider)
}

function getENSContract({ address, provider }) {
  return new ethers.Contract(address, ensContract, provider)
}

class Resolver {
  //TODO
  constructor({ address, ens }) {
    this.address = address
    this.ens = ens
  }
}

class Name {
  constructor(options) {
    const { name, ens, provider, signer, namehash: nh } = options
    if (options.namehash) {
      this.namehash = nh
    }
    this.ens = ens
    this.ensWithSigner = this.ens.connect(signer)
    this.name = name
    this.namehash = namehash(name)
    this.provider = provider
    this.signer = signer
  }

  async getOwner() {
    return this.ens.owner(this.namehash)
  }

  async setOwner(address) {
    if (!address) throw new Error('No newOwner address provided!')
    return this.ensWithSigner.setOwner(this.namehash, address)
  }

  async getResolver() {
    return this.ens.resolver(this.namehash)
  }

  async setResolver(address) {
    if (!address) throw new Error('No resolver address provided!')
    return this.ensWithSigner.setResolver(this.namehash, address)
  }

  async getTTL() {
    return this.ens.ttl(this.namehash)
  }

  async getAddress(coinId) {
    const resolverAddr = await this.getResolver()
    if (parseInt(resolverAddr, 16) === 0) return emptyAddress
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider: this.provider,
    })
    if (!coinId) {
      return Resolver['addr(bytes32)'](this.namehash)
    }
    //TODO add coinID

    return this.getAddrWithResolver(coinId, resolverAddr)
  }

  async getAddrWithResolver(key, resolverAddr) {
    try {
      const Resolver = getResolverContract({
        address: resolverAddr,
        provider: this.provider,
      })
      const { coinType, encoder } = formatsByName[key]
      const addr = await Resolver['addr(bytes32,uint256)'](
        this.namehash,
        coinType
      )
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

  async setAddress(key, address) {
    const resolverAddr = await this.getResolver()
    return this.setAddrWithResolver(key, address, resolverAddr)
  }

  async setAddrWithResolver(key, address, resolverAddr) {
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider: this.signer,
    })
    const { decoder, coinType } = formatsByName[key]
    let addressAsBytes
    if (!address || address === '') {
      addressAsBytes = Buffer.from('')
    } else {
      addressAsBytes = decoder(address)
    }
    return Resolver['setAddr(bytes32,uint256,bytes)'](
      this.namehash,
      coinType,
      addressAsBytes
    )
  }

  async getContent() {
    const resolver = await this.getResolver()
    return this.getContentWithResolver(resolver)
  }

  async getContentWithResolver(resolverAddr) {
    if (parseInt(resolverAddr, 16) === 0) {
      return emptyAddress
    }
    try {
      const Resolver = getResolverContract({
        address: resolverAddr,
        provider: this.provider,
      })
      const contentHashSignature = utils
        .solidityKeccak256(['string'], ['contenthash(bytes32)'])
        .slice(0, 10)

      const isContentHashSupported = await Resolver.supportsInterface(
        contentHashSignature
      )

      if (isContentHashSupported) {
        const { protocolType, decoded, error } = decodeContenthash(
          await Resolver.contenthash(this.namehash)
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
        const value = await Resolver.content(this.namehash)
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

  async setContenthash(content) {
    const resolverAddr = await this.getResolver(this.name)
    return this.setContenthashWithResolver(content, resolverAddr)
  }

  async setContenthashWithResolver(content, resolverAddr) {
    let encodedContenthash = content
    if (parseInt(content, 16) !== 0) {
      encodedContenthash = encodeContenthash(content)
    }
    const Resolver = getResolverContract({
      address: resolverAddr,
      provider: this.signer,
    })
    return Resolver.setContenthash(this.namehash, encodedContenthash)
  }

  async getText(key) {
    const resolverAddr = await this.getResolver(this.name)
    return this.getTextWithResolver(key, resolverAddr)
  }

  async getTextWithResolver(key, resolverAddr) {
    if (parseInt(resolverAddr, 16) === 0) {
      return ''
    }
    try {
      const Resolver = getResolverContract({
        address: resolverAddr,
        provider: this.provider,
      })
      const addr = await Resolver.text(this.namehash, key)
      return addr
    } catch (e) {
      console.warn(
        'Error getting text record on the resolver contract, are you sure the resolver address is a resolver contract?'
      )
      return ''
    }
  }

  async setText(key, recordValue) {
    const resolverAddr = await this.getResolver(this.name)
    return this.setTextWithResolver(key, recordValue, resolverAddr)
  }

  async setTextWithResolver(key, recordValue, resolverAddr) {
    return getResolverContract({
      address: resolverAddr,
      provider: this.signer,
    }).setText(this.namehash, key, recordValue)
  }

  async setSubnodeOwner(label, newOwner) {
    const lh = labelhash(label)
    return this.ensWithSigner.setSubnodeOwner(this.namehash, lh, newOwner)
  }

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

  async createSubdomain(label) {
    const resolverPromise = this.getResolver()
    const ownerPromise = this.getOwner()
    const [resolver, owner] = await Promise.all([resolverPromise, ownerPromise])
    return this.setSubnodeRecord(label, owner, resolver)
  }

  async deleteSubdomain(label) {
    return this.setSubnodeRecord(label, emptyAddress, emptyAddress)
  }
}

export default class ENS {
  constructor(options) {
    const { networkId, provider, ensAddress } = options
    const ethersProvider = new ethers.providers.Web3Provider(provider)
    this.provider = ethersProvider
    this.signer = ethersProvider.getSigner()
    this.ens = getENSContract({
      address: ensAddress ? ensAddress : registries[networkId],
      provider: ethersProvider,
    })
  }

  name(name) {
    return new Name({
      name,
      ens: this.ens,
      provider: this.provider,
      signer: this.signer,
    })
  }

  resolver(address) {
    return new Resolver({ ens: this.ens, provider: this.provider })
  }

  async getName(address) {
    const reverseNode = `${address.slice(2)}.addr.reverse`
    const resolverAddr = await this.ens.resolver(namehash(reverseNode))
    return this.getNameWithResolver(address, resolverAddr)
  }

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
  setReverseRecord() {
    //TODO
  }
}

export { namehash, labelhash, getENSContract, getResolverContract }
