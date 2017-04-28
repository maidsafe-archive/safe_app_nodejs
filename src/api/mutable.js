const h = require('../helpers');
const lib = require('../native/lib');
const t = require('../native/types');
const emulations = require('./emulations');
const { SignKey } = require('./crypto');

function toAction(action) {
  const a = t.MDataAction.get(action);
  if (!a) throw Error(`'${action}' is not a valid action!`);
  return a;
}


/**
* A Set of Permissions per Sign key. Each action might either be
* allowed or denied
*/
class PermissionsSet extends h.NetworkObject {

  /**
  * Set the action as allowed
  * @param {MDataAction} action
  * @returns {Promise}
  **/
  setAllow(action) {
    return lib.mdata_permissions_set_allow(this.app.connection,
          this.ref, toAction(action));
  }

  /**
  * Set the action as denied
  * @param {MDataAction} action
  * @returns {Promise}
  **/
  setDeny(action) {
    return lib.mdata_permissions_set_deny(this.app.connection,
          this.ref, toAction(action));
  }

  /**
  * Remove action from the set
  * @param {MDataAction} action
  * @returns {Promise}
  **/
  clear(action) {
    return lib.mdata_permissions_set_clear(this.app.connection,
          this.ref, toAction(action));
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.mdata_permissions_set_free(app.connection, ref);
  }
}

/**
* Holds the permissions of a MData object
**/
class Permissions extends h.NetworkObject {

  /**
  * Total number of permission entries
  * @returns {Promise<Number>}
  **/
  len() {
    return lib.mdata_permissions_len(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free() {
    return lib.mdata_permissions_free(this.app.connection, this.ref);
  }

  /**
  * Lookup the permissions of a specifc key
  * @param {SignKey} signKey - the key to lookup for
  * @returns {Promise<PermissionSet>} - the permissionset for that key
  **/
  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app.connection, this.ref,
                                                      signKey ? signKey.ref : 0)
        .then((c) => h.autoref(new PermissionsSet(this.app, c)));
  }

  /**
  * Insert a new permissions to a specifc key. Directly commits to the network.
  * Requires 'ManagePermissions'-Permission for the app.
  * @param {SignKey} signKey - the key to lookup for
  * @param {PermissionSet} pmset - the permissionset you'd like insert
  * @returns {Promise} - once finished
  **/
  insertPermissionSet(signKey, permissionSet) {
    return lib.mdata_permissions_insert(this.app.connection,
                                        this.ref,
                                        signKey ? signKey.ref : 0,
                                        permissionSet.ref);
  }

  /**
  * Iterate over the entries, execute the function every time
  * @param {function(Buffer, ValueVersion)} fn - the function to call
  * @returns {Promise<()>} - resolves once the iteration is done
  **/
  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_permissions_for_each(
      this.app.connection,
      this.ref,
      (s, p) => fn(h.autoref(new SignKey(this.app, s)),
                    h.autoref(new PermissionsSet(this.app, p))));
  }

}

/**
* Holds a  mutations to be done to the entries within one
* transaction on the network.
*
* You need this whenever you want to change the content of
* the entries.
*
* @example // Mutate a range of Entries
*
* app.mutableData.fetch(somename)
*  .then((mData) => mData.entries()
*   .then((entries) => entries.mutate()
*     .then((m) => m.insert('key', value)
*       // this is where all mutations are recorded
*       .then(() => entries.apply(m)
*       ))))
**/
class EntryMutationTransaction extends h.NetworkObject {

  /**
  * @private
  * used by autoref to clean the reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.mdata_entry_actions_free(app.connection, ref);
  }


  /**
  * Store a new `Insert`-Action in the transaction.
  *
  * @param {(String|Buffer)} keyName
  * @param {(String|Buffer)} value
  * @returns {Promise} resolves once the storing is done
  **/
  insert(keyName, value) {
    return lib.mdata_entry_actions_insert(
      this.app.connection,
      this.ref,
      keyName,
      value
    );
  }

  /**
  * Store a new `Remove`-Action in the transaction
  *
  * @param {(String|Buffer)} keyName - the key you want to remove
  * @param {Number} version - the current version, to confirm you are
  *        actually asking for the right state
  * @returns {Promise} resolves once the storing is done
  **/
  remove(keyName, version) {
    return lib.mdata_entry_actions_delete(
      this.app.connection,
      this.ref,
      keyName,
      version
    );
  }

