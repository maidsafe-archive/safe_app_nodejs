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

const should = require('should');
const h = require('../helpers');
const errConst = require('../../src/error_const');

describe('Experimental RDF emulation', () => {
  let app;
  let md;
  let xorname;
  let rdf;
  let me;
  let foaf;
  const TYPE_TAG = 15639;
  const JSON_LD_MIME_TYPE = 'application/ld+json';
  const TURTLE_MIME_TYPE = 'text/turtle';
  const myUri = 'safe://manu';
  const myJsonLd = {
    '@context': {
      name: 'http://schema.org/name',
      homepage: {
        '@id': 'http://schema.org/url',
        '@type': '@id'
      },
      image: {
        '@id': 'http://schema.org/image',
        '@type': '@id'
      }
    },
    '@id': myUri,
    name: 'Manu Sporny',
    homepage: 'http://manu.sporny.org/',
    image: 'http://manu.sporny.org/images/manu.png'
  };
  const rawJsonLd = {
    // FIXME: This is not the JSON that we actually have saved though...
    // (though we want this style...)
    // '@id': 'safe://nowOrWhenFetchedTest',
    'safe://nowOrWhenFetchedTest': JSON.stringify({ '@id': 'safe://_public/webId' }),
    'http://schema.org/image': JSON.stringify({ '@id': 'http://manu.sporny.org/images/manu.png' }),
    'http://schema.org/name': JSON.stringify({ '@value': 'Manu Sporny' }),
    'http://schema.org/url': JSON.stringify({ '@id': 'http://manu.sporny.org/' }),
    'http://xmlns.com/foaf/0.1/knows': JSON.stringify([{ '@value': 'Gabriel' }, { '@value': 'Josh' }])
  };

  beforeEach(async () => {
    app = await h.createAuthenticatedTestApp(null, null, null, { enableExperimentalApis: true });
    xorname = h.createRandomXorName();
    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
    rdf = md.emulateAs('rdf');
    me = rdf.sym(myUri);
    foaf = rdf.namespace('http://xmlns.com/foaf/0.1/');
  });

  it('fail if experimental apis flag is not set', async () => {
    let error;
    const safeApp = await h.createUnregisteredTestApp({ enableExperimentalApis: false });
    try {
      const name = h.createRandomXorName();
      const mdata = await safeApp.mutableData.newPublic(name, TYPE_TAG);
      await mdata.quickSetup({});
      mdata.emulateAs('rdf');
    } catch (err) {
      error = err;
    }
    return should(error.message).equal(errConst.EXPERIMENTAL_API_DISABLED.msg('RDF Emulation'));
  });

  it('create RDF emulation from MD', async () => {
    await md.quickSetup({});
    const rdf2 = md.emulateAs('rdf');
    return should(rdf2).not.be.undefined();
  });

  it('create RDF emulation from MD which already contains triples', async () => {
    await md.quickSetup(rawJsonLd);
    const md2 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const rdf2 = md2.emulateAs('rdf');
    await rdf2.nowOrWhenFetched();
    const jsonld = await rdf2.serialise(TURTLE_MIME_TYPE);
    should(jsonld.length).be.above(0);
  });

  it('fetch entries with RDF emulation from empty MD', async () => {
    await md.quickSetup();
    return should(rdf.nowOrWhenFetched()).be.fulfilled();
  });

  it.skip('fetch an specific graph with RDF emulation', async () => {
    await md.quickSetup(rawJsonLd);
    return should(rdf.nowOrWhenFetched(['http://schema.org/url'])).be.fulfilled();
  });

  it('fetch an non-existing graph with RDF emulation', async () => {
    await md.quickSetup(rawJsonLd);
    return should(rdf.nowOrWhenFetched(['non-existing-graph'])).be.rejected();
  });

  it('parse a Turtle document', async () => {
    await md.quickSetup({});
    const turtle = '<a> <b> <c> .';
    await rdf.parse(turtle, TURTLE_MIME_TYPE, myUri);
  });

  it('parse a JSON-LD document', async () => {
    await md.quickSetup({});
    return should(rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri)).be.fulfilled();
  });

  it('fail to parse a JSON-LD document', async () => {
    await md.quickSetup({});
    return should(rdf.parse({}, JSON_LD_MIME_TYPE, myUri)).be.rejected();
  });

  it('generate a blank node', async () => should(rdf.bnode).be.not.undefined());

  it('add triples and find any friend', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');

    const friend = rdf.any(me, foaf('knows'), undefined);
    should(friend.value).match('Josh');
  });

  it('add triples and find with each', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');

    const friends = rdf.each(me, foaf('knows'), undefined);

    should(friends.length).be.above(0);
  });

  it('add triples and match statements', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');

    const friends = rdf.statementsMatching(undefined, foaf('knows'), undefined);

    should(friends).have.length(2);
  });

  it('add literal and find with each', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    const XSD = rdf.namespace('http://www.w3.org/2001/XMLSchema#');
    const birthday = rdf.literal('1977-06-30T10:00:00+00:00', '', XSD('dateTime'));
    rdf.add(me, foaf('birthday'), birthday);

    const friends = rdf.each(me, foaf('birthday'), undefined);
    should(friends.length).be.above(0);
  });

  it('remove matching statements', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');

    rdf.removeMany(undefined, foaf('knows'), undefined);
    const friend = rdf.any(me, foaf('knows'), undefined);
    should(typeof friend).be.equal('undefined');
  });

  it('add triples and commit them', async () => {
    await md.quickSetup({ '@id': 'asas', bbbb: 'b2b2b2b' });
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');
    await rdf.commit();

    const md2 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const entries = await md2.getEntries();
    const entriesList = await entries.listEntries();

    entriesList.forEach((e) => {
      should(e.key.toString().length).be.above(0);
    });
  });

  it('add triples and commit them encrypted', async () => {
    await md.quickSetup({ '@id': 'asas' });
    const md2 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const rdf2 = md2.emulateAs('rdf');
    rdf2.setId(myUri);
    rdf2.add(me, foaf('knows'), 'Josh');
    rdf2.add(me, foaf('knows'), 'Gabriel');
    return should(rdf2.commit(true)).be.fulfilled();
  });

  it('fetch triples which are encrypted', async () => {
    const pubNamesApp = await h.publicNamesTestApp();
    const pubNameMd = await pubNamesApp.auth.getContainer('_publicNames');
    const pubNameRdf = pubNameMd.emulateAs('rdf');
    pubNameRdf.setId(myUri);
    pubNameRdf.add(me, foaf('knows'), 'Josh');
    pubNameRdf.add(me, foaf('knows'), 'Gabriel');
    const encrypted = true;
    await pubNameRdf.commit(encrypted);
    return should(pubNameRdf.nowOrWhenFetched(null, encrypted)).be.fulfilled();
  });

  // This maybe temporary and just to assure backward compatibility
  // with previous version of API where entries were not encrypted
  // that now are always being encrypted, like when
  // storing WebIDs in _public container
  it('fetch triples from _publicNames which were not encrypted', async () => {
    const pubNamesApp = await h.publicNamesTestApp();
    const pubNameMd = await pubNamesApp.auth.getContainer('_publicNames');
    const pubNameRdf = pubNameMd.emulateAs('rdf');
    pubNameRdf.setId(myUri);
    pubNameRdf.add(me, foaf('knows'), 'Josh');
    pubNameRdf.add(me, foaf('knows'), 'Gabriel');
    const encrypted = true;
    await pubNameRdf.commit(!encrypted);
    return should(pubNameRdf.nowOrWhenFetched(null, encrypted)).be.fulfilled();
  });

  it('add triples and append them', async () => {
    await md.quickSetup({ '@id': 'asas', bbbb: 'b2b2b2b' });
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');
    await rdf.commit();

    // now append
    const md2 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const rdf2 = md2.emulateAs('rdf');
    const me2 = rdf2.sym(`${myUri}/1`);
    rdf2.setId(`${myUri}/1`);
    rdf2.add(me2, foaf('knows'), 'Krishna');
    await rdf2.append();

    const md3 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const entries = await md3.getEntries();
    const entriesList = await entries.listEntries();

    entriesList.forEach((e) => {
      should(e.key.toString().length).be.above(0);
    });
  });

  it('commit after removing a graph', async () => {
    await md.quickSetup();
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    await rdf.commit();
    // now remove one of the committed graphs
    const SCHEMA = rdf.namespace('http://schema.org/');
    rdf.removeMany(rdf.sym(myUri), SCHEMA('name'), null);
    return should(rdf.commit()).be.fulfilled();
  });

  it('check deleted entry after a new commit removes a whole graph', async () => {
    await md.quickSetup();
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    await rdf.commit();
    let statements = rdf.statementsMatching(undefined, undefined, undefined);
    should(statements.length).be.above(0);

    // now remove the committed graphs
    rdf.removeMany(rdf.sym(myUri), null, null);
    await rdf.commit();
    should(rdf.nowOrWhenFetched()).be.rejected();
    statements = rdf.statementsMatching(me, undefined, undefined);
    return should(statements.length).be.equal(0);
  });

  it('parse JSON-LD RDF and serialise it as Turtle', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    rdf.add(me, foaf('knows'), 'Josh');
    rdf.add(me, foaf('knows'), 'Gabriel');

    const turtle = await rdf.serialise(TURTLE_MIME_TYPE);

    should(turtle.length).be.above(0);
    should(turtle).match(/Josh/);
    return should(turtle).match(/Gabriel/);
  });

  it('parse Turtle RDF and serialise it as JSON-LD', async () => {
    await md.quickSetup({});
     /* eslint-disable no-multi-str */
    const turtle = '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\
                    @prefix anything: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\
                    \
                    <> anything:type foaf:PersonalProfileDocument ;\
                      foaf:maker <#me> ;\
                      foaf:primaryTopic <#me> .\
                    <#me> a foaf:Person ;\
                      foaf:name "Bob" .';

    const turtle2 = '@prefix dcterms: <http://purl.org/dc/terms/> .\
                    @prefix ldp: <http://www.w3.org/ns/ldp#> .\
                    \
                    <http://example.org/alice/> a ldp:Container, ldp:BasicContainer;\
                      dcterms:title "Alice’s data storage on the Web" ;\
                      ldp:contains <http://example.org/alice/foaf> . ';
    /* eslint-enable no-multi-str */

    await rdf.parse(turtle, TURTLE_MIME_TYPE, myUri);
    await rdf.parse(turtle2, TURTLE_MIME_TYPE, myUri);

    const jsonld = await rdf.serialise(JSON_LD_MIME_TYPE);

    should(jsonld.length).be.above(0);
    should(jsonld).match(/xmlns.com/);
    should(jsonld).match(/w3.org/);
    return should(jsonld).match(/purl.org/);
  });

  it('fail to fetch RDF data due to missing graph ID', async () => {
    await md.quickSetup({ key: 'value' });
    return should(rdf.nowOrWhenFetched()).be.rejectedWith(errConst.MISSING_RDF_ID.msg);
  });

  it('fail to serialise with empty RDF', async () => {
    await md.quickSetup({});
    return should(rdf.serialise(JSON_LD_MIME_TYPE)).be.rejectedWith('Cannot read property \'uri\' of null');
  });

  it('fail to serialise with invalid mimeType', async () => {
    await md.quickSetup({});
    await rdf.parse(JSON.stringify(myJsonLd), JSON_LD_MIME_TYPE, myUri);
    return should(rdf.serialise('invalid-mime-type')).be.rejectedWith('Serialize: Content-type invalid-mime-type not supported for data write.');
  });

  it('fail to read RDF from private MD with wrong decryption key', async () => {
    const privMd = await app.mutableData.newRandomPrivate(TYPE_TAG);
    await privMd.quickSetup();
    const nameAndTag = await privMd.getNameAndTag();
    const privRdf = privMd.emulateAs('rdf');
    privRdf.setId(myUri);
    privRdf.add(me, foaf('knows'), 'Josh');
    privRdf.add(me, foaf('knows'), 'Gabriel');
    const encrypted = true;
    await privRdf.commit(encrypted);
    const notMyMd = await app.mutableData.newPrivate(nameAndTag.name,
                                                nameAndTag.typeTag,
                                                h.createRandomSecKey(),
                                                h.createRandomNonce());
    const notMyRdf = notMyMd.emulateAs('rdf');
    return should(notMyRdf.nowOrWhenFetched(null, encrypted)).be.rejectedWith('Core error: Symmetric decryption failed');
  });
});
