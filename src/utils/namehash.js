import { isEncodedLabelhash, decodeLabelhash } from './labelhash'
import { normalize } from 'eth-ens-namehash'
const sha3 = require('js-sha3').keccak_256

/**
 * Hash Name
 * Returns string in the format 0x..
 *
 * @param {string} inputName
 * @returns {string}
 */
export function namehash(inputName) {
  let node = ''
  for (let i = 0; i < 32; i++) {
    node += '00'
  }

  if (inputName) {
    const labels = inputName.split('.')

    for (let i = labels.length - 1; i >= 0; i--) {
      let labelSha
      if (isEncodedLabelhash(labels[i])) {
        labelSha = decodeLabelhash(labels[i])
      } else {
        let normalisedLabel = normalize(labels[i])
        labelSha = sha3(normalisedLabel)
      }
      node = sha3(new Buffer(node + labelSha, 'hex'))
    }
  }

  return '0x' + node
}
