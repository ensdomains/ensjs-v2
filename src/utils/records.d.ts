/**
 * @typedef { "address" | "content" | "oldcontent" } recordType
 */
/**
 * Validate Record
 * @param {Object} record
 * @param {recordType} record.type The record type
 * @param {string} record.value The record value
 * @throws {Error} will throw an error if unrecognised record type
 * @returns {boolean|any}
 */
export function validateRecord(record: {
    type: recordType;
    value: string;
}): boolean | any;
/**
 * @typedef { "contenthash" } contentType
 */
/**
 * Get Place Holder
 * @param {recordType} recordType
 * @param {contentType} contentType
 * @returns {string}
 */
export function getPlaceholder(recordType: recordType, contentType: contentType): string;
export const EMPTY_ADDRESS: "0x0000000000000000000000000000000000000000";
export type recordType = "address" | "content" | "oldcontent";
export type contentType = "contenthash";
