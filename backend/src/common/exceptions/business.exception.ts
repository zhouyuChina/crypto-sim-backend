import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    public readonly statusCode: HttpStatus | number,
    public readonly code: string,
    message: string | string[]
  ) {
    super(
      {
        statusCode,
        code,
        message
      },
      statusCode
    );
  }
}
