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
    "name": "hash",
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
    "name": "setHash",
    "outputs": [],
    "type": "function"
  }
];

var publicRegistryAddress = "0x112234455c3a32fd11230c42e7bccd4a84e02010";

function Resolver(web3, address, node, abi) {
    this.web3 = web3;
    this.resolverAddress = address;
    this.node = node;
    this.contract = web3.eth.contract(abi).at(address);

    _.each(_.functions(this.contract), function(funcname) {
        this[funcname] = _.partial(this.contract[funcname], this.node);
    }.bind(this));
}

/** 
 * Provides an easy-to-use interface to the Ethereum Name Service.
 *
 * Example usage:
 *
 *     var ENS = require('ethereum-ens');
 *     var Web3 = require('web3');
 *
 *     var web3 = new Web3();
 *     var ens = new ENS(web3, '0x1234abc...');
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
 * namehash implements ENS' name hash algorithm.
 * @param {string} name The name to hash
 * @returns The computed namehash, as a hex string.
 */
function namehash(name) {
    var node = CryptoJS.enc.Hex.parse('0000000000000000000000000000000000000000000000000000000000000000');
    if(name != '') {
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
        return ['0x' + sha3(name), namehash('')];
    } else {
        return ['0x' + sha3(name.slice(0, dot)), namehash(name.slice(dot + 1))];
    }
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
 *        if none is supplied, a default definition implementing `has`, `addr`
 *        and `setAddr` is supplied.
 * @param {function} callback Optional. If specified, the function executes
 *        asynchronously.
 * @returns The resolver object if callback is not supplied.
 */
ENS.prototype.resolver = function(name) {
    var node = namehash(name);

    var callback = undefined;
    if(typeof arguments[arguments.length - 1] == 'function') {
        callback = arguments[arguments.length - 1];
    }

    var abi = resolverInterface;
    if((callback && arguments.length == 4) || (!callback && arguments.length == 3))
        resolverInterface = arguments[arguments.length - 2];

    if(!callback) {
        result = this.registry.resolver(node);
        if(result == "0x0000000000000000000000000000000000000000") {
            throw ENS.NameNotFound;
        }
        return new Resolver(this.web3, result, node, abi);
    }

    this.registry.resolver(node, function(err, result) {
        if(err != null) {
            callback(err, result);
        } else {
            if(result == "0x0000000000000000000000000000000000000000") {
                callback(ENS.NameNotFound, null);
            } else {
                callback(null, new Resolver(this.web3, result, node, abi));
            }
        }
    }.bind(this));
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
    if((callback && arguments.length == 4) || (!callback && arguments.length == 3))
        params = arguments[arguments.length - 2];

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
    if((callback && arguments.length == 4) || (!callback && arguments.length == 3))
        params = arguments[arguments.length - 2];

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
    if((callback && arguments.length == 4) || (!callback && arguments.length == 3))
        params = arguments[arguments.length - 2];

    if(!callback) {
        return this.registry.setSubnodeOwner(node[1], node[0], addr, params);
    } else {
        this.registry.setSubnodeOwner(node[1], node[0], addr, params, callback);
    }
}

module.exports = ENS;
