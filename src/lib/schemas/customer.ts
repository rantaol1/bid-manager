import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  industry: z.string().max(100).trim().optional().or(z.literal('')),
  country: z.string().max(100).trim().optional().or(z.literal('')),
  contactName: z.string().max(200).trim().optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email').max(200).optional().or(z.literal('')),
  contactPhone: z.string().max(50).trim().optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
