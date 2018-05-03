const h = require('../helpers');
const lib = require('../native/lib');
const t = require('../native/types');
const emulations = require('./emulations');
const { PubSignKey } = require('./crypto');
const { pubConsts: CONSTANTS } = require('../consts');
const errConst = require('../error_const');
const makeError = require('../native/_error.js');

/**
* Holds the permissions of a MutableData object
*/
class Permissions extends h.NetworkObject {

  /**
  * Total number of permission entries
  * @returns {Promise<Number>} number of entries
  */
  len() {
    return lib.mdata_permissions_len(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free() {
    return lib.mdata_permissions_free(this.app.connection, this.ref);
  }

  /**
  * Lookup the permissions of a specifc key
  * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to lookup for
  * @returns {Promise<Object>} the permission set for that key
  */
  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app.connection,
                                     this.ref,
                                     signKey ? signKey.ref : CONSTANTS.USER_ANYONE);
  }

  /**
  * Insert a new permission set mapped to a specifc key. Directly commits
  * to the network.
  * Requires 'ManagePermissions'-Permission for the app.
  * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to map to
  * @param {Object} permissionSet the permission set to insert
  * @returns {Promise} once finished
  */
  insertPermissionSet(signKey, permissionSet) {
    return lib.mdata_permissions_insert(this.app.connection,
                                        this.ref,
                                        signKey
                                          ? signKey.ref
                                          : CONSTANTS.USER_ANYONE,
                                        permissionSet);
  }

  /**
  * Return the list of all associated permission sets.
  * @returns {Promise<Array>} the list of permission sets
  */
  listPermissionSets() {
    return lib.mdata_list_permission_sets(this.app.connection, this.ref)
        .then((permSets) => permSets.map((userPermSet) =>
          ({ signKey: new PubSignKey(this.app, userPermSet.signKey),
            permSet: userPermSet.permSet
          })
        ));
  }

}

/**
* Holds a mutations to be done to the entries within one
* transaction on the network.
*
* You need this whenever you want to change the content of
* the entries.
*
* @example // Mutate a range of Entries
*
* app.mutableData.newPublic(somename, tagtype)
*  .then((mData) => mData.getEntries()
*   .then((entries) => entries.mutate()
*     .then((m) => m.insert('key', 'value')
*       // this is where all mutations are recorded
*       .then(() => mData.applyEntriesMutation(m))
*     )))
*/
class EntryMutationTransaction extends h.NetworkObject {

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free(app, ref) {
    return lib.mdata_entry_actions_free(app.connection, ref);
  }


  /**
  * Store a new `Insert`-Action in the transaction to store a new entry.
  *
  * @param {(String|Buffer)} keyName the key you want to insert
  * @param {(String|Buffer)} value the value you want to insert
  * @returns {Promise} resolves once the storing is done
  */
  insert(keyName, value) {
    return lib.mdata_entry_actions_insert(
      this.app.connection,
      this.ref,
      keyName,
      value
    );
  }

  /**
  * Store a new `Remove`-Action in the transaction to remove an existing entry.
  *
  * @param {(String|Buffer)} keyName the key you want to remove
  * @param {Number} version the version successor, to confirm you are
  *        actually asking for the right version
  * @returns {Promise} resolves once the storing is done
  */
  remove(keyName, version) {
    return lib.mdata_entry_actions_delete(
      this.app.connection,
      this.ref,
      keyName,
      version
    );
  }

  /**
  * Store a `Update`-Action in the transaction to update an existing entry.
  *
  * @param {(String|Buffer)} keyName the key for the entry you want to update
  * @param {(String|Buffer)} value the value to upate to
  * @param {Number} version - the version successor, to confirm you are
  *        actually asking for the right version
  * @returns {Promise} resolves once the storing is done
  */
  update(keyName, value, version) {
    return lib.mdata_entry_actions_update(
      this.app.connection,
      this.ref,
      keyName,
      value,
      version
    );
  }
}


/**
* Represent the Entries of a MutableData network object
*/
class Entries extends h.NetworkObject {

