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

async function getContentWithResolver({ name, resolverAddr, provider }) {
  const nh = namehash(name)
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
  return Resolver.setContenthash(this.namehash, encodedContenthash)
}

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
  //TODO
  constructor({ address, ens }) {
    this.address = address
    this.ens = ens
  }
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

  async getResolverAddr() {
    if (this.resolver) {
      return this.resolver // hardcoded for old resolvers or specific resolvers
    } else {
      return this.getResolver()
    }
  }

  async getAddress(coinId) {
    const resolverAddr = await getResolverAddr()

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

  async setAddress(key, address) {
    const resolverAddr = await getResolverAddr()
    return setAddrWithResolver({
      name: this.name,
      key,
      address,
      resolverAddr,
      signer: this.signer,
    })
  }

  async getContent() {
    const resolverAddr = await getResolverAddr()
    return getContentWithResolver({
      name: this.name,
      resolverAddr,
      provider: this.provider,
    })
  }

  async setContenthash(content) {
    const resolverAddr = await getResolverAddr()
    return setContenthashWithResolver({
      name,
      content,
      resolverAddr,
      signer: this.signer,
    })
  }

  async getText(key) {
    const resolverAddr = await getResolverAddr()
    return getTextWithResolver({
      name,
      key,
      resolverAddr,
      provider: this.provider,
    })
  }

  async setText(key, recordValue) {
    const resolverAddr = await getResolverAddr()
    return setTextWithResolver(key, recordValue, resolverAddr)
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
    return new Resolver({
      ens: this.ens,
      provider: this.provider,
      address: address,
    })
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
