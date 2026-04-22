import React from 'react';
import { render } from 'ink';
import PlanifyCliApp from '@/cli/components/PlanifyCliApp';

const args = new Set(process.argv.slice(2));

render(
  React.createElement(PlanifyCliApp, {
    smokeTest: args.has('--smoke-test'),
  }),
);
