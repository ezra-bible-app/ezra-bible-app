require('../module_checkbox');

describe('<module_checkbox>', () => {

  it('renders without errors', () => {
    document.body.innerHTML = '<module-checkbox>Test</module-checkbox>';
    expect(document.body.innerHTML).toEqual('<module-checkbox></module-checkbox>');
  });

  it('has a shadow DOM', () =>{
    const el = document.createElement('module-checkbox');
    document.body.appendChild(el);
    expect(el.shadowRoot).toBeDefined();
  });

  it('renders correctly', () => {
    document.body.innerHTML = '<module-checkbox count="5" checked>Test</module-checkbox>';
    const el = document.querySelector('module-checkbox');
    
    expect(el.shadowRoot.textContent).toContain('Test (5)');

    expect(el.shadowRoot.querySelector('input[type="checkbox"]').hasAttribute('checked')).toEqual(true);
  });

});
