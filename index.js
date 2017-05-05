/*
    This file is part of ethereum-ens.
    ethereum-ens is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    ethereum-ens is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with ethereum-ens.  If not, see <http://www.gnu.org/licenses/>.
*/

var namehash = require('eth-ens-namehash')
var pako = require('pako');
var Promise = require('bluebird');
var sha3 = require('js-sha3').keccak_256
var textEncoding = require('text-encoding');
var TextDecoder = textEncoding.TextDecoder;
var _ = require('underscore');

var registryInterface = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "resolver",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "owner",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "resolver",
        "type": "address"
      }
    ],
    "name": "setResolver",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "label",
        "type": "bytes32"
      },
      {
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "setSubnodeOwner",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "setOwner",
    "outputs": [],
    "type": "function"
  }
];

var resolverInterface = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "addr",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "content",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      }
    ],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "kind",
        "type": "bytes32"
      }
    ],
    "name": "has",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "addr",
        "type": "address"
      }
    ],
    "name": "setAddr",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "hash",
        "type": "bytes32"
      }
    ],
    "name": "setContent",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "name",
        "type": "string"
      }
    ],
    "name": "setName",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "node",
        "type": "bytes32"
      },
      {
        "name": "contentType",
        "type": "uint256"
      }
    ],
    "name": "ABI",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "bytes"
      }
    ],
    "payable": false,
    "type": "function"
  }
];

var registryAddresses = {
  // Mainnet
  "1": "0x314159265dd8dbb310642f98f50c066173c1259b",
  // Ropsten
  "3": "0x112234455c3a32fd11230c42e7bccd4a84e02010",
  // Rinkeby
  "4": "0xe7410170f87102DF0055eB195163A03B7F2Bff4A",
}

/**
 * @class
 */
function Resolver(ens, node, contract) {
    this.ens = ens;
    this.node = node;
    this.instancePromise = ens.registryPromise.then(function(registry) {
      return registry.resolverAsync(node).then(function(address) {
        if(address == "0x0000000000000000000000000000000000000000") {
          return Promise.reject(ENS.NameNotFound);
        }
        return Promise.promisifyAll(contract.at(address));
      });
    });
    
    _.each(contract.abi, function(signature) {
        this[signature.name] = function() {
          var args = arguments;
          return this.instancePromise.then(function(instance) {
            return _.partial(instance[signature.name + 'Async'], node).apply(instance, args);
          }).bind(this);
        }.bind(this);
    }.bind(this));
}

var abiDecoders = {
  1: function(data) {
    data  = new TextDecoder("utf-8").decode(data);
    return JSON.parse(data);
  },
  2: function(data) {
    data = pako.inflate(data, {to: 'string'});
    return JSON.parse(data);
  }
};
var supportedDecoders = _.reduce(_.keys(abiDecoders), function(memo, val) { return memo | val; });

/**
 * resolverAddress returns the address of the resolver.
 * @returns A promise for the address of the resolver.
 */
Resolver.prototype.resolverAddress = function() {
  return this.instancePromise.then(function(instance) {
    return instance.address;
  });
}

/**
 * reverseAddr looks up the reverse record for the address returned by the resolver's addr()
 * @returns A promise for the Resolver for the reverse record.
 */
Resolver.prototype.reverseAddr = function() {
    return this.addr().then(function(addr) {
      return this.ens.reverse(addr);
    }).bind(this);
}

function fromHex(x) {
  if(x.startsWith("0x")) {
    x = x.slice(2);
  }
  
  var ret = new Uint8Array(x.length / 2);
  for(var i = 0; i < ret.length; i++) {
    ret[i] = parseInt(x.slice(i * 2, i * 2 + 2), 16);
  }

  return ret;
};

/**
 * abi returns the ABI associated with the name. Automatically looks for an ABI on the
 *     reverse record if none is found on the name itself.
 * @param {bool} Optional. If false, do not look up the ABI on the reverse entry.
 * @returns {object} A promise for the contract ABI.
 */
Resolver.prototype.abi = function(reverse) {
  return this.instancePromise.then(function(instance) {
    return instance.ABIAsync(this.node, supportedDecoders).then(function(result) {
      if(result[0] == 0) {
        if(reverse == false) return null;
        return this.reverseAddr().then(function(reverse) {
          return reverse.abi(false);
        });
      } else {
        return abiDecoders[result[0]](fromHex(result[1]));
      }
    }.bind(this));
  }.bind(this));
};

/**
 * contract returns a web3 contract object. The address is that returned by this resolver's
 * `addr()`, and the ABI is loaded from this resolver's `ABI()` method, or the ABI on the
 * reverse record if that's not found. Returns null if no address is specified or no ABI
 * was found. The returned contract object will not be promisifed or otherwise modified.
 * @returns {object} A promise for the contract instance.
 */
Resolver.prototype.contract = function() {
  return Promise.join(this.abi(), this.addr(), function(abi, addr) {
    return this.ens.web3.eth.contract(abi).at(addr);
  }.bind(this));
};

