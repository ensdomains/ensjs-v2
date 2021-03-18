/**
 * Encode label hash
 * @param {hash} hash
 * @throws {Error} if label hash doesn't start with 0x or is not 66 characters
 * @returns {string}
 */
export function encodeLabelhash(hash: any): string;
/**
 * Decode Label Hash
 * @param {string } hash
 * @returns {string}
 */
export function decodeLabelhash(hash: string): string;
/**
 * Check if is an encoded label hash
 * Will return true if a hash enclosed between [ ] and 66 characters long
 * @param hash
 * @returns {boolean}
 */
export function isEncodedLabelhash(hash: any): boolean;
/**
 * Check if is a decrypted value
 * @param {string} name
 * @returns {boolean}
 */
export function isDecrypted(name: string): boolean;
/**
 * Hash Label
 * CHeck if is an encoded label hash, and then return in the format 0x.. or return false
 *
 * @param {string} unnormalisedLabelOrLabelhash
 * @returns {string|boolean}
 */
export function labelhash(unnormalisedLabelOrLabelhash: string): string | boolean;
