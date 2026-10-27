import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const snake = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/__+/g, '_')
    .toLowerCase();

/** Convenção do banco: tabelas e colunas em snake_case. */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName?: string): string {
    return customName ?? snake(className);
  }
  columnName(propertyName: string, customName: string | undefined, prefixes: string[]): string {
    return snake([...prefixes, customName ?? propertyName].join('_'));
  }
  relationName(propertyName: string): string {
    return snake(propertyName);
  }
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snake(`${relationName}_${referencedColumnName}`);
  }
}
