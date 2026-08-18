import fs from 'fs';
import path from 'path';

const stylesPath = path.resolve(__dirname, '../../apps/desktop/renderer/src/styles.css');

describe('terminal light mode styles', () => {
  const css = fs.readFileSync(stylesPath, 'utf8');

  it('covers all intro page cards that use terminal dark backgrounds', () => {
    expect(css).toContain(":root[data-theme='terminal-light'] .intro-problem-grid article");
    expect(css).toContain(":root[data-theme='terminal-light'] .intro-module-list article");
    expect(css).toContain(":root[data-theme='terminal-light'] .intro-flow li");
    expect(css).toContain(":root[data-theme='terminal-light'] .intro-status-list");
  });

  it('covers workspace chrome elements that use terminal dark backgrounds', () => {
    expect(css).toContain(":root[data-theme='terminal-light'] .activity-panel");
    expect(css).toContain(":root[data-theme='terminal-light'] .activity-icon-button");
    expect(css).toContain(":root[data-theme='terminal-light'] .workspace-splitter");
    expect(css).toContain(":root[data-theme='terminal-light'] .activity-log-pane.is-collapsed .activity-log-header");
    expect(css).toContain(":root[data-theme='terminal-light'] .activity-terminal-output");
  });

  it('covers main workspace cards and list blocks that use terminal dark backgrounds', () => {
    expect(css).toContain(":root[data-theme='terminal-light'] .workspace-shell h2 + div > div");
    expect(css).toContain(":root[data-theme='terminal-light'] .workspace-shell ul");
    expect(css).toContain(":root[data-theme='terminal-light'] .asset-category-card-top span");
    expect(css).toContain(":root[data-theme='terminal-light'] .setup-choice-card code");
  });
});
