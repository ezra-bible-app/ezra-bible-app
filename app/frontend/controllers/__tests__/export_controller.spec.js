const exportController = require('../export_controller.js');


describe('ExportController', () => {
  it('exports docx for notes', async () => {
    const docx = exportController.saveWordDocument();
    expect(docx).toMatchSnapshot();
  });
});
