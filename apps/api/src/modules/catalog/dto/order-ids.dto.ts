import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { CATALOG_LIMITS } from '../catalog.constants.js';

/** Nova ordem de itens: lista completa de ids, na ordem desejada. */
export class OrderIdsDTO {
    @IsArray()
    @ArrayMaxSize(CATALOG_LIMITS.idsPerReorder)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    public ids: string[];
}
