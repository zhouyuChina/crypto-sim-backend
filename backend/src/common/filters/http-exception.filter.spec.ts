import { BadRequestException, Logger } from '@nestjs/common';

import { BusinessException } from '../exceptions/business.exception';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const createHost = () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => ({ status, json }),
          getRequest: () => ({
            method: 'POST',
            url: '/api/deposit-withdraw/deposit'
          })
        })
      } as any,
      status,
      json
    };
  };

  it('includes business error codes in error responses', () => {
    const filter = new HttpExceptionFilter(new Logger('test'));
    const { host, status, json } = createHost();

    filter.catch(
      new BusinessException(409, 'DUPLICATE_TX_HASH', '充值交易哈希已存在'),
      host
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: 'DUPLICATE_TX_HASH',
        message: '充值交易哈希已存在',
        path: '/api/deposit-withdraw/deposit'
      })
    );
  });

  it('maps validation payloads to VALIDATION_ERROR', () => {
    const filter = new HttpExceptionFilter(new Logger('test'));
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException({
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request'
      }),
      host
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: ['email must be an email']
      })
    );
  });
});
