import { NextRequest } from 'next/server';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100; // Max requests per window

export function rateLimit(request: NextRequest, identifier: string): { success: boolean; message?: string } {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}:${identifier}`;
  const now = Date.now();
  
  // Cleanup expired entries
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { success: true };
  }
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return { success: true };
  }
  
  if (record.count >= MAX_REQUESTS) {
    return { 
      success: false, 
      message: 'Rate limit exceeded. Please try again later.' 
    };
  }
  
  record.count++;
  return { success: true };
}