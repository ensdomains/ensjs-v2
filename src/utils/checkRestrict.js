export function checkRestrict(str) {
    if (typeof str === "string" && str.length > 0) {
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i)
            if ((c >= 0 && c <= 44) || (c >= 46 && c <= 47) || (c >= 58 && c <= 94) || (c === 96) || (c >= 123 && c <= 127)) {
                return false;
            }
        }
    }
    return true
}
