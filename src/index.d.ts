export default class ENS {
    /**
     * ENS
     * @param {Object} options
     * @param {*} options.networkId
     * @param {Provider} options.provider
     * @param {string} options.ensAddress
     */
    constructor(options: {
        networkId: any;
        provider: typeof ethers.providers.Provider;
        ensAddress: string;
    });
    provider: ethers.providers.Web3Provider | (typeof ethers.providers.Provider & ethers.providers.Provider);
    signer: any;
    ens: any;
    /**
     * name
     * @param {string} name
     * @returns {Name}
     */
    name(name: string): Name;
    /**
     * resolver
     * @param {string} address
     * @returns {Resolver}
     */
    resolver(address: string): Resolver;
    /**
     * getName
     * @param {string} address
     * @returns {Promise<{name: null}|{name: *}|undefined>}
     */
    getName(address: string): Promise<{
        name: null;
    } | {
        name: any;
    } | undefined>;
    /**
     * getNameWithResolver
     * @param {string} address
     * @param {string} resolverAddr
     * @returns {Promise<{name: null}|{name: *}>}
     */
    getNameWithResolver(address: string, resolverAddr: string): Promise<{
        name: null;
    } | {
        name: any;
    }>;
    /**
     * setReverseRecord
     * @param {string} name
     * @param {*} overrides
     * @returns {Promise<*>}
     */
    setReverseRecord(name: string, overrides: any): Promise<any>;
}
import { ethers } from "ethers";
declare class Name {
    /**
     * Name
     * @param {Object} options
     * @param {Name} options.name
     * @param {ENS} options.ens
     * @param {Provider} options.provider
     * @param {Provider} options.signer
     * @param {string} options.namehash
     * @param {Resolver} options.resolver
     */
    constructor(options: {
        name: Name;
        ens: ENS;
        provider: typeof ethers.providers.Provider;
        signer: typeof ethers.providers.Provider;
        namehash: string;
        resolver: Resolver;
    });
    namehash: string;
    ens: ENS;
    ensWithSigner: any;
    name: Name;
    provider: typeof ethers.providers.Provider;
    signer: typeof ethers.providers.Provider;
    resolver: Resolver;
    /**
     * Return the owner
     * @returns {Promise<*>}
     */
    getOwner(): Promise<any>;
    /**
     * Set the owner
     * @param {string} address
     * @returns {Promise<*|< | >>}
     */
    setOwner(address: string): Promise<any | (() => any)>;
    /**
     * Get the resolver
     * @returns {Promise<Resolver>}
     */
    getResolver(): Promise<Resolver>;
    /**
     * Set the resolver
     * @param {string} address
     * @returns {Promise<*|< | >>}
     */
    setResolver(address: string): Promise<any | (() => any)>;
    /**
     * Get Time To Live
     * @returns {Promise<*>}
     */
    getTTL(): Promise<any>;
    /**
     * Get Resolver Address
     * @returns {Promise<Resolver>}
     */
    getResolverAddr(): Promise<Resolver>;
    /**
     * Get Resolver
     * @param {string} coinId
     * @returns {Promise<*>}
     */
    getAddress(coinId: string): Promise<any>;
    /**
     * Set the address
     * @param {string} key
     * @param {string} address
     * @returns {Promise<*>}
     */
    setAddress(key: string, address: string): Promise<any>;
    /**
     * Get the content
     * @returns {Promise<*>}
     */
    getContent(): Promise<any>;
    /**
     * Set the content hash
     * @param {string} content
     * @returns {Promise<*>}
     */
    setContenthash(content: string): Promise<any>;
    /**
     * Get the text
     * @param {string} key
     * @returns {Promise<string|*>}
     */
    getText(key: string): Promise<string | any>;
    /**
     * Set the text
     * @param {string} key
     * @param {*} recordValue
     * @returns {Promise<*>}
     */
    setText(key: string, recordValue: any): Promise<any>;
    /**
     * Set subnode owner
     * @param {string} label
     * // todo check this is a string (newOwner)
     * @param {string} newOwner
     * @returns {Promise<*|< | >>}
     */
    setSubnodeOwner(label: string, newOwner: string): Promise<any | (() => any)>;
    /**
     * Set Subnode Record
     * @param {string} label
     * @param {string} newOwner
     * @param {Resolver} resolver
     * @param {number} ttl
     * @returns {Promise<*|< | >>}
     */
    setSubnodeRecord(label: string, newOwner: string, resolver: Resolver, ttl?: number): Promise<any | (() => any)>;
    /**
     * Create subdomain
     * @param {string} label
     * @returns {Promise<*>}
     */
    createSubdomain(label: string): Promise<any>;
    /**
     * Delete Subdomain
     * @param {string} label
     * @returns {Promise<*>}
     */
    deleteSubdomain(label: string): Promise<any>;
}
declare class Resolver {
    /**
     * Resolver
     * {{address: string, ens: ENS}}
     */
    constructor({ address, ens }: {
        address: any;
        ens: any;
    });
    address: any;
    ens: any;
    /**
     * name
     *
     * @param {string} name
     * @returns {Name}
     */
    name(name: string): Name;
}
import { namehash } from "./utils";
import { labelhash } from "./utils";
/**
 * Get ENS Contract
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
