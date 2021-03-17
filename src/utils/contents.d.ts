export function decodeContenthash(encoded: any): {
    protocolType: any;
    decoded: any;
    error?: undefined;
} | {
    protocolType: string;
    decoded: any;
    error: any;
};
export function validateContent(encoded: any): any;
export function isValidContenthash(encoded: any): boolean;
export function encodeContenthash(text: any): boolean;
