const h = require('../helpers');
const lib = require('../native/lib');

class PermissionsSet extends h.NetworkObject {

  setAllow(action) {
    return lib.mdata_permissions_set_allow(this.app, this.ref, action);
  }
  setDeny(action) {
    return lib.mdata_permissions_set_deny(this.app, this.ref, action);
  }

  clear(action) {
    return lib.mdata_permissions_set_clear(this.app, this.ref, action);
  }

  free() {
    return lib.mdata_permissions_set_free(this.app, this.ref)
  }
}

class Permissions {
  constructor(app, ref, mdata) {
    this.app = app;
    this.mdata = mdata;
    this.ref = ref;
  }

  len() {
    return lib.mdata_permissions_len(this.app, this.mdata);
  }

  free() {
    return lib.mdata_permissions_free(this.app, this.mdata);
  }

  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app, this.mdata, signKey).then(c => new PermissionsSet(this.app, c));
  }

  delPermissionsSet(signKey, version) {
    return lib.mdata_del_user_permissions(this.app, this.mdata, signKey, version);
  }

  newPermissionSet() {
    return lib.mdata_permission_set_new(this.app).then(c => new PermissionsSet(this.app, c));
  }

  insertPermissionSet(signKey, PermissionSet) {
    return lib.mdata_permissions_insert(this.app, this.mdata, signKey, PermissionSet);
  }

  setPermissionSet(signKey, PermissionSet, version) {
    return lib.mdata_set_user_permissions(this.app, this.mdata, signKey, PermissionSet, version);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_permissions_for_each(this.app, this.mdata, fn);
  }

}

class EntryMutationTransaction extends h.NetworkObject {

  free() {
    return lib.mdata_entry_actions_free(this.app, this.ref);
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

  free() {
    return lib.mdata_entries_free(this.app, this.ref);
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
    return Promise.reject(new Error('Not Implemented'));
  }

  apply(mutations) {
    return Promise.reject(new Error('Not Implemented'));
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

  free() {
    return lib.mdata_keys_free(this.app, this.ref);
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

  free() {
    return lib.mdata_values_free(this.app, this.ref);
  }
}

class MutableData extends h.NetworkObject {
  constructor(app, mdataRef) {
    super(app, mdataRef);
    this.entriesRef = null;
    this.permissionsRef = null;
  }

  encryptKey(key) {
    return Promise.reject(new Error('Not Implemented'));
  }

  encryptValue(value) {
    return Promise.reject(new Error('Not Implemented'));
  }

  getNameAndTag() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
  }

  getVersion() {
    return lib.mdata_get_version(this.app, this.mdataRef);
  }

  get(key) {
    return lib.mdata_get_value(this.app, this.mdataRef, key.ptr, key.len);
  }

  put() {
    return lib.mdata_put(this.app, this.mdataRef, this.permissionsRef, this.entriesRef);
  }

  getEntries() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_entries(this.app, this.mdataRef).then(h => new Entries(this.app, h));
  }

  getKeys() {
    return lib.mdata_list_keys(this.app, this.mdataRef).then(h => new Keys(this.app, h));
  }

  getValues() {
    return lib.mdata_list_values(this.app, this.mdataRef).then(h => new Values(this.app, h));
  }

  getPermissions() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_permissions(this.app, this.mdataRef);
  }

  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app, this.mdataRef, signKey)
      .then(h => new PermissionsSet(this.app, h));
  }

  changeOwner(otherSignKey, version) {
    return lib.mdata_change_owner(this.app, this.mdataRef, otherSignKey, version);
  }

  serialise() {
    return lib.mdata_info_deserialise(this.app.connection, this.ref);
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
    return lib.mdata_permissions_new(this.app).then(h => new Permissions(this.app, null, h));
  }

  newMutation() {
    return lib.mdata_entry_actions_new(this.app).then(h => new EntryMutationTransaction(this.app, h));
  }

  newEntries() {
    return lib.mdata_entries_new(this.app).then(h => new Entries(this.app, h));
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
