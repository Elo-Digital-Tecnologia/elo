import type { DocumentKind } from '../document.service.js';
import { IsIn } from 'class-validator';

export class UploadDocumentDTO {
    @IsIn(['receipt', 'contract'])
    public kind: DocumentKind;
}