/** 
 * @class
 *
 * @description Provides an easy-to-use interface to the Ethereum Name Service.
 *
 * Example usage:
 *
 *     var ENS = require('ethereum-ens');
 *     var Web3 = require('web3');
 *
 *     var web3 = new Web3();
 *     var ens = new ENS(web3);
 *
 *     var address = ens.resolver('foo.eth').addr().then(function(addr) { ... });
 *
 * Functions that require communicating with the node return promises, rather than
 * using callbacks. A promise has a `then` function, which takes a callback and will
 * call it when the promise is fulfilled; `then` returns another promise, so you can
 * chain callbacks. For more details, see http://bluebirdjs.com/.
 *
 * Notably, the `resolver` method returns a resolver instance immediately; lookup of
 * the resolver address is done in the background or when you first call an asynchronous
 * method on the resolver.
 *
 * Functions that create transactions also take an optional 'options' argument;
 * this has the same parameters as web3.
 *
 * @author Nick Johnson <nick@ethereum.org>
 * @date 2016
 * @license LGPL
 *
 * @param {object} web3 A web3 instance to use to communicate with the blockchain.
 * @param {address} address Optional. The address of the ENS registry. Defaults to the public ENS registry.
 */
function ENS (web3, address) {
    this.web3 = web3;
    var registryContract = web3.eth.contract(registryInterface);
    if(address != undefined) {
      this.registryPromise = Promise.resolve(Promise.promisifyAll(registryContract.at(address)));
    } else {
      this.registryPromise = Promise.promisify(web3.version.getNetwork)().then(function(version) {
        return Promise.promisifyAll(registryContract.at(registryAddresses[version]));
      });
    }
}

ENS.NameNotFound = Error("ENS name not found");

function parentNamehash(name) {
    var dot = name.indexOf('.');
    if(dot == -1) {
        return ['0x' + sha3(namehash.normalize(name)), namehash.hash('')];
    } else {
        return ['0x' + sha3(namehash.normalize(name.slice(0, dot))), namehash.hash(name.slice(dot + 1))];
    }
}

/**
 * resolver returns a resolver object for the specified name, throwing
 * ENS.NameNotFound if the name does not exist in ENS.
 * Resolver objects are wrappers around web3 contract objects, with the
 * first argument - always the node ID in an ENS resolver - automatically
 * supplied. So, to call the `addr(node)` function on a standard resolver,
 * you only have to call `addr()`. Returned objects are also 'promisified' - they
 * return a Bluebird Promise object instead of taking a callback.
 * @param {string} name The name to look up.
 * @param {list} abi Optional. The JSON ABI definition to use for the resolver.
 *        if none is supplied, a default definition implementing `has`, `addr`, `name`,
 *        `setName` and `setAddr` is supplied.
 * @returns The resolver object.
 */
ENS.prototype.resolver = function(name, abi) {
    abi = abi || resolverInterface;
    var node = namehash.hash(name);
    return new Resolver(this, node, this.web3.eth.contract(abi));
};

/**
 * reverse returns a resolver object for the reverse resolution of the specified address,
 * throwing ENS.NameNotFound if the reverse record does not exist in ENS.
 * Resolver objects are wrappers around web3 contract objects, with the
 * first argument - always the node ID in an ENS resolver - automatically
 * supplied. So, to call the `addr(node)` function on a standard resolver,
 * you only have to call `addr()`. Returned objects are also 'promisified' - they
 * return a Bluebird Promise object instead of taking a callback.
 * @param {string} address The address to look up.
 * @param {list} abi Optional. The JSON ABI definition to use for the resolver.
 *        if none is supplied, a default definition implementing `has`, `addr`, `name`,
 *        `setName` and `setAddr` is supplied.
 * @returns The resolver object.
 */
ENS.prototype.reverse = function(address, abi) {
    if(address.startsWith("0x"))
      address = address.slice(2);
    return this.resolver(address.toLowerCase() + ".addr.reverse", abi);
};

/**
 * setResolver sets the address of the resolver contract for the specified name.
 * The calling account must be the owner of the name in order for this call to
 * succeed.
 * @param {string} name The name to update
 * @param {address} address The address of the resolver
 * @param {object} options An optional dict of parameters to pass to web3.
 * @returns A promise that returns the transaction ID when the transaction is mined.
 */
ENS.prototype.setResolver = function(name, addr, params) {
    var node = namehash.hash(name);

    return this.registryPromise.then(function(registry) {
      return registry.setResolverAsync(node, addr, params);
    });
}

/**
 * owner returns the address of the owner of the specified name.
 * @param {string} name The name to look up.
 * @returns A promise returning the owner address of the specified name.
 */
ENS.prototype.owner = function(name, callback) {
    var node = namehash.hash(name);

    return this.registryPromise.then(function(registry) {
      return registry.ownerAsync(node);
    });
}

/**
 * setOwner sets the owner of the specified name. Only the owner may call 
 * setResolver or setSubnodeOwner. The calling account must be the current
 * owner of the name in order for this call to succeed.
 * @param {string} name The name to update
 * @param {address} address The address of the new owner
 * @param {object} options An optional dict of parameters to pass to web3.
 * @returns A promise returning the transaction ID of the transaction, once mined.
 */
ENS.prototype.setOwner = function(name, addr, params) {
    var node = namehash.hash(name);

    return this.registryPromise.then(function(registry) {
      return registry.setOwnerAsync(node, addr, params);
    });
}

/**
 * setSubnodeOwner sets the owner of the specified name. The calling account
 * must be the owner of the parent name in order for this call to succeed -
 * for example, to call setSubnodeOwner on 'foo.bar.eth', the caller must be
 * the owner of 'bar.eth'.
 * @param {string} name The name to update
 * @param {address} address The address of the new owner
 * @param {object} options An optional dict of parameters to pass to web3.
 * @returns A promise returning the transaction ID of the transaction, once mined.
 */
ENS.prototype.setSubnodeOwner = function(name, addr, params) {
    var node = parentNamehash(name);

    return this.registryPromise.then(function(registry) {
      return registry.setSubnodeOwnerAsync(node[1], node[0], addr, params);
    });
}

module.exports = ENS;