  /**
  * Get the total number of entries in the MutableData
  * @returns {Promise<Number>} number of entries
  */
  len() {
    return lib.mdata_entries_len(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the mdata keys reference
  * @param {SAFEApp} app
  * @param {handle} ref
  */
  static free(app, ref) {
    return lib.mdata_entries_free(app.connection, ref);
  }

  /**
  * Look up the value of a specific key
  *
  * @param {String} keyName the key to lookup
  * @returns {Promise<ValueVersion>} the entry's value and the current version
  */
  get(keyName) {
    return lib.mdata_entries_get(this.app.connection, this.ref, keyName);
  }

  /**
  * Get a list with the entries contained in this MutableData
  * @returns {Promise<(Array)>} the entries list
  */
  listEntries() {
    return lib.mdata_list_entries(this.app.connection, this.ref);
  }

  /**
  * Insert a new entry. Once you call `MutableData.put` with this entry,
  * it will fail if the entry already exists or the current app doesn't have the
  * permissions to edit that mutable data.
  *
  *
  * @param {(String|Buffer)} keyName the key you want store the data under
  * @param {(String|Buffer)} value the data you want to store
  * @returns {Promise} resolves once storing is done
  */
  insert(keyName, value) {
    return lib.mdata_entries_insert(this.app.connection, this.ref, keyName, value);
  }

  /**
  * Create a new mutation transaction for the entries
  * @return {Promise<EntryMutationTransaction>} the mutation transaction object
  */
  mutate() {
    return lib.mdata_entry_actions_new(this.app.connection)
            .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

}

/**
* @typedef {Object} ValueVersion
* @param {Buffer} buf the buffer with the value
* @param {Number} version the version
* Holds the informatation of a value of a MutableData
*/

/**
* @typedef {Object} NameAndTag
* @param {Buffer} name - the XoR-name/address on the network
* @param {Number} type_tag - the type tag
*/

/**
* Holds the reference to a MutableData
*/
class MutableData extends h.NetworkObject {

  /**
  * Easily set up a newly (not yet created) MutableData with
  * the app having full-access permissions (and no other).
  * The name and description parameters are metadata for the MutableData which
  * can be used to identify what this MutablaData contains.
  * The metadata is particularly used by the Authenticator when another
  * application has requested mutation permissions on this MutableData,
  * so the user can make a better decision to either allow or deny such a
  * request based on this information.
  *
  * @param {Object} data a key-value payload it should
  *        create the data with
  * @param {(String|Buffer)} name a descriptive name for the MutableData
  * @param {(String|Buffer)} description a detailed description for the MutableData content
  *
  * @returns {Promise<MutableData>} self
  * @example
  * app.mutableData.newRandomPublic(tagtype)
  *   .then((md) => md.quickSetup({
  *        key1: 'value1',
  *        key2: 'value2'
  *      }, 'My MutableData', 'To store my app\'s data'))
  */
  quickSetup(data, name, description) {
    const pmSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];

    return this.app.mutableData.newEntries()
      .then((entries) => {
        if (!data) {
          return entries;
        }
        return Promise.all(Object.getOwnPropertyNames(data).map((key) =>
          entries.insert(key, data[key]))).then(() => entries);
      })
      .then((entries) => {
        if (!name && !description) {
          return entries;
        }
        const userMetadata = new t.UserMetadata({ name, description });
        return lib.mdata_encode_metadata(userMetadata)
          .then((encodedMeta) => entries.insert(CONSTANTS.MD_METADATA_KEY, encodedMeta))
          .then(() => entries);
      })
      .then((entries) => this.app.crypto.getAppPubSignKey()
        .then((key) => this.app.mutableData.newPermissions()
            .then((pm) => pm.insertPermissionSet(key, pmSet)
              .then(() => this.put(pm, entries))))
      )
      .then(() => this);
  }

  /**
  * Set the metadata information in the MutableData. Note this can be used
  * only if the MutableData was already committed to the network, .i.e either
  * with `put`, with `quickSetup`, or if it is an already existing MutableData
  * just fetched from the network.
  * The metadata is particularly used by the Authenticator when another
  * application has requested mutation permissions on this MutableData,
  * displaying this information to the user, so the user can make a better
  * decision to either allow or deny such a request based on it.
  *
  * @param {(String|Buffer)} name a descriptive name for the MutableData
  * @param {(String|Buffer)} description a detailed description for the MutableData content
  *
  * @returns {Promise} resolves once finished
  */
  setMetadata(name, description) {
    const userMetadata = new t.UserMetadata({ name, description });
    return lib.mdata_encode_metadata(userMetadata)
      .then((encodedMeta) => this.app.mutableData.newMutation()
        .then((mut) => this.get(CONSTANTS.MD_METADATA_KEY)
          .then((metadata) => mut.update(CONSTANTS.MD_METADATA_KEY,
                                          encodedMeta, metadata.version + 1)
            , () => mut.insert(CONSTANTS.MD_METADATA_KEY, encodedMeta)
          )
          .then(() => this.applyEntriesMutation(mut))
        ));
  }

  /**
  * Encrypt the entry key provided as parameter with the encryption key
  * contained in a Private MutableData. If the MutableData is Public, the same
  * (and unencrypted) value is returned.
  *
  * @param {(String|Buffer)} key the key you want to encrypt
  * @returns {Promise<Key>} the encrypted entry key
  */
  encryptKey(key) {
    return lib.mdata_info_encrypt_entry_key(this.ref, key);
  }

  /**
  * Encrypt the entry value provided as parameter with the encryption key
  * contained in a Private MutableData. If the MutableData is Public, the same
  * (and unencrypted) value is returned.
  *
  * @param {(String|Buffer)} value the data you want to encrypt
  * @returns {Promise<Value>} the encrypted entry value
  */
  encryptValue(value) {
    return lib.mdata_info_encrypt_entry_value(this.ref, value);
  }

  /**
  * Decrypt the entry key/value provided as parameter with the encryption key
  * contained in a Private MutableData.
  *
  * @param {(String|Buffer)} value the data you want to decrypt
  * @returns {Promise<Value>} the decrypted value
  */
  decrypt(value) {
    return lib.mdata_info_decrypt(this.ref, value);
  }

  /**
  * Look up the name and tag of the MutableData as required to look it
  * up on the network.
  *
  * @returns {Promise<NameAndTag>} the XoR-name and type tag
  */
  getNameAndTag() {
    return Promise.resolve({
      name: this.ref.name,
      type_tag: this.ref.type_tag
    });
  }

  /**
  * Look up the mutable data object version on the network
  *
  * @returns {Promise<Number>} current version
  */
  getVersion() {
    return lib.mdata_get_version(this.app.connection, this.ref);
  }

  /**
  * Look up the value of a specific key
  *
  * @returns {Promise<ValueVersion>} the entry value and its current version
  */
  get(key) {
    return lib.mdata_get_value(this.app.connection, this.ref, key);
  }

  /**
  * Commit this MutableData to the network.
  * @param {Permission|CONSTANTS.MD_PERMISSION_EMPTY} permissions
  * the permissions to create the mutable data with
  * @param {Entries|CONSTANTS.MD_ENTRIES_EMPTY} entries
  * data entries to create the mutable data with
  * @returns {Promise}
  */
  put(permissions, entries) {
    return lib.mdata_put(this.app.connection,
                          this.ref,
                          permissions ? permissions.ref : CONSTANTS.MD_PERMISSION_EMPTY,
                          entries ? entries.ref : CONSTANTS.MD_ENTRIES_EMPTY);
  }

  /**
  * Get a Handle to the entries associated with this MutableData
  * @returns {Promise<(Entries)>} the entries representation object
  */
  getEntries() {
    return lib.mdata_entries(this.app.connection, this.ref)
      .then((r) => h.autoref(new Entries(this.app, r)));
  }

  /**
  * Get a list with the keys contained in this MutableData
  * @returns {Promise<(Array)>} the keys list
  */
  getKeys() {
    return lib.mdata_list_keys(this.app.connection, this.ref);
  }

  /**
  * Get the list of values contained in this MutableData
  * @returns {Promise<(Array)>} the list of values
  */
  getValues() {
    return lib.mdata_list_values(this.app.connection, this.ref);
  }

  /**
  * Get a Handle to the permissions associated with this mutableData
  * @returns {Promise<(Permissions)>} the permissions representation object
  */
  getPermissions() {
    return lib.mdata_list_permissions(this.app.connection, this.ref)
      .then((r) => h.autoref(new Permissions(this.app, r, this)));
  }

  /**
  * Get a Handle to the permissions associated with this MutableData for
  * a specifc key
  * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to look up
  * @returns {Promise<(Permissions)>} the permissions set associated to the key
  */
  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app.connection, this.ref,
                                                      signKey
                                                        ? signKey.ref
                                                        : CONSTANTS.USER_ANYONE);
  }

