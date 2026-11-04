import type { NamingStrategyInterface } from 'typeorm';
import { DefaultNamingStrategy } from 'typeorm';

const snake = (s: string) =>
    s
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/__+/g, '_')
        .toLowerCase();

/** Database convention: tables and columns in snake_case. */
export class SnakeNamingStrategy
    extends DefaultNamingStrategy
    implements NamingStrategyInterface
{
    public override tableName(className: string, customName?: string): string {
        return customName ?? snake(className);
    }
    public override columnName(
        propertyName: string,
        customName: string | undefined,
        prefixes: string[]
    ): string {
        return snake([...prefixes, customName ?? propertyName].join('_'));
    }
    public override relationName(propertyName: string): string {
        return snake(propertyName);
    }
    public override joinColumnName(
        relationName: string,
        referencedColumnName: string
    ): string {
        return snake(`${relationName}_${referencedColumnName}`);
    }
}
