
class ERR_ENCODE_DECODE_ERROR extends Error { };
class ERR_ASYMMETRIC_DECIPHER_FAILURE extends Error { };
class ERR_SYMMETRIC_DECIPHER_FAILURE extends Error { };
class ERR_RECEIVED_UNEXPECTED_DATA extends Error { };
class ERR_RECEIVED_UNEXPECTED_EVENT extends Error { };
class ERR_VERSION_CACHE_MISS extends Error { };
class ERR_ROOT_DIRECTORY_EXISTS extends Error { };
class ERR_RANDOM_DATA_GENERATION_FAILURE extends Error { };
class ERR_OPERATION_FORBIDDEN extends Error { };
class ERR_ROUTING_ERROR extends Error { };
class ERR_ROUTING_INTERFACE_ERROR extends Error { };
class ERR_UNSUPPORTED_SALT_SIZE_FOR_PW_HASH extends Error { };
class ERR_UNSUCCESSFUL_PW_HASH extends Error { };
class ERR_OPERATION_ABORTED extends Error { };
class ERR_MPID_MESSAGING_ERROR extends Error { };
class ERR_SELF_ENCRYPTION extends Error { };
class ERR_REQUEST_TIMEOUT extends Error { };
class ERR_ACCESS_DENIED extends Error { };
class ERR_NO_SUCH_ACCOUNT extends Error { };
class ERR_ACCOUNT_EXISTS extends Error { };
class ERR_NO_SUCH_DATA extends Error { };
class ERR_DATA_EXISTS extends Error { };
class ERR_DATA_TOO_LARGE extends Error { };
class ERR_NO_SUCH_ENTRY extends Error { };
class ERR_ENTRY_EXISTS extends Error { };
class ERR_TOO_MANY_ENTRIES extends Error { };
class ERR_NO_SUCH_KEY extends Error { };
class ERR_INVALID_OWNERS extends Error { };
class ERR_INVALID_SUCCESSOR extends Error { };
class ERR_INVALID_OPERATION extends Error { };
class ERR_LOW_BALANCE extends Error { };
class ERR_NETWORK_FULL extends Error { };
class ERR_NETWORK_OTHER extends Error { };
class ERR_AUTH_DENIED extends Error { };
class ERR_CONTAINERS_DENIED extends Error { };
class ERR_INVALID_MSG extends Error { };
class ERR_ALREADY_AUTHORISED extends Error { };
class ERR_UNKNOWN_APP extends Error { };
class ERR_DIRECTORY_EXISTS extends Error { };
class ERR_DESTINATION_AND_SOURCE_ARE_SAME extends Error { };
class ERR_DIRECTORY_NOT_FOUND extends Error { };
class ERR_FILE_EXISTS extends Error { };
class ERR_FILE_DOES_NOT_MATCH extends Error { };
class ERR_FILE_NOT_FOUND extends Error { };
class ERR_INVALID_RANGE extends Error { };
class ERR_INVALID_PARAMETER extends Error { };
class ERR_NO_SUCH_CONTAINER extends Error { };
class ERR_INVALID_CIPHER_OPT_HANDLE extends Error { };
class ERR_INVALID_ENCRYPT_KEY_HANDLE extends Error { };
class ERR_INVALID_MDATA_INFO_HANDLE extends Error { };
class ERR_INVALID_MDATA_ENTRIES_HANDLE extends Error { };
class ERR_INVALID_MDATA_ENTRY_ACTIONS_HANDLE extends Error { };
class ERR_INVALID_MDATA_PERMISSIONS_HANDLE extends Error { };
class ERR_INVALID_MDATA_PERMISSION_SET_HANDLE extends Error { };
class ERR_INVALID_SELF_ENCRYPTOR_HANDLE extends Error { };
class ERR_INVALID_SIGN_KEY_HANDLE extends Error { };
class ERR_INVALID_SELF_ENCRYPTOR_READ_OFFSETS extends Error { };
class ERR_IO_ERROR extends Error { };
class ERR_UNEXPECTED extends Error { };


