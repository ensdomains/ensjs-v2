import { ethers } from 'ethers'
import { abi as ensContract } from '@ensdomains/ens/build/contracts/ENS.json'
import { abi as resolverContract } from '@ensdomains/resolver/build/contracts/Resolver.json'

import { emptyAddress, namehash, labelhash } from './utils'

let registries = {
  1: '0x314159265dd8dbb310642f98f50c066173c1259b',
  3: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
  4: '0xe7410170f87102df0055eb195163a03b7f2bff4a',
  5: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
}

let web3

async function getNetworkId() {
  return web3.eth.net.getId()
}

function getResolverContract({ address, provider }) {
  return new ethers.Contract(address, resolverContract, provider)
}

function getENSContract({ address, provider }) {
  console.log(address, provider, ensContract)
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
    this.signer = signer
  }

  async getAddr() {
    return
  }

  async getOwner() {
    return this.ens.owner(this.namehash)
  }

  async getResolver() {
    return this.ens.resolver(this.namehash)
  }

  async getTTL(name) {
    return this.ens.ttl(this.namehash)
  }

  async setResolver(address) {
    if (!address) throw new Error('No resolver address provided!')
    return this.ensWithSigner.setResolver(this.namehash, address)
  }

  async setOwner(address) {
    if (!address) throw new Error('No newOwner address provided!')
    return this.ensWithSigner.setOwner(this.namehash, address)
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

  getReverseRecord() {
    //TODO
  }
  setReverseRecord() {
    //TODO
  }
}

export { namehash, labelhash, getENSContract }
