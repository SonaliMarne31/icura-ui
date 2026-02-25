import { z } from "zod";

export const loginSchema = z.object({
    email: z.string()
        .min(1, 'Email is required')
        .email('Enter a valid email address'),

    password: z.string()
        .min(1, 'Password is required')
        .min(8, 'Password must be at least 8 characters'),

    clinicCode: z.string()
        .min(1, 'Clinic code is required')
        .regex(/^[C]-\d{3}$/, 'Format must be XXX-00X e.g. C-000'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;