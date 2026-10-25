// Validation Schemas — Elo Digital
// Zod schemas for all entities

import { z } from 'zod';

// ============================================
// Base Validators
// ============================================

export const uuidSchema = z.string().uuid({ message: 'ID inválido' });

export const slugSchema = z.string()
  .min(2, 'Slug deve ter pelo menos 2 caracteres')
  .max(64, 'Slug deve ter no máximo 64 caracteres')
  .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens');

export const emailSchema = z.string().email('Email inválido');

export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido (formato E.164)');

export const cpfSchema = z.string()
  .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
  .refine(val => validateCPF(val), 'CPF inválido');

export const cnpjSchema = z.string()
  .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos')
  .refine(val => validateCNPJ(val), 'CNPJ inválido');

export const passwordSchema = z.string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial');

export const priceSchema = z.number().int().min(0, 'Preço não pode ser negativo').max(99999999, 'Preço muito alto');

export const percentageSchema = z.number().min(0).max(100);

// CPF validation
function validateCPF(cpf: string): boolean {
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(cpf[10]);
}

// CNPJ validation
function validateCNPJ(cnpj: string): boolean {
  if (/^(\d)\1+$/.test(cnpj)) return false;
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  let digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  length += 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().optional()
});

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Novas senhas não coincidem',
  path: ['confirmNewPassword']
});

// ============================================
// Restaurant Schemas
// ============================================

export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  slug: slugSchema,
  ownerName: z.string().min(2, 'Nome do responsável deve ter pelo menos 2 caracteres').max(100),
  ownerContact: z.union([phoneSchema, emailSchema]),
  address: z.string().max(200).optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional()
});

export const updateRestaurantSchema = createRestaurantSchema.partial().omit({ slug: true });

export const restaurantSettingsSchema = z.object({
  serviceChargePercentage: percentageSchema.default(10),
  serviceChargeEnabled: z.boolean().default(true),
  currency: z.literal('BRL').default('BRL'),
  timezone: z.string().default('America/Sao_Paulo'),
  language: z.literal('pt-BR').default('pt-BR'),
  orderAutoConfirm: z.boolean().default(false),
  maxOrderItems: z.number().int().min(1).max(100).default(50)
});

// ============================================
// User Schemas
// ============================================

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  password: passwordSchema,
  role: z.enum(['superadmin', 'admin_elo', 'admin_restaurant', 'waiter', 'kitchen', 'cashier']),
  restaurantId: uuidSchema.optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: emailSchema.optional(),
  role: z.enum(['superadmin', 'admin_elo', 'admin_restaurant', 'waiter', 'kitchen', 'cashier']).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().url().optional()
});

// ============================================
// Menu Schemas
// ============================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  description: z.string().max(200).optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  price: priceSchema,
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  preparationTimeMinutes: z.number().int().min(0).max(120).optional()
});

export const updateProductSchema = createProductSchema.partial();

export const productOptionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  type: z.enum(['single', 'multiple', 'boolean']),
  required: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0)
});

export const productOptionChoiceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  price: priceSchema.default(0),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0)
});

// ============================================
// Table Schemas
// ============================================

export const createTableSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  number: z.string().max(20).optional(),
  capacity: z.number().int().min(1).max(50).default(4)
});

export const updateTableSchema = createTableSchema.partial();

export const tableTokenSchema = z.object({
  tableId: uuidSchema
});

// ============================================
// Order Schemas
// ============================================

export const orderItemSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1').max(99),
  notes: z.string().max(500).optional(),
  selectedOptions: z.array(z.object({
    optionId: uuidSchema,
    choiceId: uuidSchema
  })).default([])
});

export const createOrderSchema = z.object({
  tableToken: z.string().min(1, 'Token da mesa é obrigatório'),
  items: z.array(orderItemSchema).min(1, 'Pelo menos um item é obrigatório'),
  notes: z.string().max(1000).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['sent', 'received', 'preparing', 'ready', 'delivered', 'cancelled']),
  reason: z.string().max(500).optional()
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Motivo é obrigatório').max(500)
});

// ============================================
// Kitchen Schemas
// ============================================

export const updateKitchenStatusSchema = z.object({
  status: z.enum(['received', 'preparing', 'ready']),
  itemStatuses: z.array(z.object({
    itemId: uuidSchema,
    status: z.enum(['pending', 'preparing', 'ready'])
  })).optional()
});

// ============================================
// Waiter Schemas
// ============================================

export const callWaiterSchema = z.object({
  tableToken: z.string().min(1, 'Token da mesa é obrigatório'),
  message: z.string().max(200).optional()
});

export const respondCallSchema = z.object({
  callId: uuidSchema,
  action: z.enum(['respond', 'cancel'])
});

// ============================================
// Billing Schemas
// ============================================

export const splitBillSchema = z.object({
  type: z.enum(['none', 'equal', 'by-item']),
  count: z.number().int().min(1).max(20).default(1)
});

export const applyServiceChargeSchema = z.object({
  enabled: z.boolean(),
  percentage: percentageSchema.optional()
});

export const applyDiscountSchema = z.object({
  amount: priceSchema,
  reason: z.string().min(1, 'Motivo é obrigatório').max(200)
});

// ============================================
// Subscription Schemas
// ============================================

export const createSubscriptionSchema = z.object({
  restaurantId: uuidSchema,
  planId: uuidSchema,
  trialDays: z.number().int().min(0).max(90).optional()
});

export const recordPaymentSchema = z.object({
  subscriptionId: uuidSchema,
  amount: priceSchema,
  method: z.enum(['cash', 'pix', 'bank_transfer', 'card', 'other']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional()
});

// ============================================
// Pagination/Query Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// ============================================
// Type Exports
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type CreateUserInputSchema = z.infer<typeof createUserSchema>;
export type UpdateUserInputSchema = z.infer<typeof updateUserSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type SplitBillInput = z.infer<typeof splitBillSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;