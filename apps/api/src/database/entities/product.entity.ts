import type { ProductTag } from '@elo/core';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface OptionChoice {
  label: string;
  priceCents: number;
}
/** Estrutura de opções definida pelo restaurante: tamanhos, adicionais, etc. */
export interface OptionGroup {
  name: string;
  required: boolean;
  multiple: boolean;
  choices: OptionChoice[];
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) restaurantId: string;
  @Column({ type: 'uuid' }) categoryId: string;
  @Column() name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'int' }) priceCents: number;
  @Column({ type: 'text', nullable: true }) imageUrl: string | null;
  @Column({ default: true }) available: boolean;
  /** Aparece na seção "Destaques" do cardápio. */
  @Column({ default: false }) featured: boolean;
  @Column({ type: 'text', array: true, default: '{}' }) tags: ProductTag[];
  /** Ordem dentro da categoria (menor primeiro). */
  @Column({ type: 'int', default: 0 }) position: number;
  @Column({ type: 'jsonb', default: () => "'[]'" }) options: OptionGroup[];
}
