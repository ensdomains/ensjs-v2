export default class ENS {
    constructor(options: any);
    provider: ethers.providers.Provider;
    signer: any;
    ens: any;
    name(name: any): Name;
    resolver(address: any): Resolver;
    getName(address: any): Promise<{
        name: any;
    }>;
    getNameWithResolver(address: any, resolverAddr: any): Promise<{
        name: any;
    }>;
    setReverseRecord(name: any, overrides: any): Promise<any>;
}
import { ethers } from "ethers";
declare class Name {
    constructor(options: any);
    namehash: string;
    ens: any;
    ensWithSigner: any;
    name: any;
    provider: any;
    signer: any;
    resolver: any;
    getOwner(): Promise<any>;
    setOwner(address: any): Promise<any>;
    getResolver(): Promise<any>;
    setResolver(address: any): Promise<any>;
    getTTL(): Promise<any>;
    getResolverAddr(): Promise<any>;
    getAddress(coinId: any): Promise<any>;
    setAddress(key: any, address: any): Promise<any>;
    getContent(): Promise<"0x0000000000000000000000000000000000000000" | {
        value: any;
        contentType: string;
    }>;
    setContenthash(content: any): Promise<any>;
    getText(key: any): Promise<any>;
    setText(key: any, recordValue: any): Promise<any>;
    setSubnodeOwner(label: any, newOwner: any): Promise<any>;
    setSubnodeRecord(label: any, newOwner: any, resolver: any, ttl?: number): Promise<any>;
    createSubdomain(label: any): Promise<any>;
    deleteSubdomain(label: any): Promise<any>;
}
declare class Resolver {
    constructor({ address, ens }: {
        address: any;
        ens: any;
    });
    address: any;
    ens: any;
    name(name: any): Name;
}
import { namehash } from "./utils";
import { labelhash } from "./utils";
/**
 * Get ENS Contract
 *
 * // todo is Provider here meant to be provider from web3-core ? (may need to upgrade web3 library)
 *
 * @param {{address: string, provider: Provider}}
 * @returns {Contract}
 */
export function getENSContract({ address, provider }: {
    address: string;
    provider: typeof ethers.providers.Provider;
}): any;
/**
 * Get Resolver Contract
 * // todo is Provider here meant to be provider from web3-core ? (may need to upgrade web3 library)
 *
 * @param {{address: string, provider: Provider}}
 * @returns {Contract}
 */
export function getResolverContract({ address, provider }: {
    address: string;
    provider: typeof ethers.providers.Provider;
}): any;
export function getEnsAddress(networkId: any): string;
export { namehash, labelhash };
