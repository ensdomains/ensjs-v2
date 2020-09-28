# ENS.js V2

## Overview of the API

### Setup

```
import ENS, { getEnsAddress } from '@ensdomains/ensjs2'



const ens = new ENS({ provider, ensAddress: getEnsAddress('1') })

ens.name('resolver.eth').getAddress() // 0x123
```

### exports

```
default - ENS
getEnsAddress
getResolverContract
getENSContract
namehash
labelhash
```

### ENS Interface

```
name(name: String) => Name
```

```
resolver(address: EthereumAddress) => Resolver
```

```
async getName(address: EthereumAddress) => Promise<Name>
```

```
async setReverseRecord(name: Name) => Promise<EthersTxObject>
```

### Name Interface

```ts
async getOwner() => Promise<EthereumAddress>
```

```ts
async setOwner(address: EthereumAddress) => Promise<Ethers>
```

```ts
async getResolver() => Promise<EthereumAddress>
```

```ts
async setResolver(address: EthereumAddress) => Promise<EthereumAddress>
```

```ts
async getTTL() => Promise<Number>
```

```ts
async getAddress(coinId: Number) => Promise<EthereumAddress>
```

```ts
async setAddress(key: Number, address: EthereumAddress) => Promise<EthersTxObject>
```

```ts
async getContent() => Promise<ContentHash>
```

```ts
async setContenthash(content: ContentHash) => Promise<EthersTxObject>
```

```ts
async getText(key: String) => Promise<String>
```

```ts
async setText(key: String, recordValue: String) => Promise<EthersTxObject>
```

```ts
async setSubnodeOwner(label: String, newOwner: EthereumAddress) => Promise<EthersTxObject>
```

```ts
async setSubnodeRecord(label: String, newOwner: EthereumAddress, resolver: EthereumAddress, ttl: ?Number) => Promise<EthersTxObject>
```

```ts
 async createSubdomain(label: String) => Promise<EthersTxObject>
```

```ts
async deleteSubdomain(label: String) => Promise<EthersTxObject>
```

## Resolver Interface

```ts
;(address) => EthereumAddress
```

```ts
name(name) => Name
```
