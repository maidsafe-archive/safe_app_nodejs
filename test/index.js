const lib = require('../src/native/lib');
const should = require('should');
const fromAuthURI = require('../src').fromAuthURI;

describe('Smoke testing', () => {
  it('confirms there is a lib', () => {
    should(lib).be.Object();
  });
});

describe('External API', () => {
  describe('fromAuthURI', () => {
    it('should authenticate', () => {
      const uri = "safe-bmV0Lm1haWRzYWZlLnRlc3Qud2ViYXBwLmlk:AAAAAWkT26UAAAAAAAAAAAAAAAAAAAAgn__HmmtNgunV-kW2ByRQrVKDUZ5-sBpzD8d9smI7-GMAAAAAAAAAINgqZuU2la2DuDqevJoiiTmN17-M04RhJ-PgZtLjrg_4AAAAAAAAACD2lsisP4_w--osgnNVGQCOWfeGmVSRSRUjIWpkSiJ_0QAAAAAAAABAW4yv1zLKQHcer-gVYalU-ttwY2R0Aiwre4WL2gk7IrT2lsisP4_w--osgnNVGQCOWfeGmVSRSRUjIWpkSiJ_0QAAAAAAAAAgReTGI9CwlBjEMiWMMlcnXXbKDBAwqEfOGc3435i0EW8AAAAAAAAAICmIQ65WjpvyC6VU9vivHuQWAUt7JKPWgNxsNd56QxtQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIHnsE8npD4vtW56vdNPU0jMBOFK1KDfGQ6up2HyPmznkAAAAAAAAOpgAAAAAAAAAGJpOhm2rJOogJzNCh-4ewdrA9apdeFk2xA";
      const appInfo = {
        id: 'net.maidsafe.example.tests',
        name: 'Example Test',
        vendor: 'MaidSafe Ltd.'
      };

      return fromAuthURI(appInfo, uri);
    });
  });
});