  /**
  * Store a `Update`-Action in the transaction
  *
  * @param {(String|Buffer)} keyName - the key you want to remove
  * @param {(String|Buffer)} value - the value to upate to
  * @param {Number} version - the current version, to confirm you are
  *        actually asking for the right state
  * @returns {Promise} resolves once the storing is done
  **/
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
* Represent the Entries of an MData network object
**/
class Entries extends h.NetworkObject {

  /**
  * Get the total number of entries in the Mdata
  * @returns {Promise<Number>}
  **/
  len() {
    return lib.mdata_entries_len(this.app.connection, this.ref);
  }

  /**
  * @private
  * used by autoref to clean the mdata keys reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.mdata_entries_free(app.connection, ref);
  }

  /**
  * Look up the value of a specific key
  *
  * @returns {Promise<ValueVersion>} - the value at the current version
  **/
  get(keyName) {
    return lib.mdata_entries_get(this.app.connection, this.ref, keyName);
  }

  /**
  * Iterate over the entries, execute the function every time
  * @param {function(Buffer, ValueVersion)} fn - the function to call
  * @returns {Promise<()>} - resolves once the iteration is done
  **/
  forEach(fn) {
    return lib.mdata_entries_for_each(this.app.connection, this.ref, fn);
  }

  /**
  * Insert a new entry. Will directly commit that transaction to the network.
  * Will fail if the entry already exists or the current app doesn't have the
  * permissions to edit that mdata.
  *
  *
  * @param {(String|Buffer)} keyName - the key you want store the data under
  * @param {(String|Buffer)} value - the data you want to store
  * @returns {Promise<>}
  **/
  insert(keyName, value) {
    return lib.mdata_entries_insert(this.app.connection, this.ref, keyName, value);
  }

  /**
  * Start a new transaction of mutation of the entries
  * @return {Promise<EntryMutationTransaction>}
  **/
  mutate() {
    // -> EntryMutationTransaction
    return lib.mdata_entry_actions_new(this.app.connection)
            .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

}

/**
* Represent the keys of an MData network object
**/
class Keys extends h.NetworkObject {

  /**
  * Get the total number of keys in the Mdata
  * @returns {Promise<Number>}
  **/
  len() {
    return lib.mdata_keys_len(this.app.connection, this.ref);
  }

  /**
  * Iterate over the value, execute the function every time
  * @param {function(Buffer)} fn - the function to call with the key in the buffer
  * @returns {Promise<()>} - resolves once the iteration is done
  **/
  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_keys_for_each(this.app.connection, this.ref, fn);
  }

  /**
  * @private
  * used by autoref to clean the mdata keys reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.mdata_keys_free(app.connection, ref);
  }
}

/**
* Represent the values of an MData network object
**/
class Values extends h.NetworkObject {

  /**
  * Get the total number of values in the Mdata
  * @returns {Promise<Number>}
  **/
  len() {
    return lib.mdata_values_len(this.app.connection, this.ref);
  }

  /**
  * Iterate over the value, execute the function every time
  * @param {function(Buffer, ValueVersion)} fn - the function to call
  * @returns {Promise<()>} - resolves once the iteration is done
  **/
  forEach(fn) {
    return lib.mdata_values_for_each(this.app.connection, this.ref, fn);
  }

  /**
  * @private
  * used by autoref to clean the mdata values reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.mdata_values_free(app.connection, ref);
  }
}


/**
* @typedef {Object} ValueVersion
* @param {Buffer} buf - the buffer with the value
* @param {Number} version - the version
* Holds the informatation of a value of a MutableData
*/


/**
* @typedef {Object} NameAndTag
* @param {Buffer} name - the name/address on the network
* @param {Number} tag - the type tag
**/

/**
* Holds the reference to a MutableData
**/
class MutableData extends h.NetworkObject {

  /**
  * @private
  * used by autoref to clean the mutable data reference
  * @param {SAFEApp} app
  * @param {handle} ref
  **/
  static free(app, ref) {
    return lib.free_mdata_info(app.connection, ref);
  }

