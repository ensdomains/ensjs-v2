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
resolver(address: String)
```

```
async getName(address: String) => String
```

```
async setReverseRecord(name: String) => EthersTxObject
```
