import type { FieldError } from '@elo/core/fields/field-rules';
import { formatBRL } from '@elo/core/money/cents';

const brDay = (iso?: string) =>
    iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';

const amount = (n: number | undefined, money?: boolean) =>
    n === undefined ? '' : money ? formatBRL(n) : n.toLocaleString('pt-BR');

/** The sentence shown under the field. */
export function fieldMessage(error: FieldError): string {
    const p = error.params ?? {};
    switch (error.code) {
        case 'required':
            return 'Preencha este campo.';
        case 'too_short':
            return `Use pelo menos ${p.min} ${p.min === 1 ? 'caractere' : 'caracteres'}.`;
        case 'too_long':
            return `Use no máximo ${p.max} caracteres.`;
        case 'invalid_name':
            return 'Use só letras, espaços, apóstrofo, ponto ou hífen, começando por uma letra.';
        case 'invalid_username':
            return 'Use só letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.';
        case 'invalid_slug':
            return 'Use só letras minúsculas e números, com hífen entre as palavras.';
        case 'invalid_phone':
            return 'Informe um telefone com DDD, como (11) 91234-5678.';
        case 'invalid_email':
            return 'Informe um e-mail válido, como nome@exemplo.com.';
        case 'invalid_contact':
            return 'Informe um telefone com DDD ou um e-mail válido.';
        case 'invalid_instagram':
            return 'Informe o usuário do Instagram, como @restaurante.';
        case 'invalid_url':
            return 'Use um endereço de imagem que comece com https://.';
        case 'invalid_google_url':
            return 'Cole o link do Google Maps ou do Google Meu Negócio, começando com https://.';
        case 'invalid_money':
            return 'Informe um valor como 39,90.';
        case 'not_integer':
            return 'Informe um número inteiro.';
        case 'too_small':
            return `O mínimo é ${amount(p.min, p.money)}.`;
        case 'too_large':
            return `O máximo é ${amount(p.max, p.money)}.`;
        case 'not_zero':
            return 'O valor não pode ser zero.';
        case 'invalid_option':
            return 'Escolha uma das opções da lista.';
        case 'invalid_date':
            return 'Informe uma data válida, no formato dd/mm/aaaa.';
        case 'too_early':
            return `Use uma data a partir de ${brDay(p.date)}.`;
        case 'too_late':
            return `Use uma data até ${brDay(p.date)}.`;
        case 'too_few':
            return p.min === 1
                ? 'Inclua pelo menos um item.'
                : `Inclua pelo menos ${p.min} itens.`;
        case 'too_many':
            return `Inclua no máximo ${p.max} itens.`;
        case 'unknown_field':
            return 'Este campo não é aceito aqui.';
        case 'invalid_type':
            return 'Valor em formato inválido.';
        default:
            return 'Valor inválido.';
    }
}
