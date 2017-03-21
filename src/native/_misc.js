const t = require('./_base').types;

module.exports = {
  functions: {
    app_pub_sign_key: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    sign_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'ObjectHandleCB']],
    sign_key_get: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'KeyBytesCB']],
    sign_key_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']],
    app_pub_enc_key: [t.Void, [t.AppPtr, 'pointer', 'ObjectHandleCB']],
    enc_key_new: [t.Void, [t.AppPtr, t.KEYBYTES, 'pointer', 'ObjectHandleCB']],
    enc_key_get: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'KeyBytesCB']],
    enc_key_free: [t.Void, [t.AppPtr, t.ObjectHandle, 'pointer', 'EmptyCB']]
  }
}