const CODES = {
     "-1": ERR_ENCODE_DECODE_ERROR,
     "-2": ERR_ASYMMETRIC_DECIPHER_FAILURE,
     "-3": ERR_SYMMETRIC_DECIPHER_FAILURE,
     "-4": ERR_RECEIVED_UNEXPECTED_DATA,
     "-5": ERR_RECEIVED_UNEXPECTED_EVENT,
     "-6": ERR_VERSION_CACHE_MISS,
     "-7": ERR_ROOT_DIRECTORY_EXISTS,
     "-8": ERR_RANDOM_DATA_GENERATION_FAILURE,
     "-9": ERR_OPERATION_FORBIDDEN,
     "-10": ERR_ROUTING_ERROR,
     "-11": ERR_ROUTING_INTERFACE_ERROR,
     "-12": ERR_UNSUPPORTED_SALT_SIZE_FOR_PW_HASH,
     "-13": ERR_UNSUCCESSFUL_PW_HASH,
     "-14": ERR_OPERATION_ABORTED,
     "-15": ERR_MPID_MESSAGING_ERROR,
     "-16": ERR_SELF_ENCRYPTION,
     "-17": ERR_REQUEST_TIMEOUT,

    // routing Client errors
     "-100": ERR_ACCESS_DENIED,
     "-101": ERR_NO_SUCH_ACCOUNT,
     "-102": ERR_ACCOUNT_EXISTS,
     "-103": ERR_NO_SUCH_DATA,
     "-104": ERR_DATA_EXISTS,
     "-105": ERR_DATA_TOO_LARGE,
     "-106": ERR_NO_SUCH_ENTRY,
     "-107": ERR_ENTRY_EXISTS,
     "-108": ERR_TOO_MANY_ENTRIES,
     "-109": ERR_NO_SUCH_KEY,
     "-110": ERR_INVALID_OWNERS,
     "-111": ERR_INVALID_SUCCESSOR,
     "-112": ERR_INVALID_OPERATION,
     "-113": ERR_LOW_BALANCE,
     "-114": ERR_NETWORK_FULL,
     "-115": ERR_NETWORK_OTHER,

    // IPC errors.
     "-200": ERR_AUTH_DENIED,
     "-201": ERR_CONTAINERS_DENIED,
     "-202": ERR_INVALID_MSG,
     "-203": ERR_ALREADY_AUTHORISED,
     "-204": ERR_UNKNOWN_APP,

    // NFS errors.
     "-300": ERR_DIRECTORY_EXISTS,
     "-301": ERR_DESTINATION_AND_SOURCE_ARE_SAME,
     "-302": ERR_DIRECTORY_NOT_FOUND,
     "-303": ERR_FILE_EXISTS,
     "-304": ERR_FILE_DOES_NOT_MATCH,
     "-305": ERR_FILE_NOT_FOUND,
     "-306": ERR_INVALID_RANGE,
     "-307": ERR_INVALID_PARAMETER,

    // App errors
     "-1002": ERR_NO_SUCH_CONTAINER,
     "-1003": ERR_INVALID_CIPHER_OPT_HANDLE,
     "-1004": ERR_INVALID_ENCRYPT_KEY_HANDLE,
     "-1005": ERR_INVALID_MDATA_INFO_HANDLE,
     "-1006": ERR_INVALID_MDATA_ENTRIES_HANDLE,
     "-1007": ERR_INVALID_MDATA_ENTRY_ACTIONS_HANDLE,
     "-1008": ERR_INVALID_MDATA_PERMISSIONS_HANDLE,
     "-1009": ERR_INVALID_MDATA_PERMISSION_SET_HANDLE,
     "-1010": ERR_INVALID_SELF_ENCRYPTOR_HANDLE,
     "-1011": ERR_INVALID_SIGN_KEY_HANDLE,
     "-1012": ERR_INVALID_SELF_ENCRYPTOR_READ_OFFSETS,
     "-1013": ERR_IO_ERROR,

     "-2000": ERR_UNEXPECTED,
};

// Fallback
class UnknownFfiError extends Error {};

module.exports = function(code, msg) {
  let cls = CODES[code.toString()] || UnknownFfiError;
  return new cls(msg);
}
