var ENS = require('../index.js');

var assert = require('assert');
var async = require('async');
var fs = require('fs');
var solc = require('solc');
var TestRPC = require('ethereumjs-testrpc');
var Web3 = require('web3');

var web3 = new Web3();

var ens = null;
var ensRoot = null;
var accounts = null;
var deployens = null;

var registryInterface = [{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"resolver","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":true,"inputs":[{"name":"node","type":"bytes32"}],"name":"owner","outputs":[{"name":"","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"resolver","type":"address"}],"name":"setResolver","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"label","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setSubnodeOwner","outputs":[],"type":"function"},{"constant":false,"inputs":[{"name":"node","type":"bytes32"},{"name":"owner","type":"address"}],"name":"setOwner","outputs":[],"type":"function"}];

describe('ENS', function() {
	before(function(done) {
		this.timeout(20000);
		web3.setProvider(TestRPC.provider());
		//web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));

		web3.eth.getAccounts(function(err, acct) {
			accounts = acct

			var source = fs.readFileSync('test/ens.sol').toString();
			var compiled = solc.compile(source, 1);
			assert.equal(compiled.errors, undefined);
			var deployer = compiled.contracts[':DeployENS'];
			var deployensContract = web3.eth.contract(JSON.parse(deployer.interface));
			
			// Deploy the contract
			deployens = deployensContract.new(
			   {
			     from: accounts[0],
			     data: deployer.bytecode,
			     gas: 4700000
			   }, function(err, contract) {
			   	    assert.equal(err, null, err);
			   	    if(contract.address != undefined) {
			   	    	// Fetch the address of the ENS registry
			   	 		contract.ens.call(function(err, value) {
			   	 			assert.equal(err, null, err);
			   	 			ensRoot = value;
							ens = new ENS(web3, ensRoot);
			   	 			done();
			   	 		});
				   	 }
			   });
		});
	});

	describe('#namehash()', function() {
		it('should produce valid hashes', function() {
			var ens = new ENS(web3, ensRoot);
			assert.equal(ens.namehash(''), '0x0000000000000000000000000000000000000000000000000000000000000000');
			assert.equal(ens.namehash('eth'), '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae');
			assert.equal(ens.namehash('foo.eth'), '0xde9b09fd7c5f901e23a3f19fecc54828e9c848539801e86591bd9801b019f84f');
		});

		it('should canonicalize with nameprep', function() {
			var ens = new ENS(web3, ensRoot);
			assert.equal(ens.namehash('name.eth'), ens.namehash('NAME.eth'));
		});

		it('should prohibit invalid names', function() {
			var ens = new ENS(web3, ensRoot);
			try {
				ens.normalise('foo_!bar');
				assert.fail("Expected exception");
			} catch(e) {
				assert.equal('Error: Illegal char _', e);
			}
		});
	})

	describe('#resolve()', function() {
		it('should resolve names', function(done) {
			ens.resolver('foo.eth', function(err, resolver) {
				assert.equal(err, null, "Got error from ens.resolver(): " + err);
				assert.notEqual(resolver.resolverAddress, '0x0000000000000000000000000000000000000000');
				resolver.addr(function(err, result) {
					assert.equal(result, deployens.address);
					done();
				});
			});
		});

		it('should implement has()', function(done) {
			ens.resolver('foo.eth', function(err, resolver) {
				assert.equal(err, null, err);
				async.seq(function(done) {
					resolver.has('addr', function(err, result) {
						assert.equal(err, null, err);
						assert.equal(result, true);
						done();
					});
				}, function(done) {
					resolver.has('blah', function(err, result) {
						assert.equal(err, null, err);
						assert.equal(result, false);
						done();
					});
				})(done);
			})
		})

		it('should error when the name record does not exist', function(done) {
			ens.resolver('bar.eth', function(err, resolver) {
				assert.equal(err, null, err);
				resolver.addr(function(err, result) {
					assert.ok(err.toString().indexOf('invalid JUMP') != -1, err);
					done();
				})
			});
		});

		it('should error when the name does not exist', function(done) {
			ens.resolver('quux.eth', function(err, resolver) {
				assert.equal(err, ENS.NameNotFound);
				done();
			});
		});

		it('should permit name updates', function(done) {
			ens.resolver('bar.eth', function(err, resolver) {
				assert.equal(err, null, err);
				resolver.setAddr('0x12345', {from: accounts[0]}, function(err, result) {
					assert.equal(err, null, err);
					resolver.addr(function(err, result) {
						assert.equal(err, null, err);
						assert.equal(result, '0x0000000000000000000000000000000000012345');
						done();
					})
				});
			});
		});

		it('should do reverse resolution', function(done) {
			ens.resolver('foo.eth', function(err, resolver) {
				assert.equal(err, null, err);
				resolver.reverseAddr(function(err, reverse) {
					assert.equal(err, null, err);
					reverse.name(function(err, result) {
						assert.equal(err, null, err);
						assert.equal(result, "deployer.eth");
						done();
					});
				});
			});
		});

		it('should fetch ABIs from names', function(done) {
			ens.resolver('foo.eth', function(err, resolver) {
				assert.equal(err, null, err);
				resolver.abi(function(err, abi) {
					assert.equal(err, null, err);
					assert.equal(abi.length, 2);
					assert.equal(abi[0].name, "test2");
					done();
				});
			});
		});

		it('should fetch ABIs from reverse records', function(done) {
			ens.resolver('baz.eth', function(err, resolver) {
				assert.equal(err, null, err);
				resolver.abi(function(err, abi) {
					assert.equal(err, null, err);
					assert.equal(abi.length, 2);
					assert.equal(abi[0].name, "test");
					done();
				});
			});
		});

		it('should fetch contract instances', function(done) {
			ens.resolver('baz.eth', function(err, resolver) {
				assert.equal(err, null, err);
				resolver.contract(function(err, contract) {
					assert.equal(err, null, err);
					assert.ok(contract.test != undefined);
					done();
				});
			});
		});
	});

	describe('#owner()', function() {
		it('should return owner values', function(done) {
			ens.owner('bar.eth', function(err, result) {
				done();
			});
		});
	});

	describe("#setSubnodeOwner", function() {
		it('should permit setting subnode owners', function(done) {
			ens.setSubnodeOwner('BAZ.bar.eth', accounts[0], {from: accounts[0]}, function(err, txid) {
				assert.equal(err, null, err);
				ens.owner('baz.bar.eth', function(err, owner) {
					assert.equal(err, null, err);
					assert.equal(owner, accounts[0]);
					done();
				})
			});
		});
	});

	describe("#setResolver", function() {
		it('should permit resolver updates', function(done) {
			var addr = '0x2341234123412341234123412341234123412341';
			ens.setResolver('baz.bar.eth', addr, {from: accounts[0]}, function(err, txid) {
				assert.equal(err, null, err);
				ens.resolver('baz.bar.eth', function(err, resolver) {
					assert.equal(err, null, err);
					assert.equal(resolver.resolverAddress, addr);
					done();
				});
			});
		});
	});

	describe("#setOwner", function() {
		it('should permit owner updates', function(done) {
			var addr = '0x3412341234123412341234123412341234123412';
			ens.setOwner('baz.bar.eth', addr, {from: accounts[0]}, function(err, txid) {
				assert.equal(err, null, err);
				ens.owner('baz.bar.eth', function(err, owner) {
					assert.equal(owner, addr);
					done();
				});
			});
		});
	});

	describe("#reverse", function() {
		it('should look up reverse DNS records', function(done) {
			ens.reverse(deployens.address, function(err, resolver) {
				assert.equal(err, null, err);
				resolver.name(function(err, result) {
					assert.equal(err, null, err);
					assert.equal(result, 'deployer.eth');
					done();
				});
			});
		});
	});
});
