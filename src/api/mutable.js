const h = require('../helpers');
const lib = require('../native/lib');

class PermissionsSet extends h.NetworkObject {

  setAllow(action) {
    return Promise.reject(new Error("Not Implemented"))
  }
  setDeny(action){
    return Promise.reject(new Error("Not Implemented"))
  }

  clear() {
    return Promise.reject(new Error("Not Implemented"))
  }
}

class Permissions {
  constructor(app, ref, mdata) {
    this.app = app;
    this.mdata = mdata
    this.ref = ref;
  }

  getPermissionSet(signKey) {
    // -> PermissionsSet
    return Promise.reject(new Error("Not Implemented"))
  }

  delPermissionsSet(signKey) {
    // -> Bool
    return Promise.reject(new Error("Not Implemented"))
  }

  newPermissionSet() {
    // -> PermissionsSet
    return Promise.reject(new Error("Not Implemented"))
  }

  insertPermissionSet(signKey, PermissionSet) {
    return Promise.reject(new Error("Not Implemented"))
  }

  setPermissionSet(signKey, PermissionSet) {
    return Promise.reject(new Error("Not Implemented"))
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return Promise.reject(new Error("Not Implemented"))
  }

}

class EntryMutationTransaction extends h.NetworkObject {

  insert(keyName, value) {
    return Promise.reject(new Error("Not Implemented"))
  }

  delete(keyName) {
    return Promise.reject(new Error("Not Implemented"))
  }

  update(keyName) {
    return Promise.reject(new Error("Not Implemented"))
  }
}

class Entries extends h.NetworkObject {

  len() {
    return Promise.reject(new Error("Not Implemented"))
  }

  get(keyName) {
    return Promise.reject(new Error("Not Implemented")) 
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return Promise.reject(new Error("Not Implemented"))
  }

  insert(keyName, value) {
    return Promise.reject(new Error("Not Implemented"))
  }

  mutate() {
    // -> EntryMutationTransaction
    return Promise.reject(new Error("Not Implemented"))
  }

  apply(mutations) {
    return Promise.reject(new Error("Not Implemented"))
  }
}


class Keys extends h.NetworkObject {

  len() {
    return Promise.reject(new Error("Not Implemented"))
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return Promise.reject(new Error("Not Implemented"))
  }

}

class Values extends h.NetworkObject {

  len() {
    return Promise.reject(new Error("Not Implemented"))
  }

  forEach(fn) {
    // iterate through all key-value-pairs
    // returns promise that resolves once done
    return Promise.reject(new Error("Not Implemented"))
  }
}

class MutableData extends h.NetworkObject {
  constructor(app, mdataRef) {
    super(app, mdataRef)
    this.entriesRef = null;
    this.permissionsRef = null;
  }


  encryptKey(key) {
    return Promise.reject(new Error("Not Implemented"))
  }

  encryptValue(value) {
    return Promise.reject(new Error("Not Implemented"))
  }

  getNameAndTag() {
    return lib.mdata_info_extract_name_and_type_tag(this.app.connection, this.ref);
  }

  getVersion() {
    return Promise.reject(new Error("Not Implemented"))
  }

  get(key) {
    return Promise.reject(new Error("Not Implemented"))
  }

  put() {
    return Promise.reject(new Error("Not Implemented"))
  }

  getEntries() {
    // Get or Creates a new set
    // storing local reference

    // -> Entries
    return Promise.reject(new Error("Not Implemented"))
  }

  getKeys() {
    // -> Keys
    return Promise.reject(new Error("Not Implemented"))
  }

  getValues() {
    // -> Values
    return Promise.reject(new Error("Not Implemented"))
  }

  getPermissions() {
    // Get or Creates a new set
    // storing local reference
    // -> Permissions
    return Promise.reject(new Error("Not Implemented"))
  }

  getUserPermissions() {
    // -> PermissionSet
    return Promise.reject(new Error("Not Implemented"))
  }

  changeOwner(otherSignKey) {
    return Promise.reject(new Error("Not Implemented"))
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
    // -> Permissions
    return Promise.reject(new Error("Not Implemented"))
  }

  newMutation() {
    // -> EntryMutationTransaction
    return Promise.reject(new Error("Not Implemented"))
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
