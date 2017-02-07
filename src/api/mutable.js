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

class Permissions extends h.NetworkObject {

  len() {
    return lib.mdata_permissions_len(this.app.connection, this.ref);
  }

  free() {
    return lib.mdata_permissions_free(this.app.connection, this.ref);
  }

  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app.connection, this.ref, signKey)
        .then((c) => h.autoref(new PermissionsSet(this.app.connection, c)));
  }

  delPermissionsSet(signKey, version) {
    return lib.mdata_del_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey,
                                          version);
  }

  insertPermissionSet(signKey, PermissionSet) {
    return lib.mdata_permissions_insert(this.app.connection,
                                        this.ref,
                                        signKey,
                                        PermissionSet);
  }

  setPermissionSet(signKey, PermissionSet, version) {
    return lib.mdata_set_user_permissions(this.app.connection,
                                          this.ref,
                                          signKey,
                                          PermissionSet,
                                          version);
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
      keyName.ptr,
      keyName.len,
      value.ptr,
      value.len
    );
  }

  remove(keyName, version) {
    return lib.mdata_entry_actions_delete(
      this.app.connection,
      this.ref,
      keyName.ptr,
      keyName.len,
      version
    );
  }

  update(keyName, value, version) {
    return lib.mdata_entry_actions_update(
      this.app.connection,
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
    return lib.mdata_entries_get(this.app.connection, this.ref, keyName);
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return lib.mdata_entries_for_each(this.app, this.ref, fn);
  }

  insert(keyName, value) {
    return lib.mdata_entries_insert(this.app.connection, this.ref, keyName, value);
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

  static free(app, ref) {
    return lib.free_mdata_info(app.connection, ref);
  }

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
              .then((pm) => pm.insertPermissionSet(key.ref, pmSet.ref)
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

  getNameAndTag() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
  }

  getVersion() {
    return lib.mdata_get_version(this.app, this.ref);
  }

  get(key) {
    return lib.mdata_get_value(this.app.connection, this.ref, key);
  }

  put(pm, entries) {
    return lib.mdata_put(this.app.connection, this.ref, pm.ref, entries.ref);
  }

  getEntries() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_entries(this.app, this.ref)
        .then((r) => h.autoref(new Entries(this.app, r)));
  }

  getKeys() {
    return lib.mdata_list_keys(this.app, this.ref)
        .then((r) => h.autoref(new Keys(this.app, r)));
  }

  getValues() {
    return lib.mdata_list_values(this.app, this.ref)
        .then((r) => h.autoref(new Values(this.app, r)));
  }

  getPermissions() {
    // Get or Creates a new set
    // storing local reference
    return lib.mdata_list_permissions(this.app, this.ref);
  }

  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app,
                                           this.ref,
                                           signKey)
      .then((r) => h.autoref(new PermissionsSet(this.app, r)));
  }

  changeOwner(otherSignKey, version) {
    return lib.mdata_change_owner(this.app,
                                  this.ref,
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
    return lib.mdata_permissions_new(this.app.connection)
        .then((r) => h.autoref(new Permissions(this.app, r)));
  }

  newPermissionSet() {
    return lib.mdata_permission_set_new(this.app.connection)
        .then((c) => h.autoref(new PermissionsSet(this.app, c)));
  }

  newMutation() {
    return lib.mdata_entry_actions_new(this.app.connection)
        .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

  newEntries() {
    return lib.mdata_entries_new(this.app.connection)
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