  /**
  * Quickly set up a newly (not yet created) MutableData with
  * the app having full-access permissions (and no other).
  *
  * @param {Object=} data - a key-value payload it should
  *        create the data with
  * @returns {Promise<MutableData>} - self
  **/
  quickSetup(data) {
    let entriesSetup = this.app.mutableData.newEntries();
    if (data) {
      entriesSetup = entriesSetup.then((entries) =>
        Promise.all(Object.getOwnPropertyNames(data).map((key) =>
          entries.insert(key, data[key]))).then(() => entries));
    }

    return this.app.crypto.getAppPubSignKey()
      .then((key) => this.app.mutableData.newPermissionSet()
        .then((pmSet) =>
          pmSet.setAllow('Insert')
            .then(() => pmSet.setAllow('Update'))
            .then(() => pmSet.setAllow('Delete'))
            .then(() => pmSet.setAllow('ManagePermissions'))
            .then(() => this.app.mutableData.newPermissions()
              .then((pm) => pm.insertPermissionSet(key, pmSet)
                .then(() => entriesSetup
                  .then((entries) => this.put(pm, entries))
          )))))
      .then(() => this);
  }

  /**
  * Encrypt the entry key provided as parameter with the encryption key
  * contained in a Private MutableData. If the MutableData is Public, the same
  * (and unencrypted) value is returned.
  *
  * @param {(String|Buffer)} key - the key you want to encrypt
  * @returns {Promise<Key>} - the encrypted entry key
  **/
  encryptKey(key) {
    return lib.mdata_info_encrypt_entry_key(this.app.connection, this.ref, key);
  }

  /**
  * Encrypt the entry value provided as parameter with the encryption key
  * contained in a Private MutableData. If the MutableData is Public, the same
  * (and unencrypted) value is returned.
  *
  * @param {(String|Buffer)} value - the data you want to encrypt
  * @returns {Promise<Value>} - the encrypted entry value
  **/
  encryptValue(value) {
    return lib.mdata_info_encrypt_entry_value(this.app.connection, this.ref, value);
  }

  /**
  * Look up the name and tag of the MutableData as required to look it
  * up on the network.
  *
  * @returns {Promise<NameAndTag>}
  **/
  getNameAndTag() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
  }

  /**
  * Look up the mutable data object version on the network
  *
  * @returns {Promise<Number>} the version
  **/
  getVersion() {
    return lib.mdata_get_version(this.app.connection, this.ref);
  }

  /**
  * Look up the value of a specific key
  *
  * @returns {Promise<ValueVersion>} - the value at the current version
  **/
  get(key) {
    return lib.mdata_get_value(this.app.connection, this.ref, key);
  }

  /**
  * Create this MutableData on the network.
  * @param {Permission} permissions - the permissions to create the mdata with
  * @param {Entries} entries - data payload to create the mdata with
  * @returns {Promise<()>}
  **/
  put(permissions, entries) {
    return lib.mdata_put(this.app.connection, this.ref, permissions.ref, entries.ref);
  }


  /**
  * Get a Handle to the entries associated with this mdata
  * @returns {Promise<(Entries)>}
  **/
  getEntries() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_entries(this.app.connection, this.ref)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }


  /**
  * Get a Handle to the keys associated with this mdata
  * @returns {Promise<(Keys)>}
  **/
  getKeys() {
    return lib.mdata_list_keys(this.app.connection, this.ref)
        .then((r) => h.autoref(new Keys(this.app, r)));
  }

  /**
  * Get a Handle to the values associated with this mdata
  * @returns {Promise<(Values)>}
  **/
  getValues() {
    return lib.mdata_list_values(this.app.connection, this.ref)
        .then((r) => h.autoref(new Values(this.app, r)));
  }

  /**
  * Get a Handle to the permissions associated with this mdata
  * @returns {Promise<(Permissions)>}
  **/
  getPermissions() {
    return lib.mdata_list_permissions(this.app.connection, this.ref)
      .then((r) => h.autoref(new Permissions(this.app, r, this)));
  }

