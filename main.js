const SID = require('./dist/index').default
const rpc =  require('./dist/constants/rpc')
const SIDfunctions = require('./dist/index')                                                                                                                                                                                
const Web3 = require('web3')                                                                                                                

let sid 

async function main(name) {
  const provider = new Web3.providers.HttpProvider(rpc.rpc_api)
  sid = new SID({ provider, sidAddress: SIDfunctions.getSidAddress('56') })

  const address = await sid.name(name).getAddress() // 0x123                                                                                
  console.log("name: %s, address: %s", name, address)                                                                                          

}                                                                                                                                           
main("resolver.bnb")