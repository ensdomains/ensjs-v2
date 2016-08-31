/**
 * The ENS registry contract.
 */
contract ENS {
    struct Record {
        address owner;
        address resolver;
    }
    
    mapping(bytes32=>Record) records;
    
    // Logged when the owner of a node assigns a new owner to a subnode.
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);

    // Logged when the owner of a node transfers ownership to a new account.
    event Transfer(bytes32 indexed node, address owner);

    // Logged when the owner of a node changes the resolver for that node.
    event NewResolver(bytes32 indexed node, address resolver);
    
    // Permits modifications only by the owner of the specified node.
    modifier only_owner(bytes32 node) {
        if(records[node].owner != msg.sender) throw;
        _
    }
    
    /**
     * Constructs a new ENS registrar, with the provided address as the owner of the root node.
     */
    function ENS(address owner) {
        records[0].owner = owner;
    }
    
    /**
     * Returns the address that owns the specified node.
     */
    function owner(bytes32 node) constant returns (address) {
        return records[node].owner;
    }
    
    /**
     * Returns the address of the resolver for the specified node.
     */
    function resolver(bytes32 node) constant returns (address) {
        return records[node].resolver;
    }

    /**
     * Transfers ownership of a node to a new address. May only be called by the current
     * owner of the node.
     * @param node The node to transfer ownership of.
     * @param owner The address of the new owner.
     */
    function setOwner(bytes32 node, address owner) only_owner(node) {
        Transfer(node, owner);
        records[node].owner = owner;
    }

    /**
     * Transfers ownership of a subnode sha3(node, label) to a new address. May only be
     * called by the owner of the parent node.
     * @param node The parent node.
     * @param label The hash of the label specifying the subnode.
     * @param owner The address of the new owner.
     */
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) only_owner(node) {
        var subnode = sha3(node, label);
        NewOwner(node, label, owner);
        records[subnode].owner = owner;
    }

    /**
     * Sets the resolver address for the specified node.
     * @param node The node to update.
     * @param resolver The address of the resolver.
     */
    function setResolver(bytes32 node, address resolver) only_owner(node) {
        NewResolver(node, resolver);
        records[node].resolver = resolver;
    }
}

contract Resolver {
    event AddrChanged(bytes32 indexed node, address a);

    function has(bytes32 node, bytes32 kind) returns (bool);
    function addr(bytes32 node) constant returns (address ret);
}

/**
 * A simple resolver anyone can use; only allows the owner of a node to set its
 * address.
 */
contract PublicResolver is Resolver {
    ENS ens;
    mapping(bytes32=>address) addresses;
    mapping(bytes32=>bytes32) contents;
    
    modifier only_owner(bytes32 node) {
        if(ens.owner(node) != msg.sender) throw;
        _
    }

    /**
     * Constructor.
     * @param ensAddr The ENS registrar contract.
     */
    function PublicResolver(address ensAddr) {
        ens = ENS(ensAddr);
    }

    /**
     * Fallback function.
     */
    function() {
        throw;
    }

    /**
     * Returns true if the specified node has the specified record type.
     * @param node The ENS node to query.
     * @param kind The record type name, as specified in EIP137.
     * @return True if this resolver has a record of the provided type on the
     *         provided node.
     */
    function has(bytes32 node, bytes32 kind) returns (bool) {
        return kind == "addr" && addresses[node] != 0;
    }
    
    /**
     * Returns the address associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated address.
     */
    function addr(bytes32 node) constant returns (address ret) {
        ret = addresses[node];
        if(ret == 0)
            throw;
    }

    /**
     * Sets the address associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param addr The address to set.
     */
    function setAddr(bytes32 node, address addr) only_owner(node) {
        addresses[node] = addr;
        AddrChanged(node, addr);
    }
}

contract DeployENS {
    ENS public ens;
    
    function DeployENS() {
        var tld = sha3('eth');
        var tldnode = sha3(bytes32(0), tld);
        ens = new ENS(this);
        var resolver = new PublicResolver(ens);
        
        // Set foo.eth up with a resolver and an addr record
        ens.setSubnodeOwner(0, tld, this);
        ens.setSubnodeOwner(tldnode, sha3('foo'), this);
        var fooDotEth = sha3(tldnode, sha3('foo'));
        ens.setResolver(fooDotEth, resolver);
        resolver.setAddr(fooDotEth, 0xDEADBEEFC0FFEE);
        
        // Set bar.eth up with a resolver but no addr record, owned by the sender
        ens.setSubnodeOwner(tldnode, sha3('bar'), this);
        var barDotEth = sha3(tldnode, sha3('bar'));
        ens.setResolver(barDotEth, resolver);
        ens.setOwner(barDotEth, msg.sender);
    }
}