  /**
  * Get a Handle to the permissions associated with this mdata for
  * a specifc key
  * @param {SignKey} signKey - the key to look up
  * @returns {Promise<(Permissions)>}
  **/
  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app.connection, this.ref,
                                                      signKey ? signKey.ref : 0)
      .then((r) => h.autoref(new PermissionsSet(this.app, r, this)));
  }

  /**
  * Delete the permissions of a specifc key. Directly commits to the network.
  * Requires 'ManagePermissions'-Permission for the app.
  * @param {SignKey} signKey - the key to lookup for
  * @param {Number} version - the current version, to confirm you are
  *        actually asking for the right state
  * @returns {Promise} - once finished
  **/
  delUserPermissions(signKey, version) {
    return lib.mdata_del_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey ? signKey.ref : 0,
                                          version);
  }

  /**
  * Set the permissions of a specifc key. Directly commits to the network.
  * Requires 'ManagePermissions'-Permission for the app.
  * @param {SignKey} signKey - the key to lookup for
  * @param {PermissionSet} pmset - the permissionset to set to
  * @param {Number} version - the current version, to confirm you are
  *        actually asking for the right state
  * @returns {Promise} - once finished
  **/
  setUserPermissions(signKey, pmset, version) {
    return lib.mdata_set_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey ? signKey.ref : 0,
                                          pmset.ref,
                                          version);
  }

  /**
  * Commit the transaction to the network
  * @param {EntryMutationTransaction} mutations - the Mutations you want to apply
  * @return {Promise}
  **/
  applyEntriesMutation(mutations) {
    return lib.mdata_mutate_entries(this.app.connection, this.ref, mutations.ref);
  }

  /**
  * Serialise the current mdata
  * @returns {Promise<(String)>}
  **/
  serialise() {
    return lib.mdata_info_serialise(this.app.connection, this.ref);
  }

  /**
  * Wrap this MData into a known abstraction. Currently known: `NFS`
  * @param {String} eml - name of the emulation
  * @returns {Emulation} the Emulation you are asking for
  **/
  emulateAs(eml) {
    return new emulations[eml](this);
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
*   .then((mdata) => mdata.quickSetup({'keyA': 'input value'})
*    .then(() => mdata.getNameAndTag())) // return name and tag
*
* // now read using name and tag
* .then((ref) => app.mutableData.newPublic(ref.name, ref.tag)
*   .then((mdata) => mdata.get('keyA').then((val) => {
*     should(val.toString()).equal('input value');
*   })))
**/
class MutableDataInterface {
  /**
  * @private
  * Create a new MutableData
  * @param {SAFEApp} app - instance this is bound to
  */
  constructor(app) {
    this.app = app;
  }

  /**
  * Create a new mutuable data at a random address with private
  * access.
  * @param {Number} typeTag - the typeTag to use
  * @returns {Promise<MutableData>}
  **/
  newRandomPrivate(typeTag) {
    return lib.mdata_info_random_private(this.app.connection, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }


  /**
  * Create a new mutuable data at a random address with public
  * access.
  * @param {Number} typeTag - the typeTag to use
  * @returns {Promise<MutableData>}
  **/
  newRandomPublic(typeTag) {
    return lib.mdata_info_random_public(this.app.connection, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  /**
  * Initiate a mutuable data at the given address with private
  * access.
  * @param {Buffer|String}
  * @param {Number} typeTag - the typeTag to use
  * @returns {Promise<MutableData>}
  **/
  newPrivate(name, typeTag) {
    return lib.mdata_info_new_private(this.app.connection, name, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  /**
  * Initiate a mutuable data at the given address with public
  * access.
  * @param {Buffer|String}
  * @param {Number} typeTag - the typeTag to use
  * @returns {Promise<MutableData>}
  **/
  newPublic(name, typeTag) {
    return lib.mdata_info_new_public(this.app.connection, name, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  /**
  * Create a new Permissions object.
  * @returns {Promise<Permissions>}
  **/
  newPermissions() {
    return lib.mdata_permissions_new(this.app.connection)
        .then((r) => h.autoref(new Permissions(this.app, r)));
  }

  /**
  * Create a new PermissionsSet object.
  * @returns {Promise<PermissionsSet>}
  **/
  newPermissionSet() {
    return lib.mdata_permission_set_new(this.app.connection)
        .then((c) => h.autoref(new PermissionsSet(this.app, c)));
  }

  /**
  * Create a new EntryMutationTransaction object.
  * @returns {Promise<EntryMutationTransaction>}
  **/
  newMutation() {
    return lib.mdata_entry_actions_new(this.app.connection)
        .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

  /**
  * Create a new Entries object.
  * @returns {Promise<Entries>}
  **/
  newEntries() {
    return lib.mdata_entries_new(this.app.connection)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }


  /**
  * Create a new Mutuable Data object from its serial
  * @returns {Promise<MutableData>}
  **/
  fromSerial(serial) {
    return lib.mdata_info_deserialise(this.app.connection, serial)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  /**
  * @private
  * Helper to create a new autorefence MutableData for a given
  * mdata reference from the native layer
  *
  * @param {handle} mdata - the native handle
  * @returns {MutableData} - wrapped
  */
  wrapMdata(mdata) {
    return h.autoref(new MutableData(this.app, mdata));
  }

}

module.exports = MutableDataInterface;
