const h = require('../helpers');
const lib = require('../native/lib');
const t = require('../native/types');
const emulations = require('./emulations');


function toAction(action) {
  const a = t.MDataAction.get(action);
  if (!a) throw Error(`'${action}' is not a valid action!`);
  return a;
}

class PermissionsSet extends h.NetworkObject {

  setAllow(action) {
    return lib.mdata_permissions_set_allow(this.app.connection,
          this.ref, toAction(action));
  }
  setDeny(action) {
    return lib.mdata_permissions_set_deny(this.app.connection,
          this.ref, toAction(action));
  }

  clear(action) {
    return lib.mdata_permissions_set_clear(this.app.connection,
          this.ref, toAction(action));
  }

  static free(app, ref) {
    return lib.mdata_permissions_set_free(app.connection, ref);
  }
}

class Permissions extends h.NetworkObject {

  len() {
    return lib.mdata_permissions_len(this.app.connection, this.ref);
  }

  free() {
    return lib.mdata_permissions_free(this.app.connection, this.ref);
  }

  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app.connection, this.ref, signKey.ref)
        .then((c) => h.autoref(new PermissionsSet(this.app, c)));
  }

  insertPermissionSet(signKey, permissionSet) {
    return lib.mdata_permissions_insert(this.app.connection,
                                        this.ref,
                                        signKey.ref,
                                        permissionSet.ref);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_permissions_for_each(this.app.connection,
                                          this.ref,
                                          fn);
  }

  static free() {
    // we dont' actually do anything.
  }

}

class EntryMutationTransaction extends h.NetworkObject {

  static free(app, ref) {
    return lib.mdata_entry_actions_free(app.connection, ref);
  }

  insert(keyName, value) {
    return lib.mdata_entry_actions_insert(
      this.app.connection,
      this.ref,
      keyName,
      value
    );
  }

  remove(keyName, version) {
    return lib.mdata_entry_actions_delete(
      this.app.connection,
      this.ref,
      keyName,
      version
    );
  }

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

class Entries extends h.NetworkObject {

  len() {
    return lib.mdata_entries_len(this.app.connection, this.ref);
  }

  static free(app, ref) {
    return lib.mdata_entries_free(app.connection, ref);
  }

  get(keyName) {
    return lib.mdata_entries_get(this.app.connection, this.ref, keyName);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_entries_for_each(this.app.connection, this.ref, fn);
  }

  insert(keyName, value) {
    return lib.mdata_entries_insert(this.app.connection, this.ref, keyName, value);
  }

  mutate() {
    // -> EntryMutationTransaction
    return lib.mdata_entry_actions_new(this.app.connection)
            .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }
}

class Keys extends h.NetworkObject {

  len() {
    return lib.mdata_keys_len(this.app.connection, this.ref);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_keys_for_each(this.app.connection, this.ref, fn);
  }

  static free(app, ref) {
    return lib.mdata_keys_free(app.connection, ref);
  }
}

class Values extends h.NetworkObject {

  len() {
    return lib.mdata_values_len(this.app.connection, this.ref);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_values_for_each(this.app.connection, this.ref, fn);
  }

  static free(app, ref) {
    return lib.mdata_values_free(app.connection, ref);
  }
}


/**
* @typedef {Object} NameAndTag
* @param {Buffer} name - the name/address on the network
* @param {Number} tag - the type tag
**/

/**
* Holds the reference to a MutableData
**/
class MutableData extends h.NetworkObject {

  // internal use only
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

    return this.app.auth.getPubSignKey()
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

  encryptKey(key) {
    return Promise.reject(new Error('Not Implemented', this, key));
  }

  encryptValue(value) {
    return Promise.reject(new Error('Not Implemented', this, value));
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

  get(key) {
    return lib.mdata_get_value(this.app.connection, this.ref, key);
  }

  put(permissions, entries) {
    return lib.mdata_put(this.app.connection, this.ref, permissions.ref, entries.ref);
  }

  getEntries() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_entries(this.app.connection, this.ref)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }

  getKeys() {
    return lib.mdata_list_keys(this.app.connection, this.ref)
        .then((r) => h.autoref(new Keys(this.app, r)));
  }

  getValues() {
    return lib.mdata_list_values(this.app.connection, this.ref)
        .then((r) => h.autoref(new Values(this.app, r)));
  }

  getPermissions() {
    return lib.mdata_list_permissions(this.app.connection, this.ref)
      .then((r) => h.autoref(new Permissions(this.app, r, this)));
  }

  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app.connection, this.ref, signKey.ref)
      .then((r) => h.autoref(new PermissionsSet(this.app, r, this)));
  }

  delUserPermissions(signKey, version) {
    return lib.mdata_del_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey.ref,
                                          version);
  }

  setUserPermissions(signKey, permissionSet, version) {
    return lib.mdata_set_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey.ref,
                                          permissionSet.ref,
                                          version);
  }

  applyEntriesMutation(mutations) {
    return lib.mdata_mutate_entries(this.app.connection, this.ref, mutations.ref);
  }

  changeOwner(otherSignKey, version) {
    return lib.mdata_change_owner(this.app,
                                  this.ref,
                                  otherSignKey,
                                  version);
  }

  serialise() {
    return lib.mdata_info_serialise(this.app.connection, this.ref);
  }

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
*    .then(() => mdata.getNameAndTag())) // return name and tag
*
* // now read using name and tag
* .then((ref) => app.mutableData.newPublic(ref.name, ref.tag)
*   .then((mdata) => mdata.get('keyA').then((val) => {
*     should(val.toString()).equal('input value');
*   })))
**/
class MutableDataProvider {
  // internal
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

  // internal use only
  wrapMdata(mdata) {
    return h.autoref(new MutableData(this.app, mdata));
  }

}

module.exports = MutableDataProvider;
