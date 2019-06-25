// Copyright 2018 MaidSafe.net limited.
//
// This SAFE Network Software is licensed to you under
// the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT> or
// the Modified BSD license <LICENSE-BSD or https://opensource.org/licenses/BSD-3-Clause>,
// at your option.
//
// This file may not be copied, modified, or distributed except according to those terms.
//
// Please review the Licences for the specific language governing permissions and limitations
// relating to use of the SAFE Network Software.


const h = require('../helpers');
const lib = require('../native/lib');
const t = require('../native/types');
const emulations = require('./emulations');
const { PubSignKey } = require('./crypto');
const consts = require('../consts');
const errConst = require('../error_const');
const makeError = require('../native/_error.js');
const { ONLY_IF_EXPERIMENTAL_API_ENABLED } = require('../helpers');
const multihash = require('multihashes');
const CID = require('cids');

const CONSTANTS = consts.pubConsts;

/**
 * Holds the permissions of a {@link MutableData} object
 * @hideconstructor
 */
class Permissions extends h.NetworkObject {
  /**
   * Total number of permission entries
   * @returns {Promise<Number>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *       const mData = await app.mutableData.newRandomPublic(15001);
   *       await mData.quickSetup({});
   *       const perms = await mData.getPermissions();
   *       const length = await perms.len();
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
   * Lookup the permissions of a specifc signing key
   * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] The key to lookup
   * @returns {Promise<Object>} The permission set for that key
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *        const pubSignKey = await app.crypto.getAppPubSignKey();
   *        const perms = await mData.getPermissions();
   *        const permSet = await perms.getPermissionsSet(pubSignKey)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  getPermissionSet(signKey) {
    return lib.mdata_permissions_get(this.app.connection,
      this.ref,
      signKey ? signKey.ref : CONSTANTS.USER_ANYONE);
  }

  /**
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * Insert a new permission set mapped to a specifc key. Directly commits
   * to the network.
   * Requires the 'ManagePermissions' permission for the app.
   * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to map to
   * @param {Object} permissionSet The permission set to insert
   * @returns {Promise} Resolves when finished
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *        const pubSignKey = await app.crypto.getAppPubSignKey();
   *        const perms = await mData.getPermissions();
   *        const pmSet = ['Insert', 'ManagePermissions'];
   *        await perms.insertPermissionSet(pubSignKey, pmSet)
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *        const mData = await app.mutableData.newRandomPublic(15001);
   *        await mData.quickSetup({});
   *        const perms = await mData.getPermissions();
   *        const permSetsArray = await perms.listPermissionSets();
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
 * Creates mutation actions to be applied to {@link MutableData}
 * @hideconstructor
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
   * Creates an action to store a new key/value entry. Does not commit to network.
   *
   * @param {(String|Buffer)} keyName
   * @param {(String|Buffer)} value
   * @returns {Promise} Resolves when complete
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *        const mData = await app.mutableData.newRandomPublic(15001);
   *        await mData.quickSetup({});
   *        const entries = await mData.getEntries();
   *        const keyName = 'surname';
   *        const value = 'Turing';
   *        await entries.insert(keyName, value);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
   * Creates an action to delete an existing entry. Does not commit to network.
   *
   * @param {(String|Buffer)} keyName the key you want to delete
   * @param {Number} version The version successor, to confirm you are
   *        actually asking for the correct {@link MutableData} version.
   * @returns {Promise} Resolves when complete
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *        const mData = await app.mutableData.newRandomPublic(15001);
   *        await mData.quickSetup({ surname: 'Turing' });
   *        const version = await mData.getVersion();
   *        const entries = await mData.getEntries();
   *        const keyName = 'dnaChecksum';
   *        await entries.delete(keyName, version + 1);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  delete(keyName, version) {
    return lib.mdata_entry_actions_delete(
      this.app.connection,
      this.ref,
      keyName,
      version
    );
  }

  /**
   * Creates an action to update an existing entry. Does not commit to network.
   *
   * @param {(String|Buffer)} keyName
   * @param {(String|Buffer)} value
   * @param {Number} version The version successor, to confirm you are
   *        actually asking for the correct {@link MutableData} version.
   * @returns {Promise} Resolves when complete
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *        const mData = await app.mutableData.newRandomPublic(15001);
   *        await mData.quickSetup({ surname: 'Turing' });
   *        const version = await mData.getVersion();
   *        const entries = await mData.getEntries();
   *        const keyName = 'street_address';
   *        const value = '7297 Highfield Road';
   *        await entries.update(keyName, value, version + 1);
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
 * {@link MutableData} {@link Entries} operations
 * @hideconstructor
 */
class Entries extends h.NetworkObject {
  /**
   * Get the total number of entries in the {@link MutableData}
   * @returns {Promise<Number>} number of entries
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *       const mData = await app.mutableData.newRandomPublic(15001);
   *       await mData.quickSetup({ surname: 'Turing' });
   *       const perms = await mData.getPermissions();
   *       const length = await perms.len();
   *     } catch(err) {
   *       throw err;
   *     }
   * };
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
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         await mData.quickSetup({ surname: 'Turing' });
   *         const entries = await mData.getEntries();
   *         const value = await entries.get('surname')
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  get(keyName) {
    return lib.mdata_entries_get(this.app.connection, this.ref, keyName);
  }

  /**
   * Get a list with the entries contained in this {@link MutableData}
   * @returns {Promise<Array>} the entries list
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const entries = await mData.getEntries();
   *         const  entriesArray = await entries.listEntries();
   *         entriesArray.forEach((entry) => {
   *           const key = entry.key.toString();
   *           const value = entry.value.buf.toString();
   *           console.log('Key: ', key);
   *           console.log('Value: ', value);
   *         });
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  listEntries() {
    return lib.mdata_list_entries(this.app.connection, this.ref);
  }

  /**
   * Insert a new entry. Once you call `MutableData.put` with this entry,
   * it will fail if the entry already exists or the current app doesn't have the
   * permissions to edit that {@link MutableData}.
   *
   * @param {(String|Buffer)} keyName
   * @param {(String|Buffer)} value
   * @returns {Promise} Resolves when complete
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         await mData.quickSetup({});
   *         const entries = await mData.getEntries();
   *         const  entriesArray = await entries.insert('given_name', 'Alan');
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  insert(keyName, value) {
    return lib.mdata_entries_insert(this.app.connection, this.ref, keyName, value);
  }

  /**
   * Create a new mutation transaction for the entries
   * @return {Promise<EntryMutationTransaction>} Mutation transaction interface
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         await mData.quickSetup({});
   *         const entries = await mData.getEntries();
   *         const  mutationIntertace = await entries.mutate();
   *     } catch(err) {
   *       throw err;
   *     }
   * };
   */
  mutate() {
    return lib.mdata_entry_actions_new(this.app.connection)
      .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }
}

/**
* @typedef {Object} ValueVersion
* @property {Buffer} buf the buffer with the value
* @property {Number} version the version
* Holds the informatation of a value of a {@link MutableData}
*/

/**
* @typedef {Object} NameAndTag
* @property {Buffer} name - the XoR-name/address on the network
* @property {Number} typeTag - the type tag
* @property {String} xorUrl - `safe://` URL representing XOR address of {@link MutableData}, hashed with SHA3-256, and encoded as base32
*/

/**
 * @hideconstructor
 */
class MutableData extends h.NetworkObject {
  /**
   * Easily set up and commit a new {@link MutableData} with
   * the app having full-access permissions (and no other).
   * The name and description parameters are metadata for the {@link MutableData} which
   * can be used to identify what this {@link MutableData} contains.
   * The metadata is particularly used by the Authenticator when another
   * application has requested mutation permissions on this {@link MutableData},
   * so the user can make a better decision to either allow or deny such a
   * request based on this information.
   *
   * @param {Object} data a key-value payload it should
   *        create the data with
   * @param {(String|Buffer)} name A descriptive metadata name for the {@link MutableData}
   * @param {(String|Buffer)} description
   * A detailed metadata description for the {@link MutableData} content
   *
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     let mData = app.mutableData.newRandomPublic(tagtype);
   *     const entries = {
   *         key1: 'value1',
   *         key2: 'value2'
   *     };
   *     const name = 'My MutableData';
   *     const description = "To store my app\'s data";
   *     mData = await mData.quickSetup(entries, name, description);
   * };
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
   * Set the metadata information in the {@link MutableData}. Note this can be used
   * only if the {@link MutableData} was already committed to the network, .i.e either
   * with `put`, with `quickSetup`, or if it is an already existing {@link MutableData}
   * just fetched from the network.
   * The metadata is particularly used by the Authenticator when another
   * application has requested mutation permissions on this {@link MutableData},
   * displaying this information to the user, so the user can make a better
   * decision to either allow or deny such a request based on it.
   *
   * @param {(String|Buffer)} name A descriptive name for the {@link MutableData}
   * @param {(String|Buffer)} description A detailed description for the {@link MutableData} content
   *
   * @returns {Promise} Resolves once finished
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     const name = 'Mutable data name';
   *     const description = 'Mutable data description';
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({});
   *         await mData.setMetadata(name, description);
   *     } catch (err) {
   *         return err;
   *     }
   * };
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
   * Encrypt an entry key value for a private {@link MutableData}.
   * If the {@link MutableData} is public, the same, unencrypted, value is returned.
   *
   * @param {(String|Buffer)} key
   * @returns {Promise<Buffer>} The encrypted entry key
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
             const mData = await app.mutableData.newRandomPrivate(15001);
   *         const encryptedKey = await mData.encryptKey('key1')
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  encryptKey(key) {
    return lib.mdata_info_encrypt_entry_key(this.ref, key);
  }

  /**
   * Encrypt an entry value for a private {@link MutableData}.
   * If the {@link MutableData} is public, the same, unencrypted, value is returned.
   *
   * @param {(String|Buffer)} value
   * @returns {Promise<Buffer>} The encrypted entry value
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
             const mData = await app.mutableData.newRandomPrivate(15001);
   *         const encryptedValue = await mData.encryptValue('value1')
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  encryptValue(value) {
    return lib.mdata_info_encrypt_entry_value(this.ref, value);
  }

  /**
   * Decrypt the entry key/value provided as parameter with the encryption key
   * contained in a private {@link MutableData}.
   *
   * @param {(String|Buffer)} value
   * @returns {Promise<Buffer>} The decrypted value
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         const encryptedValue = await mData.encryptValue('value1')
   *         const decryptedValue = await mData.decrypt(encryptedKey)
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  decrypt(value) {
    return lib.mdata_info_decrypt(this.ref, value);
  }

  /**
   * Look up the name, tag, and XOR-URL of the {@link MutableData} as required to look it
   * up on the network.
   *
   * @returns {Promise<NameAndTag>} The XOR name and type tag. If the
   * experimental APIs are enabled the XOR-URL is also returned in the object.
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         const  nameAndTag = await mData.getNameAndTag();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getNameAndTag() {
    // If the experimental apis are enabled we also return the XOR-URL
    const xorUrl = ONLY_IF_EXPERIMENTAL_API_ENABLED.call(this.app, () => {
      const address = Buffer.from(this.ref.name);
      const encodedHash = multihash.encode(address, consts.CID_HASH_FN);
      const newCid = new CID(consts.CID_VERSION, consts.CID_DEFAULT_CODEC, encodedHash);
      const cidStr = newCid.toBaseEncodedString(consts.CID_BASE_ENCODING);
      return `safe://${cidStr}:${this.ref.typeTag}`;
    });

    return {
      name: this.ref.name,
      typeTag: this.ref.typeTag,
      xorUrl
    };
  }

  /**
   * Look up the mutable data object version on the network
   *
   * @returns {Promise<Number>} Current version
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         const version = await mData.getVersion();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getVersion() {
    return lib.mdata_get_version(this.app.connection, this.ref);
  }

  /**
   * Look up the value of a specific key
   *
   * @returns {Promise<ValueVersion>} the entry value and its current version
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         const entryValue = await mData.get('key1');
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  get(key) {
    return lib.mdata_get_value(this.app.connection, this.ref, key);
  }

  /**
   * Commit this {@link MutableData} to the network.
   * @param {Permission|CONSTANTS.MD_PERMISSION_EMPTY} permissions
   * the permissions to create the mutable data with
   * @param {Entries|CONSTANTS.MD_ENTRIES_EMPTY} entries
   * data entries to create the mutable data with
   * @returns {Promise}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         const perms = await mData.newPermissions();
   *         const pmSet = ['Insert', 'Update', 'Delete', 'ManagePermissions'];
   *         const pubSignKey = await app.crypto.getAppPubSignKey();
   *         await perms.insertPermissionsSet(pubSignKey, pmSet);
   *         const entries = await mData.newEntries();
   *         await entries.insert('key1', 'value1');
   *         await mData.put(perms, entries)
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  put(permissions, entries) {
    return lib.mdata_put(this.app.connection,
      this.ref,
      permissions ? permissions.ref : CONSTANTS.MD_PERMISSION_EMPTY,
      entries ? entries.ref : CONSTANTS.MD_ENTRIES_EMPTY);
  }

  /**
   * Get a Handle to the entries associated with this {@link MutableData}
   * @returns {Promise<Entries>} the entries representation object
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({});
   *         const entries = mData.getEntries();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getEntries() {
    return lib.mdata_entries(this.app.connection, this.ref)
      .then((r) => h.autoref(new Entries(this.app, r)));
  }

  /**
   * Get a list with the keys contained in this {@link MutableData}
   * @returns {Promise<Array>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const entryKeysArray = mData.getKeys();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getKeys() {
    return lib.mdata_list_keys(this.app.connection, this.ref);
  }

  /**
   * Get the list of values contained in this {@link MutableData}
   * @returns {Promise<Array>} the list of values
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const entryValuesArray = mData.getValues();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getValues() {
    return lib.mdata_list_values(this.app.connection, this.ref);
  }

  /**
   * Get an interface to the permissions associated with this {@link MutableData}
   * @returns {Permissions} The permissions interface object
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const permissionsInterface = mData.getPermissions();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getPermissions() {
    return lib.mdata_list_permissions(this.app.connection, this.ref)
      .then((r) => h.autoref(new Permissions(this.app, r, this)));
  }

  /**
   * Get an interface to the permissions associated with this {@link MutableData} for
   * a specific signing key
   * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE]
   * @returns {Promise<Object>} Permissions set associated to the signing key
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const signKey = await app.crypto.getAppPubSignKey();
   *         const permissionSet = await mData.getUserPermissions(signKey);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getUserPermissions(signKey) {
    return lib.mdata_list_user_permissions(this.app.connection, this.ref,
      signKey
        ? signKey.ref
        : CONSTANTS.USER_ANYONE);
  }

  /**
   * Delete the permissions of a specifc key. Directly commits to the network.
   * Requires 'ManagePermissions' permission for the app.
   * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to lookup for
   * @param {Number} version The version successor, to confirm you are
   *        actually asking for the right one
   * @returns {Promise} once finished
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const version = await mData.getVersion();
   *         const signKey = await app.crypto.getAppPubSignKey();
   *         const permissionSet = mData.delUserPermissions(signKey, version + 1);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
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
   * Requires 'ManagePermissions' permission for the app.
   * @param {PubSignKey|CONSTANTS.USER_ANYONE} [signKey=CONSTANTS.USER_ANYONE] the key to lookup for
   * @param {PermissionSet} permissionSet The permission set to set to
   * @param {Number} version the version successor, to confirm you are
   *        actually asking for the right one
   * @returns {Promise} resolves once finished
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const version = await mData.getVersion();
   *         const pmSet = ['Insert'];
   *         const permissionSet = await mData.setUserPermissions(
   *             safe.CONSTANTS.USER_ANYONE, pmSet, version + 1
   *         );
   *     } catch (err) {
   *         throw err;
   *     }
   * };
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
   * @return {Promise} Resolves once finished
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const mutation = await app.mutableData.newMutation();
   *         await mutation.insert('key2', 'value2')
   *         await mData.applyEntriesMutation(mutation);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  applyEntriesMutation(mutations) {
    return lib.mdata_mutate_entries(this.app.connection, this.ref, mutations.ref);
  }

  /**
   * Serialise the current {@link MutableData}
   * @returns {Promise<String>} The serialilsed version of the {@link MutableData}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const serialisedMD = await mData.serialise();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  serialise() {
    return lib.mdata_info_serialise(this.ref);
  }

  /**
   * Get serialised size of current {@link MutableData}
   * @returns {Promise<Number>} The serialilsed size of the {@link MutableData}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ key1: 'value1', key2: 'value2' });
   *         const serialisedSize = await mData.getSerialisedSize();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  getSerialisedSize() {
    return lib.mdata_serialised_size(this.app.connection, this.ref);
  }

  /**
   * Wrap this {@link MutableData} into a known abstraction. Currently only known: `NFS`
   * @param {String} eml - name of the emulation
   * @returns {Emulation} the Emulation you are asking for
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const emulationOptions = {
   *     nfs   : 'NFS',
   *     rdf   : 'RDF',
   *     webid : 'WebId'
   * };
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *         await mData.quickSetup({ });
   *         const nfs = await mData.emulateAs(emulationOptions.nfs)
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  emulateAs(eml) {
    return new emulations[eml.toUpperCase()](this);
  }
}

/**
 * API to initialise new {@link MutableData}, {@link Permissions},
 * {@link Entries}, or {@link EntryMutationTransaction} instances.
 */
class MutableDataInterface {
  /**
  * @hideconstructor
  * Create a new MutableDataInterface
  * @param {SAFEApp} app instance this is bound to
  */
  constructor(app) {
    this.app = app;
  }

