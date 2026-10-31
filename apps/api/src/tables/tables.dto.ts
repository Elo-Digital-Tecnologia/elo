import { FIELD_RULES } from '@elo/core';
import { Field } from '../common/validation';

export class CreateTableDto {
  @Field(FIELD_RULES.tableName) name: string;
}
