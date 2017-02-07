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

var CryptoJS = require('crypto-js');
var pako = require('pako');
var uts46 = require('idna-uts46');
var _ = require('underscore');
var textEncoding = require('text-encoding');
var TextDecoder = textEncoding.TextDecoder;

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

var publicRegistryAddress = "0x112234455c3a32fd11230c42e7bccd4a84e02010";

/**
 * @class
 */
function Resolver(ens, address, node, abi) {
    this.ens = ens;
    this.resolverAddress = address;
    this.node = node;
    this.instance = ens.web3.eth.contract(abi).at(address);

    _.each(_.functions(this.instance), function(funcname) {
        if(funcname == "abi") return;
        this[funcname] = _.partial(this.instance[funcname], this.node);
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
 * reverseAddr looks up the reverse record for the address returned by the resolver's addr()
 * @param callback An optional callback, for asynchronous operation.
 * @returns In synchronous operation, the Resolver for the reverse record.
 */
Resolver.prototype.reverseAddr = function(callback) {
  if(callback == undefined) {
    return this.ens.reverse(this.addr());
  } else {
    this.addr(function(err, addr) {
      if(err != undefined) {
        callback(err, undefined);
        return;
      }
      this.ens.reverse(addr, callback);
    }.bind(this));
  }
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
 * @param callback An optional callback, for asynchronous operation.
 * @returns {object} In synchronous operation, the contract ABI.
 */
Resolver.prototype.abi = function(callback) {
  if(callback == undefined) {
    var result = this.instance.ABI(this.node, supportedDecoders);
    if(result[0] == 0) {
      reverse = this.reverseAddr();
      result = reverse.instance.ABI(reverse.node, supportedDecoders);
    }

    if(result[0] == 0) {
      return null;
    } else {
      return abiDecoders[result[0]](fromHex(result[1]));
    }
  } else {
    this.instance.ABI(this.node, supportedDecoders, function(err, result) {
      if(err != undefined) {
        callback(err, undefined);
        return;
      }

      if(result[0] == 0) {
        this.reverseAddr(function(err, reverse) {
          if(err != undefined) {
            callback(err, undefined);
            return;
          }

          reverse.instance.ABI(reverse.node, supportedDecoders, function(err, result) {
            if(err != undefined) {
              callback(err, undefined);
              return;
            }

            if(result[0] == 0) {
              callback(undefined, null);
              return;
            }

            callback(undefined, abiDecoders[result[0]](fromHex(result[1])));
          }.bind(this));
        }.bind(this));
      } else {
        callback(undefined, abiDecoders[result[0]](fromHex(result[1])));
      }
    }.bind(this));
  }
};

/**
 * contract returns a web3 contract object. The address is that returned by this resolver's
 * `addr()`, and the ABI is loaded from this resolver's `ABI()` method, or the ABI on the
 * reverse record if that's not found. Returns null if no address is specified or no ABI
 * was found.
 * @param callback An optional callback, for asynchronous operation.
 * @returns {object} In synchronous operation, the contract instance.
 */
Resolver.prototype.contract = function(callback) {
  if(callback == undefined) {
    return this.ens.web3.eth.contract(this.abi()).at(this.addr());
  } else {
    this.abi(function(err, abi) {
      if(err != undefined) {
        callback(err, undefined);
        return;
      }

      this.addr(function(err, addr) {
        if(err != undefined) {
          callback(err, undefined);
          return;
        }

        callback(undefined, this.ens.web3.eth.contract(abi).at(addr));
      }.bind(this));
    }.bind(this));
  }
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
 *     var address = ens.resolver('foo.eth').addr();
 *
 * Throughout this module, the same optionally-asynchronous pattern as web3 is
 * used: all functions that call web3 take a callback as an optional last
 * argument; if supplied, the function returns nothing, but instead calls the
 * callback with (err, result) when the operation completes.
 *
 * Functions that create transactions also take an optional 'options' argument;
 * this has the same parameters as web3.
 *
 * @author Nick Johnson <nick@ethereum.org>
 * @date 2016
 * @license LGPL
 *
 * @param {object} web3 A web3 instance to use to communicate with the blockchain.
 * @param {address} address The address of the ENS registry. Defaults to the public ENS registry if not supplied.
 */
function ENS (web3, address) {
    this.web3 = web3;
    this.registry = web3.eth.contract(registryInterface).at(address || publicRegistryAddress);
}

ENS.NameNotFound = Error("ENS name not found");

function sha3(input) {
    return CryptoJS.SHA3(input, {outputLength: 256})
}

/**
 * normalise namepreps a name, throwing an exception if it contains invalid characters.
 * @param {string} name The name to normalise
 * @returns The normalised name. Throws ENS.InvalidName if the name contains invalid characters.
 */
function normalise(name) {
  return uts46.toUnicode(name, {useStd3ASCII: true, transitional: false});
}
ENS.prototype.normalise = normalise;

/**
 * namehash implements ENS' name hash algorithm.
 * @param {string} name The name to hash
 * @returns The computed namehash, as a hex string.
 */
function namehash(name) {
    name = normalise(name);
    var node = CryptoJS.enc.Hex.parse('0000000000000000000000000000000000000000000000000000000000000000');
    if(name && name != '') {
        var labels = name.split(".");
        for(var i = labels.length - 1; i >= 0; i--) {
            node = sha3(node.concat(sha3(labels[i])));
        }
    }
    return '0x' + node.toString();
}
ENS.prototype.namehash = namehash;

function parentNamehash(name) {
    var dot = name.indexOf('.');
    if(dot == -1) {
        return ['0x' + sha3(normalise(name)), namehash('')];
    } else {
        return ['0x' + sha3(normalise(name.slice(0, dot))), namehash(name.slice(dot + 1))];
    }
}

ENS.prototype._resolve = function(node, args) {
    var callback = undefined;
    if(typeof args[args.length - 1] == 'function') {
        callback = args[args.length - 1];
    }

    var abi = resolverInterface;
    if(callback && args.length == 3) {
        abi = args[args.length - 2];
    } else if(!callback && args.length == 2) {
        abi = args[args.length - 1];
    }

    if(!callback) {
        result = this.registry.resolver(node);
        if(result == "0x0000000000000000000000000000000000000000") {
            throw ENS.NameNotFound;
        }
        return new Resolver(this, result, node, abi);
    }

    this.registry.resolver(node, function(err, result) {
        if(err != null) {
            callback(err, result);
        } else {
            if(result == "0x0000000000000000000000000000000000000000") {
                callback(ENS.NameNotFound, null);
            } else {
                callback(null, new Resolver(this, result, node, abi));
            }
        }
    }.bind(this));
}

/**
 * resolver returns a resolver object for the specified name, throwing
 * ENS.NameNotFound if the name does not exist in ENS.
 * Resolver objects are wrappers around web3 contract objects, with the
 * first argument - always the node ID in an ENS resolver - automatically
 * supplied. So, to call the `addr(node)` function on a standard resolver,
 * you only have to call `addr()`.
 * @param {string} name The name to look up.
 * @param {list} abi Optional. The JSON ABI definition to use for the resolver.
 *        if none is supplied, a default definition implementing `has`, `addr`, `name`,
 *        `setName` and `setAddr` is supplied.
 * @param {function} callback Optional. If specified, the function executes
 *        asynchronously.
 * @returns The resolver object if callback is not supplied.
 */
ENS.prototype.resolver = function(name) {
    var node = namehash(name);
    return this._resolve(node, arguments)
};

/**
 * reverse returns a resolver object for the reverse resolution of the specified address,
 * throwing ENS.NameNotFound if the reverse record does not exist in ENS.
 * Resolver objects are wrappers around web3 contract objects, with the
 * first argument - always the node ID in an ENS resolver - automatically
 * supplied. So, to call the `addr(node)` function on a standard resolver,
 * you only have to call `addr()`.
 * @param {string} address The address to look up.
 * @param {list} abi Optional. The JSON ABI definition to use for the resolver.
 *        if none is supplied, a default definition implementing `has`, `addr`, `name`,
 *        `setName` and `setAddr` is supplied.
 * @param {function} callback Optional. If specified, the function executes
 *        asynchronously.
 * @returns The resolver object if callback is not supplied.
 */
ENS.prototype.reverse = function(address) {
    if(address.startsWith("0x"))
      address = address.slice(2);
    var node = namehash(address + ".addr.reverse");
    return this._resolve(node, arguments);
};

/**
 * setResolver sets the address of the resolver contract for the specified name.
 * The calling account must be the owner of the name in order for this call to
 * succeed.
 * @param {string} name The name to update
 * @param {address} address The address of the resolver
 * @param {object} options An optional dict of parameters to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 * @returns The transaction ID if callback is not supplied.
 */
ENS.prototype.setResolver = function(name, addr) {
    var node = namehash(name);

    var callback = undefined;
    if(typeof arguments[arguments.length - 1] == 'function') {
        callback = arguments[arguments.length - 1];
    }

    var params = {};
    if(callback && arguments.length == 4){
        params = arguments[arguments.length - 2];
    } else if(!callback && arguments.length == 3){
        params = arguments[arguments.length - 1];
    }

    if(!callback) {
        return this.registry.setResolver(node, addr, params);
    } else {
        this.registry.setResolver(node, addr, params, callback);
    }
}

/**
 * owner returns the address of the owner of the specified name.
 * @param {string} name The name to look up.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 * @returns The resolved address if callback is not supplied.
 */
ENS.prototype.owner = function(name, callback) {
    var node = namehash(name);

    if(callback) {
        this.registry.owner(node, callback);
    } else {
        return this.registry.owner(node);
    }
}

/**
 * setOwner sets the owner of the specified name. Only the owner may call 
 * setResolver or setSubnodeOwner. The calling account must be the current
 * owner of the name in order for this call to succeed.
 * @param {string} name The name to update
 * @param {address} address The address of the new owner
 * @param {object} options An optional dict of parameters to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 * @returns The transaction ID if callback is not supplied.
 */
ENS.prototype.setOwner = function(name, addr) {
    var node = namehash(name);

    var callback = undefined;
    if(typeof arguments[arguments.length - 1] == 'function') {
        callback = arguments[arguments.length - 1];
    }

    var params = {};
    if(callback && arguments.length == 4) {
        params = arguments[arguments.length - 2];
    } else if(!callback && arguments.length == 3) {
        params = arguments[arguments.length - 1];
    }

    if(!callback) {
        return this.registry.setOwner(node, addr, params);
    } else {
        this.registry.setOwner(node, addr, params, callback);
    }
}

/**
 * setSubnodeOwner sets the owner of the specified name. The calling account
 * must be the owner of the parent name in order for this call to succeed -
 * for example, to call setSubnodeOwner on 'foo.bar.eth', the caller must be
 * the owner of 'bar.eth'.
 * @param {string} name The name to update
 * @param {address} address The address of the new owner
 * @param {object} options An optional dict of parameters to pass to web3.
 * @param {function} callback An optional callback; if specified, the
 *        function executes asynchronously.
 * @returns The transaction ID if callback is not supplied.
 */
ENS.prototype.setSubnodeOwner = function(name, addr) {
    var node = parentNamehash(name);

    var callback = undefined;
    if(typeof arguments[arguments.length - 1] == 'function') {
        callback = arguments[arguments.length - 1];
    }

    var params = {};
    if (callback && arguments.length == 4) {
        params = arguments[arguments.length - 2];
    } else if (!callback && arguments.length == 3) {
        params = arguments[arguments.length - 1];
    }

    if(!callback) {
        return this.registry.setSubnodeOwner(node[1], node[0], addr, params);
    } else {
        this.registry.setSubnodeOwner(node[1], node[0], addr, params, callback);
    }
}

module.exports = ENS;
