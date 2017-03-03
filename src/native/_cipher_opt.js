const t = require('./_base').types;

module.exports = {
  functions: {
    cipher_opt_new_plaintext: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    cipher_opt_new_symmetric: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    cipher_opt_new_asymmetric: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'ObjectHandleCB']],
    cipher_opt_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']]
  }
};
