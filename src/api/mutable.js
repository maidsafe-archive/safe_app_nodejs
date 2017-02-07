const h = require('../helpers');
const lib = require('../native/lib');
const emulations = require('./emulations');

class PermissionsSet extends h.NetworkObject {

  setAllow(action) {
    return lib.mdata_permissions_set_allow(this.app.connection, this.ref, action);
  }
  setDeny(action) {
    return lib.mdata_permissions_set_deny(this.app.connection, this.ref, action);
  }

  clear(action) {
    return lib.mdata_permissions_set_clear(this.app.connection, this.ref, action);
  }

  static free(app, ref) {
    return lib.mdata_permissions_set_free(app.connection, ref);
  }
}

class Permissions {
  constructor(app, ref, mdata) {
    this.app = app;
    this.mdata = mdata;
    this.ref = ref;
  }

  len() {
    return lib.mdata_permissions_len(this.app.connection, this.mdata);
  }

  free() {
    return lib.mdata_permissions_free(this.app.connection, this.mdata);
  }

  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app.connection, this.mdata, signKey)
        .then((c) => h.autoref(new PermissionsSet(this.app.connection, c)));
  }

  delPermissionsSet(signKey, version) {
    return lib.mdata_del_user_permissions(this.app.connection,
                                          this.mdata,
                                          signKey,
                                          version);
  }

  newPermissionSet() {
    return lib.mdata_permission_set_new(this.app.connection)
        .then((c) => h.autoref(new PermissionsSet(this.app.connection, c)));
  }

  insertPermissionSet(signKey, PermissionSet) {
    return lib.mdata_permissions_insert(this.app.connection,
                                        this.mdata,
                                        signKey,
                                        PermissionSet);
  }

  setPermissionSet(signKey, PermissionSet, version) {
    return lib.mdata_set_user_permissions(this.app.connection,
                                          this.mdata,
                                          signKey,
                                          PermissionSet,
                                          version);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_permissions_for_each(this.app.connection,
                                          this.mdata,
                                          fn);
  }

}

class EntryMutationTransaction extends h.NetworkObject {

  static free(app, ref) {
    return lib.mdata_entry_actions_free(app.connection, ref);
  }

  insert(keyName, value) {
    return lib.mdata_entry_actions_insert(
      this.app,
      this.ref,
      keyName.ptr,
      keyName.len,
      value.ptr,
      value.len
    );
  }

  remove(keyName, version) {
    return lib.mdata_entry_actions_delete(
      this.app,
      this.ref,
      keyName.ptr,
      keyName.len,
      version
    );
  }

  update(keyName, value, version) {
    return lib.mdata_entry_actions_update(
      this.app,
      this.ref,
      keyName.ptr,
      keyName.len,
      value.ptr,
      value.len,
      version
    );
  }
}

class Entries extends h.NetworkObject {

  len() {
    return lib.mdata_entries_len(this.app, this.ref);
  }

  static free(app, ref) {
    return lib.mdata_entries_free(app.connection, ref);
  }

  get(keyName) {
    return lib.mdata_entries_get(
      this.app,
      this.ref,
      keyName.ptr,
      keyName.len
    );
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_entries_for_each(this.app, this.ref, fn);
  }

  insert(keyName, value) {
    return lib.mdata_entries_insert(
      this.app,
      this.ref,
      keyName.ptr,
      keyName.len,
      value.ptr,
      value.len
    );
  }

  mutate() {
    // -> EntryMutationTransaction
    return lib.mdata_entry_actions_new(this.app.connection)
            .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

  apply(mutations) {
    return lib.mdata_mutate_entries(this.app.connection, this.ref, mutations);
  }
}

class Keys extends h.NetworkObject {

  len() {
    return lib.mdata_keys_len(this.app, this.ref);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_keys_for_each(this.app, this.ref, fn);
  }

  static free(app, ref) {
    return lib.mdata_keys_free(app.connection, ref);
  }
}

class Values extends h.NetworkObject {

  len() {
    return lib.mdata_values_len(this.app, this.ref);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_values_for_each(this.app, this.ref, fn);
  }

  static free(app, ref) {
    return lib.mdata_values_free(app.connection, ref);
  }
}

class MutableData extends h.NetworkObject {
  constructor(app, mdataRef) {
    super(app, mdataRef);
    this.entriesRef = 0;
    this.permissionsRef = 0;
  }

  static free(app, ref) {
    return lib.free_mdata_info(app.connection, ref);
  }

  encryptKey(key) {
    return Promise.reject(new Error('Not Implemented', this, key));
  }

  encryptValue(value) {
    return Promise.reject(new Error('Not Implemented', this, value));
  }

  getNameAndTag() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
  }

  getVersion() {
    return lib.mdata_get_version(this.app.connection, this.ref);
  }

  get(key) {
    return lib.mdata_get_value(this.app.connection, this.ref, key.ptr, key.len);
  }

  put() {
    return lib.mdata_put(this.app.connection, this.ref, this.permissionsRef, this.entriesRef);
  }

  getEntries() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_entries(this.app, this.mdataRef)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }

  getKeys() {
    return lib.mdata_list_keys(this.app, this.mdataRef)
        .then((r) => h.autoref(new Keys(this.app, r)));
  }

  getValues() {
    return lib.mdata_list_values(this.app, this.mdataRef)
        .then((r) => h.autoref(new Values(this.app, r)));
  }

  getPermissions() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_permissions(this.app, this.mdataRef);
  }

  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app,
                                           this.mdataRef,
                                           signKey)
      .then((r) => h.autoref(new PermissionsSet(this.app, r)));
  }

  changeOwner(otherSignKey, version) {
    return lib.mdata_change_owner(this.app,
                                  this.mdataRef,
                                  otherSignKey,
                                  version);
  }

  serialise() {
    return lib.mdata_info_deserialise(this.app.connection, this.ref);
  }

  emulateAs(eml) {
    return emulations[eml](this);
  }

}

class MutableDataProvider {
  constructor(app) {
    this.app = app;
  }

  newRandomPrivate(typeTag) {
    return lib.mdata_info_random_private(this.app.connection, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  newRandomPublic(typeTag) {
    return lib.mdata_info_random_public(this.app.connection, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  newPrivate(name, typeTag) {
    return lib.mdata_info_new_private(this.app.connection, name, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  newPublic(name, typeTag) {
    return lib.mdata_info_new_public(this.app.connection, name, typeTag)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  newPermissions() {
    return lib.mdata_permissions_new(this.app)
        .then((r) => h.autoref(new Permissions(this.app, null, r)));
  }

  newMutation() {
    return lib.mdata_entry_actions_new(this.app)
        .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

  newEntries() {
    return lib.mdata_entries_new(this.app)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }

  fromSerial(serial) {
    return lib.mdata_info_deserialise(this.app.connection, serial)
          .then((m) => h.autoref(new MutableData(this.app, m)));
  }

  wrapMdata(mdata) {
    return h.autoref(new MutableData(this.app, mdata));
  }

}

module.exports = MutableDataProvider;
