import { namehash } from './utils/namehash'
import { abi as ensContract } from '@ensdomains/ens/build/contracts/ENS.json'
import { abi as resolverContract } from '@ensdomains/resolver/build/contracts/Resolver.json'

let registries = {
  1: '0x314159265dd8dbb310642f98f50c066173c1259b',
  3: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
  4: '0xe7410170f87102df0055eb195163a03b7f2bff4a',
  5: '0x112234455c3a32fd11230c42e7bccd4a84e02010'
}

let web3
let ENS

function getNamehash(unsanitizedName) {
  return namehash(unsanitizedName)
}

async function getNetworkId() {
  return web3.eth.net.getId()
}

async function getResolverContract(addr) {
  return new web3.eth.Contract(resolverContract, addr, resolverContract)
}

async function getENSContract() {
  const networkId = await getNetworkId()
  return new web3.eth.Contract(ensContract, contracts[networkId].registry)
}

const getENS = async ensAddress => {
  const networkId = await getNetworkId()
  const hasRegistry = registries[networkId] !== undefined

  if (!ENS) {
    if (!hasRegistry && !ensAddress) {
      throw new Error(`Unsupported network ${networkId}`)
    } else if (!ensAddress) {
      ensAddress = registries[networkId]
    }

    contracts[networkId].registry = ensAddress
  } else {
    return ENS
  }

  const ENSContract = await getENSContract()
  ENS = ENSContract

  return ENSContract
}

async function resolve(input) {
  const ENS = await getENS()
  const isAddress = web3.utils.isAddress(input)
  if (isAddress) {
    const reverseName = `${input.slice(0, 2)}.addr.reverse`
    const reverseNode = getNamehash(reverseName)
    const resolverAddr = await ENS.resolver(reverseNode).call()
    const Resolver = await getResolverContract(resolverAddr)
    const name = await Resolver.name(reverseNode).call()

    return name
  }

  const namehash = getNamehash(input)
  const resolverAddr = await ENS.resolver(namehash).call()
  const Resolver = await getResolverContract(resolverAddr)
  return Resolver.name(namehash).call()
}

export default function setupENSLite({ web3: web3Instance, ensAddress }) {
  web3 = web3Instance
  ensAddress = ensAddress

  return resolve
}
