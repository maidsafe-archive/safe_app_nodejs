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
const h = require('./helpers');

describe.only('RDF emulation', () => {
  let app,
    md,
    xorname;
  const TYPE_TAG = 15639;
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

  beforeEach(async () => {
    app = await h.createAuthenticatedTestApp();
    xorname = h.createRandomXorName();
    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
  });

  it('create RDF emulation from MD', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    return should(rdf).not.be.undefined();
  });

  it('create RDF emulation from MD which already contains triples', async () => {
    const rawJsonLd = {
      // FIXME: This is not the JSON that we actually have saved though...
      // (though we want this style...)
      // '@id': 'safe://nowOrWhenFetchedTest',
      'safe://nowOrWhenFetchedTest':JSON.stringify( {"@id":"safe://_public/webId"} ),
      'http://schema.org/image': JSON.stringify([{ '@id': 'http://manu.sporny.org/images/manu.png' }]),
      'http://schema.org/name': JSON.stringify([{ '@value': 'Manu Sporny' }]),
      'http://schema.org/url': JSON.stringify([{ '@id': 'http://manu.sporny.org/' }]),
      'http://xmlns.com/foaf/0.1/knows': JSON.stringify([{ '@value': 'Gabriel' }, { '@value': 'Josh' }])
    };
    await md.quickSetup(rawJsonLd);

    md = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const rdf = await md.emulateAs('rdf');
    await rdf.nowOrWhenFetched();
    const jsonld = await rdf.serialise('application/ld+json');
    console.log('JSON-LD:', jsonld);
  });

  it('fetch entries with RDF emulation from empty MD', async () => {
    await md.quickSetup();
    const rdf = await md.emulateAs('rdf');
    await rdf.nowOrWhenFetched();
  });

  it('parse a Turtle document', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    const turtle = '<a> <b> <c> .';
    await rdf.parse(turtle, 'text/turtle', myUri);
  });

  it('parse a JSON-LD document', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
  });

  it('add triples and find any friend', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    const friend = rdf.any(me, FOAF('knows'), undefined);
    console.log(friend);
  });

  it('add triples and find with each', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    const friends = rdf.each(me, FOAF('knows'), undefined);
    for (let i = 0; i < friends.length; i++) {
      friend = friends[i];
      console.log(friend);
    }
  });

  it('add triples and match statements', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    const friends = rdf.statementsMatching(undefined, FOAF('knows'), undefined);
    for (let i = 0; i < friends.length; i++) {
      friend = friends[i];
      console.log(friend);
    }
  });

  it('add literal and find with each', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const XSD = rdf.namespace('http://www.w3.org/2001/XMLSchema#');
    const me = rdf.sym(myUri);
    const birthday = rdf.literal('1977-06-30T10:00:00+00:00', '', XSD('dateTime'));
    rdf.add(me, FOAF('birthday'), birthday);

    const friends = rdf.each(me, FOAF('birthday'), undefined);
    for (let i = 0; i < friends.length; i++) {
      friend = friends[i];
      console.log(friend);
    }
  });

  it('remove matching statements', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    rdf.removeMany(undefined, FOAF('knows'), undefined);
    const friend = rdf.any(me, FOAF('knows'), undefined);
    console.log(friend);
  });

  it('add triples and commit them', async () => {
    await md.quickSetup({ '@id': 'asas', bbbb: 'b2b2b2b' });
    const rdf = await md.emulateAs('rdf');
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);

    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    await rdf.commit();

    const md2 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const entries = await md2.getEntries();
    const entriesList = await entries.listEntries();

    entriesList.forEach((e) => console.log('ENTRY:', e.key.toString(), e.value.buf.toString(), e.value.version));
  });

  it('add triples and append them', async () => {
    await md.quickSetup({ '@id': 'asas', bbbb: 'b2b2b2b' });
    const rdf = await md.emulateAs('rdf');
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);

    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    await rdf.commit();

    // now append
    const md2 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    const rdf2 = await md2.emulateAs('rdf');
    const me2 = rdf.sym(`${myUri}/1`);

    rdf2.setId(`${myUri}/1`);
    rdf2.add(me2, FOAF('knows'), 'Krishna');

    await rdf2.append();

    const md3 = await app.mutableData.newPublic(xorname, TYPE_TAG);
    entries = await md3.getEntries();
    entriesList = await entries.listEntries();

    entriesList.forEach((e) => console.log('AFTER APPENDED ENTRIES:', e.key.toString(), e.value.buf.toString(), e.value.version));
  });

  it('parse JSON-LD RDF and serialise it as Turtle', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
    const FOAF = rdf.namespace('http://xmlns.com/foaf/0.1/');
    const me = rdf.sym(myUri);

    await rdf.parse(JSON.stringify(myJsonLd), 'application/ld+json', myUri);
    rdf.add(me, FOAF('knows'), 'Josh');
    rdf.add(me, FOAF('knows'), 'Gabriel');

    const turtle = await rdf.serialise('text/turtle');
    console.log('Turtle:', turtle);
  });

  it('parse Turtle RDF and serialise it as JSON-LD', async () => {
    await md.quickSetup({});
    const rdf = await md.emulateAs('rdf');
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


    await rdf.parse(turtle2, 'text/turtle', myUri);

    const jsonld = await rdf.serialise('application/ld+json');
    console.log('JSON-LD:', jsonld);
  });
});
