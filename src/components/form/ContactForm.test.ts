import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import ContactForm from './ContactForm.astro';
import FormField from './FormField.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('FormField', () => {
  it('labels an input and passes validation attributes through', async () => {
    const html = await container.renderToString(FormField, {
      props: { name: 'email', label: 'Email', type: 'email', required: true, error: 'Bad email' },
    });
    expect(html).toMatch(/<label for="field-email"[^>]*>Email<\/label>/);
    expect(html).toMatch(/<input id="field-email" name="email" type="email"[^>]*required/);
    expect(html).toContain('Bad email');
  });

  it('renders a textarea when asked', async () => {
    const html = await container.renderToString(FormField, {
      props: { name: 'message', label: 'Message', type: 'textarea', error: 'Too short' },
    });
    expect(html).toMatch(/<textarea id="field-message" name="message"/);
    expect(html).not.toContain('<input');
  });

  it('reserves the error line, showing it only when the field is user-invalid', async () => {
    const html = await container.renderToString(FormField, { props: { name: 'name', label: 'Name', error: 'Required' } });
    expect(html).toMatch(/<p class="invisible [^"]*peer-user-invalid:visible[^"]*">Required<\/p>/);
  });
});

describe('ContactForm', () => {
  it('has required name, email and message fields and a submit button', async () => {
    const html = await container.renderToString(ContactForm);
    expect(html).toMatch(/<input [^>]*name="name"[^>]*required/);
    expect(html).toMatch(/<input [^>]*name="email" type="email"[^>]*required/);
    expect(html).toMatch(/<textarea [^>]*name="message"[^>]*required/);
    expect(html).toContain('type="submit"');
  });

  it('shows a form error below the fields', async () => {
    const html = await container.renderToString(ContactForm, { props: { error: 'Something went wrong' } });
    expect(html).toMatch(/<p role="alert"[^>]*>Something went wrong<\/p>/);
    expect(html.indexOf('Something went wrong')).toBeGreaterThan(html.indexOf('name="message"'));
  });
});
