const sha3 = require('js-sha3').keccak_256
import { normalize } from 'eth-ens-namehash'

/**
 * Encode label hash
 * @param {hash} hash
 * @throws {Error} if label hash doesn't start with 0x or is not 66 characters
 * @returns {string}
 */
export function encodeLabelhash(hash) {
  if (!hash.startsWith('0x')) {
    throw new Error('Expected label hash to start with 0x')
  }

  if (hash.length !== 66) {
    throw new Error('Expected label hash to have a length of 66')
  }

  return `[${hash.slice(2)}]`
}

/**
 * Decode Label Hash
 * @param {string } hash
 * @returns {string}
 */
export function decodeLabelhash(hash) {
  if (!(hash.startsWith('[') && hash.endsWith(']'))) {
    throw Error(
      'Expected encoded labelhash to start and end with square brackets'
    )
  }

  if (hash.length !== 66) {
    throw Error('Expected encoded labelhash to have a length of 66')
  }

  return `${hash.slice(1, -1)}`
}

/**
 * Check if is an encoded label hash
 * Will return true if a hash enclosed between [ ] and 66 characters long
 * @param hash
 * @returns {boolean}
 */
export function isEncodedLabelhash(hash) {
  return hash.startsWith('[') && hash.endsWith(']') && hash.length === 66
}

/**
 * Check if is a decrypted value
 * @param {string} name
 * @returns {boolean}
 */
export function isDecrypted(name) {
  const nameArray = name.split('.')
  const decrypted = nameArray.reduce((acc, label) => {
    if (acc === false) return false
    return isEncodedLabelhash(label) ? false : true
  }, true)

  return decrypted
}

/**
 * Hash Label
 * CHeck if is an encoded label hash, and then return in the format 0x.. or return false
 *
 * @param {string} unnormalisedLabelOrLabelhash
 * @returns {string|boolean}
 */
export function labelhash(unnormalisedLabelOrLabelhash) {
  return isEncodedLabelhash(unnormalisedLabelOrLabelhash)
    ? '0x' + decodeLabelhash(unnormalisedLabelOrLabelhash)
    : '0x' + sha3(normalize(unnormalisedLabelOrLabelhash))
}