  /**
  * Delete the permissions of a specifc key. Directly commits to the network.
  * Requires 'ManagePermissions'-Permission for the app.
  * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to lookup for
  * @param {Number} version the version successor, to confirm you are
  *        actually asking for the right one
  * @returns {Promise} once finished
  */
  delUserPermissions(signKey, version) {
    return lib.mdata_del_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey
                                            ? signKey.ref
                                            : CONSTANTS.USER_ANYONE,
                                          version);
  }

  /**
  * Set the permissions of a specifc key. Directly commits to the network.
  * Requires 'ManagePermissions'-Permission for the app.
  * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to lookup for
  * @param {PermissionSet} permissionSet the permission set to set to
  * @param {Number} version the version successor, to confirm you are
  *        actually asking for the right one
  * @returns {Promise} resolves once finished
  */
  setUserPermissions(signKey, permissionSet, version) {
    return lib.mdata_set_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey
                                            ? signKey.ref
                                            : CONSTANTS.USER_ANYONE,
                                          permissionSet || [],
                                          version);
  }

  /**
  * Commit the transaction to the network
  * @param {EntryMutationTransaction} mutations the Mutations you want to apply
  * @return {Promise} resolves once finished
  */
  applyEntriesMutation(mutations) {
    return lib.mdata_mutate_entries(this.app.connection, this.ref, mutations.ref);
  }

  /**
  * Serialise the current MutableData
  * @returns {Promise<(String)>} the serialilsed version of the MutableData
  */
  serialise() {
    return lib.mdata_info_serialise(this.ref);
  }

  /**
  * Get serialised size of current MutableData
  * @returns {Promise<(Number)>} the serialilsed size of the MutableData
  */
  getSerialisedSize() {
    return lib.mdata_serialised_size(this.app.connection, this.ref);
  }

  /**
  * Wrap this MutableData into a known abstraction. Currently only known: `NFS`
  * @param {String} eml - name of the emulation
  * @returns {Emulation} the Emulation you are asking for
  */
  emulateAs(eml) {
    return new emulations[eml.toUpperCase()](this);
  }
}

