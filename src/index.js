import { ethers } from 'ethers'
import { namehash } from './utils/namehash'
import { abi as ensContract } from '@ensdomains/ens/build/contracts/ENS.json'
import { abi as resolverContract } from '@ensdomains/resolver/build/contracts/Resolver.json'

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

async function getResolverContract({ address, provider }) {
  return new ethers.Contract(address, resolverContract, provider)
}

async function getENSContract({ address, provider }) {
  return new ethers.Contract(address, ensContract, provider)
}

class Resolver {
  constructor(address, ENS) {
    this.address = address
  }
}

class Name {
  constructor(options) {
    const { name, ens, provider } = options
    this.ens = ens
    this.name = name
    this.namehash = namehash(name)
  }

  getAddr() {
    return
  }

  getOwner() {
    return this.ens.owner(namehash(name))
  }
}

export default class ENS {
  constructor(options) {
    const { networkId, provider, ensAddress } = options
    this.provider = new ethers.providers.Web3Provider(provider)
    this.ens = getENSContract({
      address: ensAddress ? ensAddress : registries[networkId],
      provider: this.provider,
    })
  }

  getName(name) {
    return new Name({
      name,
      ens: this.ens,
      provider: this.provider,
    })
  }
  getResolver(address) {
    return new Resolver(address)
  }

  getReverseRecord() {}
  setReverseRecord() {}
}

export { namehash }
