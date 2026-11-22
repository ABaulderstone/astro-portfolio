import { markdownToHtml } from 'satteri';
import { describe, expect, it } from 'vitest';
import { taskListLabels } from './task-list-labels';

const render = async (markdown: string) => (await markdownToHtml(markdown, { hastPlugins: [taskListLabels] })).html;

describe('taskListLabels', () => {
  it("names each checkbox after its item's text, inline code included", async () => {
    const html = await render('- [ ] Set `ddl-auto=validate`\n- [x] Done');
    expect(html).toContain('aria-label="Set ddl-auto=validate"');
    expect(html).toContain('aria-label="Done"');
  });

  it('leaves out nested items, which get their own label', async () => {
    const html = await render('- [ ] Parent\n  - [ ] Child');
    expect(html).toContain('aria-label="Parent"');
    expect(html).toContain('aria-label="Child"');
  });

  it('finds the checkbox in a loose list', async () => {
    const html = await render('- [ ] One\n\n- [ ] Two');
    expect(html).toContain('aria-label="One"');
    expect(html).toContain('aria-label="Two"');
  });

  it('leaves ordinary lists alone', async () => {
    expect(await render('- One\n- Two')).not.toContain('aria-label');
  });
});