/**
* Provide the MutableData API for the session.
*
* Access via `mutableData` on your app Instance.
*
* @example // using mutable Data
* app.mutableData.newRandomPublic(15001)
*   // set it up with starting data
*   .then((mdata) => mdata.quickSetup({keyA: 'input value'})
*    .then(() => mdata.getNameAndTag())) // return name and tag
*
* // now read using name and tag
* .then((ref) => app.mutableData.newPublic(ref.name, ref.tag)
*   .then((mdata) => mdata.get('keyA').then((val) => {
*     should(val.buf.toString()).equal('input value');
*   })))
*/
class MutableDataInterface {
  /**
  * @private
  * Create a new MutableData
  * @param {SAFEApp} app instance this is bound to
  */
  constructor(app) {
    this.app = app;
  }

  /**
  * Create a new mutuable data at a random address with private
  * access.
  * @param {Number} typeTag the typeTag to use
  * @returns {Promise<MutableData>}
  */
  newRandomPrivate(typeTag) {
    if (!typeTag || !Number.isInteger(typeTag)) {
      throw makeError(errConst.TYPE_TAG_NAN.code, errConst.TYPE_TAG_NAN.msg);
    }
    return lib.mdata_info_random_private(typeTag)
          .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }


  /**
  * Create a new mutuable data at a random address with public
  * access.
  * @param {Number} typeTag - the typeTag to use
  * @returns {Promise<MutableData>}
  */
  newRandomPublic(typeTag) {
    if (!typeTag || !Number.isInteger(typeTag)) {
      throw makeError(errConst.TYPE_TAG_NAN.code, errConst.TYPE_TAG_NAN.msg);
    }
    return lib.mdata_info_random_public(typeTag)
          .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }

  /**
  * Initiate a mutuable data at the given address with private
  * access.
  * @param {Buffer|String} name
  * @param {Number} typeTag - the typeTag to use
  * @param {Buffer|String} secKey
  * @param {Buffer|String} nonce
  * @returns {Promise<MutableData>}
  */
  newPrivate(name, typeTag, secKey, nonce) {
    return lib.mdata_info_new_private(name, typeTag, secKey, nonce)
          .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }

  /**
  * Initiate a mutuable data at the given address with public
  * access.
  * @param {Buffer|String}
  * @param {Number} typeTag the typeTag to use
  * @returns {Promise<MutableData>}
  */
  newPublic(name, typeTag) {
    const mDataInfo = lib.makeMDataInfoObj({ name, type_tag: typeTag });
    return Promise.resolve(this.wrapMdata(mDataInfo));
  }

  /**
  * Create a new Permissions object.
  * @returns {Promise<Permissions>}
  */
  newPermissions() {
    return lib.mdata_permissions_new(this.app.connection)
        .then((r) => h.autoref(new Permissions(this.app, r)));
  }

  /**
  * Create a new EntryMutationTransaction object.
  * @returns {Promise<EntryMutationTransaction>}
  */
  newMutation() {
    return lib.mdata_entry_actions_new(this.app.connection)
        .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

  /**
  * Create a new Entries object.
  * @returns {Promise<Entries>}
  */
  newEntries() {
    return lib.mdata_entries_new(this.app.connection)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }

  /**
  * Create a new Mutuable Data object from its serial
  * @returns {Promise<MutableData>}
  */
  fromSerial(serial) {
    return lib.mdata_info_deserialise(serial)
        .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }

  /**
  * @private
  * Helper to create a new autorefence MutableData for a given
  * mdata reference from the native layer
  *
  * @param {handle} mDataInfo - the native handle
  * @returns {MutableData} - wrapped
  */
  wrapMdata(mDataInfo) {
    return new MutableData(this.app, mDataInfo);
  }

}

module.exports = MutableDataInterface;
