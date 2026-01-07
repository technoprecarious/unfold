/**
 * Health check API route
 * 
 * GET /api/health
 * Returns server status and environment information
 */

import { NextResponse } from 'next/server';
import { validateFirebaseEnv } from '@/lib/utils/env';

export async function GET() {
  try {
    const firebaseConfigured = validateFirebaseEnv();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      firebase: {
        configured: firebaseConfigured,
      },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
    }, { status: 500 });
  }
}

