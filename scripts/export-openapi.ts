/**
 * Writes the OpenAPI schema to openapi.json in the project root.
 * Run with:  npm run openapi
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { swaggerSpec } from '../src/config/swagger';

const file = join(__dirname, '..', 'openapi.json');
writeFileSync(file, JSON.stringify(swaggerSpec, null, 2));
console.log(`OpenAPI schema written to ${file}`);
