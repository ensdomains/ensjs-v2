# Use sidjs SDK to interact with SID contracts 


# SID.js
SIDjs integrates the SID contract and ENS and supports all the ENSjs APIs,  you will only need one unified SDK to integrate all domains across multiple chains. SIDjs will hide all the complicated cross-chain detail from the partners, making the integration very easy.

## Overview of the API

### Installation
Install @siddomains/sidjs, alongside [web3](https://www.npmjs.com/package/web3).
```
npm install @siddomains/sidjs web3
```
### Getting Started
All that's needed to get started is a web3 provider instance, you should pass it and select network id when creating a new SID instance.
```
// bsc test domain example
const SID = require('@siddomains/sidjs').default      
const SIDfunctions = require('@siddomains/sidjs')                                                                                                                                                                                
const Web3 = require('web3')                                                                                                                

let sid 

async function main(name) {
  const infura = "https://data-seed-prebsc-1-s1.binance.org:8545/"  
  const provider = new Web3.providers.HttpProvider(infura)
  sid = new SID({ provider, sidAddress: SIDfunctions.getSidAddress('97') })

  const address = await sid.name(name).getAddress() // 0x123                                                                                
  console.log("name: %s, address: %s", name, address)                                                                                          

}                                                                                                                                           
main("resolver.bnb")
```

```
// bsc mainnet domain example
const SID = require('@siddomains/sidjs').default      
const SIDfunctions = require('@siddomains/sidjs')                                                                                                                                                                                
const Web3 = require('web3')                                                                                                                

let sid 

async function main(name) {
  const infura = "https://bsc-dataseed.binance.org/"  
  const provider = new Web3.providers.HttpProvider(infura)
  sid = new SID({ provider, sidAddress: SIDfunctions.getSidAddress('56') })

  const address = await sid.name(name).getAddress() // 0x123                                                                                
  console.log("name: %s, address: %s", name, address)                                                                                          

}                                                                                                                                           
main("resolver.bnb")
```

```
// ens domain example
const SID = require('@siddomains/sidjs').default      
const SIDfunctions = require('@siddomains/sidjs')                                                                                                                                                                                
const Web3 = require('web3')                                                                                                                

let sid 

async function main(name) {
  const infura = "https://web3.ens.domains/v1/mainnet"
  const provider = new Web3.providers.HttpProvider(infura)
  sid = new SID({ provider, sidAddress: SIDfunctions.getSidAddress('1') })

  const address = await sid.name(name).getAddress() // 0x123                                                                                
  console.log("name: %s, address: %s", name, address)                                                                                          

}                                                                                                                                           
main("resolver.ens")

```

### exports

```
default - SID
getSidAddress
getResolverContract
getSIDContract
namehash
labelhash
```

### SID Interface

```
name(name: String) => Name
```

Returns a Name Object, that allows you to make record queries.

```
resolver(address: EvmAddress) => Resolver
```

Returns a Resolver Object, allowing you to query names from this specific resolver. Most useful when querying a different resolver that is different than is currently recorded on the registry. E.g. migrating to a new resolver

```
async getName(address: EvmAddress) => Promise<Name>
```

Returns the reverse record for a particular Evm address.

```
async setReverseRecord(name: Name) => Promise<EthersTxObject>
```

Sets the reverse record for the current Evm address

### Name Interface

```ts
async getOwner() => Promise<EvmAddress>
```

Returns the owner/controller for the current SID name.

```ts
async setOwner(address: EvmAddress) => Promise<Ethers>
```

Sets the owner/controller for the current SID name.

```ts
async getResolver() => Promise<EvmAddress>
```

Returns the resolver for the current SID name.

```ts
async setResolver(address: EvmAddress) => Promise<EvmAddress>
```

Sets the resolver for the current SID name.

```ts
async getTTL() => Promise<Number>
```

Returns the TTL for the current SID name.

```ts
async getAddress(coinId: String) => Promise<EvmAddress>
```

Returns the address for the current SID name for the coinId provided.

```ts
async setAddress(coinId: String, address: EvmAddress) => Promise<EthersTxObject>
```

Sets the address for the current SID name for the coinId provided.

```ts
async getContent() => Promise<ContentHash>
```

Returns the contentHash for the current SID name.

```ts
async setContenthash(content: ContentHash) => Promise<EthersTxObject>
```

Sets the contentHash for the current SID name.

```ts
async getText(key: String) => Promise<String>
```

Returns the text record for a given key for the current SID name.

```ts
async setText(key: String, recordValue: String) => Promise<EthersTxObject>
```

Sets the text record for a given key for the current SID name.

```ts
async setSubnodeOwner(label: String, newOwner: EvmAddress) => Promise<EthersTxObject>
```

Sets the subnode owner for a subdomain of the current SID name.

```ts
async setSubnodeRecord(label: String, newOwner: EvmAddress, resolver: EvmAddress, ttl: ?Number) => Promise<EthersTxObject>
```

Sets the subnode owner, resolver, ttl for a subdomain of the current SID name in one transaction.

```ts
 async createSubdomain(label: String) => Promise<EthersTxObject>
```

Creates a subdomain for the current SID name. Automatically sets the owner to the signing account.

```ts
async deleteSubdomain(label: String) => Promise<EthersTxObject>
```

Deletes a subdomain for the current SID name. Automatically sets the owner to "0x0..."

## Resolver Interface

```ts
address
```

Static property that returns current resolver address

```ts
name(name) => Name
```

Returns a Name Object that hardcodes the resolver
