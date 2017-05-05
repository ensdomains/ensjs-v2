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

	describe('#resolve()', function() {
		it('should get resolver addresses', function(done) {
			ens.resolver('foo.eth').resolverAddress().then(function(addr) {
				assert.notEqual(addr, '0x0000000000000000000000000000000000000000');
			}).catch(assert.ifError).finally(done);
		});

		it('should resolve names', function(done) {
			ens.resolver('foo.eth').addr().then(function(result) {
				assert.equal(result, deployens.address);
			}).catch(assert.ifError).finally(done);
		});

		it('should implement has()', function(done) {
			var resolver = ens.resolver('foo.eth');
			Promise.all([
				resolver.has('addr').then(function(result) {
					assert.equal(result, true);
				}),
				resolver.has('blah').then(function(result) {
					assert.equal(result, false);
				}),
			]).catch(assert.ifError).then(function(result) {done()});
		});

		it('should error when the name record does not exist', function(done) {
			ens.resolver('bar.eth').addr().catch(function(err) {
				assert.ok(err.toString().indexOf('invalid JUMP') != -1, err);
				done();
			});
		});

		it('should error when the name does not exist', function(done) {
			ens.resolver('quux.eth').addr().catch(function(err) {
				assert.equal(err, ENS.NameNotFound);
				done();
			});
		});

		it('should permit name updates', function(done) {
			var resolver = ens.resolver('bar.eth')
			resolver.setAddr('0x12345', {from: accounts[0]}).then(function(result) {
				return resolver.addr().then(function(result) {
					assert.equal(result, '0x0000000000000000000000000000000000012345');
					done();
				});
			});
		});

		it('should do reverse resolution', function(done) {
			var resolver = ens.resolver('foo.eth');
			resolver.reverseAddr().then(function(reverse) {
				return reverse.name().then(function(result) {
					assert.equal(result, "deployer.eth");
				});
			}).catch(assert.isError).finally(done);
		});

		it('should fetch ABIs from names', function(done) {
			ens.resolver('foo.eth').abi().then(function(abi) {
				assert.equal(abi.length, 2);
				assert.equal(abi[0].name, "test2");
			}).catch(assert.isError).finally(done);
		});

		it('should fetch ABIs from reverse records', function(done) {
			ens.resolver('baz.eth').abi().then(function(abi) {
				assert.equal(abi.length, 2);
				assert.equal(abi[0].name, "test");
			}).catch(assert.isError).finally(done);
		});

		it('should fetch contract instances', function(done) {
			ens.resolver('baz.eth').contract().then(function(contract) {
				assert.ok(contract.test != undefined);
			}).catch(assert.isError).finally(done);
		});
	});

	describe('#owner()', function() {
		it('should return owner values', function(done) {
			ens.owner('bar.eth').then(function(result) {
				assert.equal(result, accounts[0]);
			}).catch(assert.isError).finally(done);
		});
	});

	describe("#setSubnodeOwner", function() {
		it('should permit setting subnode owners', function(done) {
			ens.setSubnodeOwner('BAZ.bar.eth', accounts[0], {from: accounts[0]}).then(function(txid) {
				return ens.owner('baz.bar.eth').then(function(owner) {
					assert.equal(owner, accounts[0]);
				});
			}).catch(assert.isError).finally(done);
		});
	});

	describe("#setResolver", function() {
		it('should permit resolver updates', function(done) {
			var addr = '0x2341234123412341234123412341234123412341';
			ens.setResolver('baz.bar.eth', addr, {from: accounts[0]}).then(function(txid) {
				return ens.resolver('baz.bar.eth').resolverAddress().then(function(address) {
					assert.equal(address, addr);
				});
			}).catch(assert.isError).finally(done);
		});
	});

	describe("#setOwner", function() {
		it('should permit owner updates', function(done) {
			var addr = '0x3412341234123412341234123412341234123412';
			ens.setOwner('baz.bar.eth', addr, {from: accounts[0]}).then(function(txid) {
				return ens.owner('baz.bar.eth').then(function(owner) {
					assert.equal(owner, addr);
				});
			}).catch(assert.isError).finally(done);
		});
	});

	describe("#reverse", function() {
		it('should look up reverse DNS records', function(done) {
			ens.reverse(deployens.address).name().then(function(result) {
				assert.equal(result, 'deployer.eth');
			}).catch(assert.isError).finally(done);
		});
	});
});