  /**
   * Create a new private {@link MutableData} at a random address. Entrie can be encrypted.
   * @param {Number} typeTag
   * @throws {TYPE_TAG_NAN}
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPrivate(15001);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newRandomPrivate(typeTag) {
    if (!typeTag || !Number.isInteger(typeTag)) {
      throw makeError(errConst.TYPE_TAG_NAN.code, errConst.TYPE_TAG_NAN.msg);
    }
    return lib.mdata_info_random_private(typeTag)
      .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }


  /**
   * Create a new public {@link MutableData} at a random address
   * @param {Number} typeTag
   * @throws {TYPE_TAG_NAN}
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newRandomPublic(typeTag) {
    if (!typeTag || !Number.isInteger(typeTag)) {
      throw makeError(errConst.TYPE_TAG_NAN.code, errConst.TYPE_TAG_NAN.msg);
    }
    return lib.mdata_info_random_public(typeTag)
      .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }

  /**
   * Initiate a private{@link MutableData} at the given address. Entries can be encrypted.
   * @param {Buffer|String} name 32-byte name is the network address
   * @param {Number} typeTag
   * @param {Buffer|String} secKey
   * @param {Buffer|String} nonce
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const name = await app.crypto.sha3Hash('1010101010101');
   *         const encKeyPair = await app.crypto.generateEncKeyPair();
   *         const secKey = encKeyPair.secEncKey;
   *         const nonce = await app.crypto.generateNonce()
   *         const mData = await app.mutableData.newPrivate(name, 15002, secKey, nonce);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newPrivate(name, typeTag, secKey, nonce) {
    return lib.mdata_info_new_private(name, typeTag, secKey, nonce)
      .then((mDataInfo) => this.wrapMdata(mDataInfo));
  }

  /**
   * Initiate a public {@link MutableData} at the given address
   * @param {Buffer|String} 32-byte name is the network address
   * @param {Number} typeTag
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const name = await app.crypto.sha3Hash('1010101010101');
   *         const mData = await app.mutableData.newPublic(name, 15002);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newPublic(name, typeTag) {
    const mDataInfo = lib.makeMDataInfoObj({ name, type_tag: typeTag });
    return Promise.resolve(this.wrapMdata(mDataInfo));
  }

  /**
   * Create a new Permissions object.
   * @returns {Promise<Permissions>} Permissions interface
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         const permissions = await app.mutableData.newPermissions();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newPermissions() {
    return lib.mdata_permissions_new(this.app.connection)
      .then((r) => h.autoref(new Permissions(this.app, r)));
  }

  /**
   * Create a new {@link EntryMutationTransaction} object.
   * @returns {Promise<EntryMutationTransaction>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         const permissions = await app.mutableData.newMutation();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newMutation() {
    return lib.mdata_entry_actions_new(this.app.connection)
      .then((r) => h.autoref(new EntryMutationTransaction(this.app, r)));
  }

  /**
   * Create a new Entries object.
   * @returns {Promise<Entries>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         const mData = await app.mutableData.newRandomPublic(15001);
   *         const permissions = await app.mutableData.newEntries();
   *     } catch (err) {
   *         throw err;
   *     }
   * };
   */
  newEntries() {
    return lib.mdata_entries_new(this.app.connection)
      .then((r) => h.autoref(new Entries(this.app, r)));
  }

  /**
   * Create a new {@link MutuableData} object from serialised format
   * @returns {Promise<MutableData>}
   * @example
   * // Assumes {@link initialiseApp|SAFEApp} interface has been obtained
   * const asyncFn = async () => {
   *     try {
   *         let mData = await app.mutableData.newRandomPublic(15001);
   *         await mData.quickSetup({ });
   *         const serialisedMD = await mData.serialise();
   *         mData = await app.mutableData.fromSerial(serialisedMD);
   *     } catch (err) {
   *         throw err;
   *     }
   * };
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
