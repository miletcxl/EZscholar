import { describe, expect, it } from 'vitest';
import { AGENT_TOOLS } from './tools';

function hasTool(name: string) {
  return AGENT_TOOLS.some((tool) => tool.function.name === name);
}

describe('AGENT_TOOLS', () => {
  it('contains docs maker tools', () => {
    expect(hasTool('parse_word_draft')).toBe(true);
    expect(hasTool('render_academic_report')).toBe(true);
    expect(hasTool('generate_presentation_slides')).toBe(true);
  });
});
