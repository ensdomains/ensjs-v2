/**
 * Decode Content Hash
 * @param {string} encoded
 * @returns {{decoded: *, protocolType: null}|{decoded: string, protocolType: string, error: *}}
 */
export function decodeContenthash(encoded: string): {
    decoded: any;
    protocolType: null;
} | {
    decoded: string;
    protocolType: string;
    error: any;
};
/**
 * Check if content is valid
 * This will validate whether the hash is of a certain type, e.g. ipfs or swarm
 *
 * @param {string} encoded
 * @returns {boolean}
 */
export function validateContent(encoded: string): boolean;
/**
 * Check if content hash is a valid hash
 * @param {string} encoded
 * @returns {boolean}
 */
export function isValidContenthash(encoded: string): boolean;
/**
 * Encode a content hash
 * Will encode a content hash in the format: 0x... or warn of an invalid value or unsupported protocol
 * This will return a hash or a false boolean value
 * @param {string} text
 * @returns {string|boolean}
 */
export function encodeContenthash(text: string): string | boolean;
