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

const nativeH = require('../../native/helpers');
const { pubConsts: CONSTANTS } = require('../../consts');
const errConst = require('../../error_const');
const makeError = require('../../native/_error.js');

/**
* WebID Emulation on top of a MutableData
*/
class WebID {
  /**
  * @private
  * Instantiate the WebID emulation layer wrapping a MutableData instance,
  * while making use of the RDF emulation to manipulate the MD entries
  *
  * @param {MutableData} mData - the MutableData to wrap around
  */
  constructor(mData) {
    this.mData = mData;
    this.rdf = this.mData.emulateAs('rdf');
    this.LDP = this.rdf.namespace('http://www.w3.org/ns/ldp#');
    this.RDF = this.rdf.namespace('http://www.w3.org/2000/01/rdf-schema#');
    this.RDFS = this.rdf.namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    this.FOAF = this.rdf.namespace('http://xmlns.com/foaf/0.1/');
    this.OWL = this.rdf.namespace("http://www.w3.org/2002/07/owl#");
    this.DCTERMS = this.rdf.namespace('http://purl.org/dc/terms/');
  }

  async createProfileDoc(profile) {
    const id = this.rdf.sym(profile.uri);
    this.rdf.setId(profile.uri);
    const webIdWithHashTag = this.rdf.sym(`${profile.uri}#me`);

    this.rdf.add(id, this.RDFS('type'), this.FOAF('PersonalProfileDocument'));
    this.rdf.add(id, this.DCTERMS('title'), this.rdf.literal(`${profile.name}'s profile document`));
    this.rdf.add(id, this.FOAF('maker'), webIdWithHashTag);
    this.rdf.add(id, this.FOAF('primaryTopic'), webIdWithHashTag);

    this.rdf.add(webIdWithHashTag, this.RDFS('type'), this.FOAF('Person'));
    this.rdf.add(webIdWithHashTag, this.FOAF('name'), this.rdf.literal(profile.name));
    this.rdf.add(webIdWithHashTag, this.FOAF('nick'), this.rdf.literal(profile.nickname));
    //this.rdf.add(this.rdf.literal('#me'), this.FOAF('image'), this.rdf.literal(profile.avatar));
    //this.rdf.add(this.rdf.literal('#me'), this.FOAF('website'), this.rdf.literal(profile.website));

    const serialised = await this.rdf.serialise('text/turtle');
    //const serialised = await this.rdf.serialise('application/ld+json');
    console.log("PROFILE:", serialised)
    //await this.rdf.commit();
  }

  async recordInPublicNames(uri) {
    const id = this.rdf.sym(uri);
    this.rdf.setId(uri);

    this.rdf.add(id, this.RDFS('type'), this.LDP('Container'));
    this.rdf.add(id, this.RDFS('type'), this.LDP('BasicContainer'));
    this.rdf.add(id, this.DCTERMS('title'), this.rdf.literal('_publicNames default container'));
    this.rdf.add(id, this.LDP('contains'), this.rdf.sym(uri)); // TODO: link to the WebID container

    const serialised = await this.rdf.serialise('text/turtle');
    //const serialised = await this.rdf.serialise('application/ld+json');
    console.log("PUBLIC NAMES:", serialised)
  }

  async createPublicId(uri) {
    const publicId = 'safe://manu'; // TODO: parse the uri to extract the public ID
    const serviceName = 'mywebid'; // TODO: parse the uri to extract the service name

    const id = this.rdf.sym(publicId);
    this.rdf.setId(publicId);

    this.rdf.add(id, this.RDFS('type'), this.LDP('Container'));
    this.rdf.add(id, this.RDFS('type'), this.LDP('BasicContainer'));
    this.rdf.add(id, this.DCTERMS('title'), this.rdf.literal(`Services Container for public ID ${serviceName}`));
    this.rdf.add(id, this.LDP('contains'), this.rdf.sym(uri)); // TODO: link to the services container

    const serialised = await this.rdf.serialise('text/turtle');
    //const serialised = await this.rdf.serialise('application/ld+json');
    console.log("PUBLIC ID:", serialised)
  }

  async commit() {

  }
}

module.exports = WebID;
