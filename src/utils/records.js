import { addressUtils } from '@0xproject/utils'
import { validateContent } from './contents'

/**
 * @typedef { "address" | "content" | null } recordType
 */

/**
 * @typedef { "contenthash" | "oldcontent" | null } contentType
 */

/**
 * Validate Record
 * @param {Object} record
 * @param {recordType} record.type The record type
 * @param {contentType} record.contentType The record contentType
 * @param {string} record.value The record value
 * @throws {Error} will throw an error if unrecognised record type
 * @returns {boolean|any}
 */
export function validateRecord(record) {
  if (!record.type) {
    return false
  }

  const { type, value } = record

  if (type == 'content' && record.contentType === 'oldcontent') {
    return value.length > 32
  }

  switch (type) {
    case 'address':
      return addressUtils.isAddress(value)
    case 'content':
      return validateContent(value)
    default:
      throw new Error('Unrecognised record type')
  }
}

/**
 * Get Place Holder
 * @param {recordType} recordType
 * @param {contentType} contentType
 * @returns {string}
 */
export function getPlaceholder(recordType, contentType) {
  switch (recordType) {
    case 'address':
      return 'Enter an Ethereum address'
    case 'content':
      if (contentType === 'contenthash') {
        return 'Enter a content hash (eg: ipfs://..., bzz://..., onion://..., onion3://...)'
      } else {
        return 'Enter a content'
      }
    default:
      return ''
  }
}

export const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'
