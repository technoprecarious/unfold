/**
 * Input validation API route
 * 
 * POST /api/validate
 * Server-side validation endpoint for sensitive operations
 * 
 * Body: { type: 'program' | 'project' | 'task' | 'subtask', data: {...} }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateTitle,
  validateDescription,
  validateNotes,
  isValidPriority,
  isValidStatusPrimary,
  isValidStatusSecondary,
  validateStringArray,
  isValidISODate,
  MAX_LENGTHS,
} from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    // Validate title (required for all types)
    if (!validateTitle(data.title)) {
      errors.push('Title is required and must be 200 characters or less');
    }

    // Validate description (optional)
    if (data.description && !validateDescription(data.description)) {
      errors.push('Description must be 5000 characters or less');
    }

    // Validate notes (optional)
    if (data.notes && !validateNotes(data.notes)) {
      errors.push('Notes must be 10000 characters or less');
    }

    // Validate priority (optional)
    if (data.priority && !isValidPriority(data.priority)) {
      errors.push('Invalid priority value');
    }

    // Validate status based on type
    if (data.status) {
      if (type === 'subtask') {
        if (!isValidStatusSecondary(data.status)) {
          errors.push('Invalid status for subtask');
        }
      } else {
        if (!isValidStatusPrimary(data.status)) {
          errors.push('Invalid status value');
        }
      }
    }

    // Validate arrays
    if (data.tags && !validateStringArray(data.tags, MAX_LENGTHS.MAX_TAGS)) {
      errors.push(`Tags must be an array with at most ${MAX_LENGTHS.MAX_TAGS} items`);
    }

    if (data.resources && !validateStringArray(data.resources, MAX_LENGTHS.MAX_RESOURCES)) {
      errors.push(`Resources must be an array with at most ${MAX_LENGTHS.MAX_RESOURCES} items`);
    }

    if (data.dependencies && !validateStringArray(data.dependencies, MAX_LENGTHS.MAX_DEPENDENCIES)) {
      errors.push(`Dependencies must be an array with at most ${MAX_LENGTHS.MAX_DEPENDENCIES} items`);
    }

    // Validate dates
    if (data.timeframe) {
      if (data.timeframe.start && !isValidISODate(data.timeframe.start)) {
        errors.push('Invalid start date format');
      }
      if (data.timeframe.deadline && !isValidISODate(data.timeframe.deadline)) {
        errors.push('Invalid deadline date format');
      }
      if (data.timeframe.targetEnd && !isValidISODate(data.timeframe.targetEnd)) {
        errors.push('Invalid target end date format');
      }
      if (data.timeframe.actualEnd && !isValidISODate(data.timeframe.actualEnd)) {
        errors.push('Invalid actual end date format');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { valid: false, errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { valid: true },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

