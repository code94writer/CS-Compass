import { Response } from 'express';
import logger from '../config/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  status: number;
}

export class ResponseHelper {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response<ApiResponse<T>> {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      status: statusCode,
    };

    logger.info('API Success Response', { 
      statusCode, 
      message, 
      dataType: typeof data 
    });

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    error?: any
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      status: statusCode,
    };

    if (error) {
      response.data = { error: error.message || error };
    }

    logger.error('API Error Response', { 
      statusCode, 
      message, 
      error: error?.message || error 
    });

    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    message: string = 'Validation failed',
    details: any[] = []
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      data: { details },
      timestamp: new Date().toISOString(),
      status: 400,
    };

    logger.warn('API Validation Error', { message, details });

    return res.status(400).json(response);
  }

  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      status: 404,
    };

    logger.warn('API Not Found', { message });

    return res.status(404).json(response);
  }

  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      status: 401,
    };

    logger.warn('API Unauthorized', { message });

    return res.status(401).json(response);
  }

  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response<ApiResponse> {
    const response: ApiResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
      status: 403,
    };

    logger.warn('API Forbidden', { message });

    return res.status(403).json(response);
  }
}
