import { z } from 'zod';

export const contactSchema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email(),
  subject: z.string().max(200),
  message: z.string().min(20).max(1500),
});

export const projectSchema = z.object({
  id:            z.string().min(1).max(100),
  title:         z.string().min(1).max(255),
  subtitle:      z.string().max(500).optional(),
  category:      z.string().max(100).optional(),
  year:          z.string().optional(),
  role:          z.string().max(255).optional(),
  duration:      z.string().max(100).optional(),
  platform:      z.string().max(255).optional(),
  client:        z.string().max(255).optional(),
  cover_type:    z.string().max(50).optional(),
  cover_image:   z.string().optional(),
  context:       z.string().optional(),
  problematique: z.string().optional(),
  objectifs:     z.array(z.string()).optional(),
  process_steps: z.array(z.any()).optional(),
  metrics:       z.array(z.any()).optional(),
  tools:         z.array(z.string()).optional(),
  plus_values:   z.array(z.string()).optional(),
  featured:      z.boolean().optional(),
  confidential:  z.boolean().optional(),
  display_order: z.number().optional(),
  tags:          z.array(z.string()).optional(),
  images:        z.array(z.string()).optional(),
});

export const tagSchema = z.object({
  id:    z.string().min(1).max(100),
  name:  z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const testimonialSchema = z.object({
  id:            z.string().min(1).max(100),
  name:          z.string().min(1).max(255),
  initials:      z.string().max(3).optional(),
  role:          z.string().max(255).optional(),
  company:       z.string().max(255).optional(),
  company_logo:  z.string().optional(),
  content:       z.string().min(10),
  display_order: z.number().optional(),
  rating:        z.number().min(1).max(5).optional(),
});
